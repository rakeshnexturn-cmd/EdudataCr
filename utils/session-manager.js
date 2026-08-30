const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const { URL } = require('url');
require('dotenv').config();

const SESSION_CACHE_DIR = path.join(__dirname, '..', 'tests', '.auth');
const ADMIN_SESSION_FILE = path.join(SESSION_CACHE_DIR, 'admin_session.json');
const PRIVATE_KEY_PATH = path.join(__dirname, '..', 'certs', 'private-key.pem');

/**
 * SessionManager - Salesforce Authentication for E2E Automation
 *
 * AUTH METHOD: JWT Bearer Flow (via External Client App)
 *
 * This is the same strategy used in Salesforce API automation:
 * 1. Create a JWT signed with a certificate private key
 * 2. Exchange it for an access_token (user-context token)
 * 3. Use the token to create a browser session via frontdoor.jsp
 * 4. Save storageState for reuse across test runs
 *
 * The JWT Bearer flow gives a USER-CONTEXT token (not app-context).
 * User-context tokens work with frontdoor.jsp to create browser sessions.
 */
class SessionManager {
  constructor() {
    this.adminSession = null;
  }

  /**
   * Derive the login/token URL from SF_BASE_URL.
   */
  getLoginUrl() {
    const baseUrl = process.env.SF_BASE_URL || '';
    const myDomainMatch = baseUrl.match(/https?:\/\/([^.]+)\.(?:lightning\.force|my\.salesforce)\.com/);
    if (myDomainMatch) {
      return `https://${myDomainMatch[1]}.my.salesforce.com`;
    }
    return process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
  }

  /**
   * Main login method.
   */
  async loginAsAdmin() {
    const cache = this.loadSessionCache(ADMIN_SESSION_FILE);
    if (cache && this.isSessionValid(cache)) {
      console.log('[SessionManager] Checking cached session...');
      if (await this.validateSession(cache)) {
        console.log('[SessionManager] Cached session valid');
        this.adminSession = cache;
        return cache;
      }
      console.log('[SessionManager] Cached session expired');
    }

    console.log('[SessionManager] Authenticating via JWT Bearer Flow...');
    const session = await this.loginWithJwtBearer();
    this.adminSession = session;
    this.saveSessionCache(ADMIN_SESSION_FILE, session);
    return session;
  }

  /**
   * JWT Bearer Flow Authentication
   *
   * 1. Create a JWT with: iss (client_id), sub (username), aud (login URL), exp, iat
   * 2. Sign it with the private key from the .pfx certificate
   * 3. POST to /services/oauth2/token with grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
   * 4. Salesforce validates the JWT signature against the uploaded certificate
   * 5. Returns an access_token for the specified user (user-context token)
   */
  async loginWithJwtBearer() {
    const clientId = process.env.ECA_CLIENT_KEY;
    const username = process.env.ECA_EXECUTION_USER;
    const loginUrl = this.getLoginUrl();

    if (!clientId || !username) {
      throw new Error('ECA_CLIENT_KEY and ECA_EXECUTION_USER must be set in .env');
    }

    if (!fs.existsSync(PRIVATE_KEY_PATH)) {
      throw new Error(
        `Private key not found at: ${PRIVATE_KEY_PATH}\n` +
        'Generate: Run scripts/generate-cert.ps1 or create a self-signed certificate'
      );
    }

    // Read the PEM private key
    const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');

    // Create the JWT
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
      iss: clientId,           // Consumer Key (Client ID)
      sub: username,           // User to impersonate
      aud: loginUrl,           // Salesforce login URL
      exp: now + 300,          // Expires in 5 minutes
      iat: now,                // Issued at
    };

    console.log(`[SessionManager] Creating JWT for user: ${username}`);
    console.log(`[SessionManager] Login URL: ${loginUrl}`);

    // Sign the JWT with the PEM private key
    const assertion = jwt.sign(jwtPayload, privateKeyPem, {
      algorithm: 'RS256',
    });

    // Exchange JWT for access token
    const tokenUrl = `${loginUrl}/services/oauth2/token`;

    const postData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion,
    }).toString();

    console.log(`[SessionManager] Exchanging JWT for access token...`);

    let tokenResponse;
    try {
      tokenResponse = await this.httpPost(tokenUrl, postData);
    } catch (err) {
      throw new Error(`Token exchange failed: ${err.message}`);
    }

    if (tokenResponse.error) {
      const desc = tokenResponse.error_description || '';
      throw new Error(`JWT auth failed: ${tokenResponse.error} - ${desc}`);
    }

    if (!tokenResponse.access_token) {
      throw new Error(`No access_token: ${JSON.stringify(tokenResponse)}`);
    }

    // Get user info
    let userInfo = {};
    try {
      userInfo = await this.httpGet(
        `${tokenResponse.instance_url}/services/oauth2/userinfo`,
        tokenResponse.access_token
      );
    } catch { /* not critical */ }

    const session = {
      accessToken: tokenResponse.access_token,
      instanceUrl: tokenResponse.instance_url,
      loginUrl: loginUrl,
      userId: userInfo?.sub || null,
      username: userInfo?.preferred_username || username,
      authMethod: 'jwt_bearer',
      timestamp: Date.now(),
    };

    console.log(`[SessionManager] JWT auth success. User: ${session.username}`);
    return session;
  }

  /**
   * Inject session into Playwright browser via frontdoor.jsp.
   *
   * JWT Bearer tokens are user-context tokens — they work with frontdoor.jsp
   * because they represent an authenticated user session, not just an API call.
   */
  async performBrowserLogin(page, sessionData, baseUrl) {
    const sid = sessionData.accessToken;
    const instanceUrl = sessionData.instanceUrl;

    // frontdoor.jsp creates a browser session from an API token
    const frontdoorUrl = `${instanceUrl}/secur/frontdoor.jsp?sid=${encodeURIComponent(sid)}`;
    console.log(`[SessionManager] Establishing browser session via frontdoor.jsp...`);

    await page.goto(frontdoorUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    // Wait for Salesforce UI to render (not domcontentloaded — SF loads too many background resources)
    await page.waitForTimeout(8000);

    // Verify session
    const isLoggedIn = await this.verifySession(page);
    if (!isLoggedIn) {
      // Fallback: set cookies + navigate
      console.log('[SessionManager] frontdoor.jsp did not establish session, trying cookie injection...');
      await this.injectSessionViaCookies(page, sessionData);
    }

    console.log('[SessionManager] Browser session established');
    return true;
  }

  /**
   * Fallback: Inject session via direct cookie setting.
   */
  async injectSessionViaCookies(page, sessionData) {
    const accessToken = sessionData.accessToken;
    const instanceUrl = sessionData.instanceUrl;
    const domain = new URL(instanceUrl).hostname;

    // Navigate to the domain first
    await page.goto(`${instanceUrl}/`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForTimeout(1000);

    // Set session cookies
    const context = page.context();
    await context.addCookies([
      {
        name: 'sid',
        value: accessToken,
        domain: domain,
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'None',
      },
    ]);

    // Navigate to Lightning
    const lightningDomain = domain.replace('.my.salesforce.com', '.lightning.force.com');
    await page.goto(`https://${lightningDomain}/lightning/page/home`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    await page.waitForTimeout(3000);
  }

  /**
   * Verify the browser has a valid Salesforce session.
   */
  async verifySession(page) {
    const checks = [
      '.slds-global-nav',
      '[class*="globalHeader"]',
      '[class*="setupAdmin"]',
      'a[href*="/lightning"]',
      '.oneAppNavBucket',
      '.slds-icon-standard-account',
      'a[href*="sObject"]',
      '.app-nav',
      '.navItem',
      '.slds-context-bar',
      '#globalHeader',
      '.cWelcome',
      '.dashboard',
    ];

    for (const selector of checks) {
      try {
        if (await page.locator(selector).first().isVisible({ timeout: 3000 })) {
          console.log(`[SessionManager] Session verified via: ${selector}`);
          return true;
        }
      } catch { continue; }
    }

    // Check if we're on a Salesforce page (not login page)
    const url = page.url();
    const isOnSF = url.includes('lightning') || url.includes('/home') ||
                   url.includes('/secur') || url.includes('salesforce.com');
    const isOnLogin = url.includes('login') || url.includes('Login');

    if (isOnSF && !isOnLogin) {
      console.log(`[SessionManager] Session verified via URL: ${url}`);
      return true;
    }

    console.log(`[SessionManager] Session verification failed. URL: ${url}`);
    return false;
  }

  /**
   * Validate session by calling userinfo endpoint.
   */
  async validateSession(sessionData) {
    try {
      const response = await this.httpGet(
        `${sessionData.instanceUrl}/services/oauth2/userinfo`,
        sessionData.accessToken
      );
      return response && response.sub;
    } catch {
      return false;
    }
  }

  // ---- HTTP Helpers ----

  httpPost(url, postData) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error(`Invalid JSON: ${data}`)); }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  httpGet(url, authorization) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        port: 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authorization}` },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        });
      });

      req.on('error', reject);
      req.end();
    });
  }

  // ---- Cache ----

  loadSessionCache(filePath) {
    try {
      if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch { /* ignore */ }
    return null;
  }

  saveSessionCache(filePath, data) {
    try {
      if (!fs.existsSync(SESSION_CACHE_DIR)) fs.mkdirSync(SESSION_CACHE_DIR, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) { console.error('[SessionManager] Cache error:', err.message); }
  }

  isSessionValid(sessionData) {
    if (!sessionData || !sessionData.timestamp) return false;
    return (Date.now() - sessionData.timestamp) < 10 * 60 * 1000;
  }

  clearSessionCache() {
    try { if (fs.existsSync(ADMIN_SESSION_FILE)) fs.unlinkSync(ADMIN_SESSION_FILE); } catch {}
  }

  getAdminSession() { return this.adminSession; }
}

module.exports = new SessionManager();
