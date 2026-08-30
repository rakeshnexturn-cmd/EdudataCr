const express = require('express');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dashboard')));
app.use('/test-results', express.static(path.join(__dirname, 'test-results')));
app.use('/playwright-report', express.static(path.join(__dirname, 'playwright-report')));

let testProcess = null;
let testRunning = false;
let lastResult = null;
let logs = [];

function addLog(message) {
  const timestamp = new Date().toISOString();
  logs.push({ timestamp, message });
  if (logs.length > 500) logs.shift();
}

app.get('/api/status', (req, res) => {
  res.json({
    running: testRunning,
    lastResult,
    logs: logs.slice(-100),
  });
});

app.post('/api/run', (req, res) => {
  if (testRunning) {
    return res.status(409).json({ error: 'Test already running' });
  }

  const { tests, headless, browser } = req.body;
  
  let testFiles = [];
  if (tests === 'tc01') {
    testFiles = ['tests/tc01_full_e2e_student_payment.spec.js'];
  } else if (tests === 'tc02') {
    testFiles = ['tests/tc02_existing_person_payment.spec.js'];
  } else {
    testFiles = ['tests/tc01_full_e2e_student_payment.spec.js', 'tests/tc02_existing_person_payment.spec.js'];
  }

  const env = {
    ...process.env,
    HEADLESS: headless !== false ? 'true' : 'false',
    BROWSER: browser || 'chromium',
    // HEALED: Keep Chromium inside the deployed app bundle so Render runtime can find it.
    PLAYWRIGHT_BROWSERS_PATH: '0',
  };

  testRunning = true;
  lastResult = { status: 'running', startTime: new Date().toISOString(), tests };
  logs = [];
  addLog(`Starting tests: ${tests || 'all'}`);

  const args = ['npx', 'playwright', 'test', '--reporter=list,html'];
  testFiles.forEach(f => args.push(f));

  testProcess = spawn(args[0], args.slice(1), {
    cwd: __dirname,
    env,
    // HEALED: shell mode is unnecessary on Render and causes the DEP0190 warning.
    shell: process.platform === 'win32',
  });

  testProcess.stdout.on('data', (data) => {
    const msg = data.toString().trim();
    addLog(msg);
  });

  testProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) addLog(`[stderr] ${msg}`);
  });

  testProcess.on('close', (code) => {
    testRunning = false;
    lastResult = {
      ...lastResult,
      status: code === 0 ? 'passed' : 'failed',
      exitCode: code,
      endTime: new Date().toISOString(),
    };
    addLog(`Tests finished with exit code: ${code}`);
    testProcess = null;
  });

  testProcess.on('error', (err) => {
    testRunning = false;
    lastResult = {
      ...lastResult,
      status: 'error',
      error: err.message,
      endTime: new Date().toISOString(),
    };
    addLog(`Error: ${err.message}`);
    testProcess = null;
  });

  res.json({ message: 'Tests started', pid: testProcess.pid });
});

app.post('/api/stop', (req, res) => {
  if (testProcess) {
    testProcess.kill('SIGTERM');
    testRunning = false;
    lastResult = { ...lastResult, status: 'stopped', endTime: new Date().toISOString() };
    addLog('Tests stopped by user');
    res.json({ message: 'Tests stopped' });
  } else {
    res.json({ message: 'No test running' });
  }
});

app.get('/api/results', (req, res) => {
  const reportPath = path.join(__dirname, 'playwright-report', 'index.html');
  const exists = fs.existsSync(reportPath);
  res.json({ reportExists: exists, lastResult });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Dashboard server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} to access the test dashboard`);
});
