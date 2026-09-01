require('dotenv').config();

const TestData = {
  student: {
    firstName: process.env.STUDENT_FIRST_NAME || 'Test',
    lastName: process.env.STUDENT_LAST_NAME || 'Student',
    email: process.env.STUDENT_EMAIL || 'test.student@acmeuni.edu',
    phone: process.env.STUDENT_PHONE || '5551234567',
    get fullName() { return `${this.firstName} ${this.lastName}`; },
  },
  institute: {
    id: process.env.INSTITUTE_ID || 'ACME_UNI',
  },
  academic: {
    year: process.env.ACADEMIC_YEAR || '2025-2026',
    term: process.env.ACADEMIC_TERM || 'Fall 2026',
  },
  product: {
    name: process.env.PRODUCT_NAME || 'Tuition Fee',
    quantity: parseInt(process.env.PRODUCT_QUANTITY || '1'),
    unitPrice: parseInt(process.env.PRODUCT_UNIT_PRICE || '10000'),
  },
  billing: {
    addressSearch: process.env.BILLING_ADDRESS_SEARCH || 'ABC',
    street: '123 Test Street',
    city: 'Test City',
    postalCode: '12345',
    state: 'CA',
    country: 'US',
  },
  stripe: {
    cardNumber: process.env.STRIPE_CARD_NUMBER || '4242424242424242',
    expiry: process.env.STRIPE_EXPIRY || '12/30',
    cvv: process.env.STRIPE_CVV || '123',
  },
  account: {
    name: process.env.TEST_ACCOUNT_NAME || 'Hare Krishna',
  },
  urls: {
    base: process.env.SF_BASE_URL,
    community: process.env.COMMUNITY_URL,
  },
  credentials: {
    sfUsername: process.env.SF_USERNAME,
    sfPassword: process.env.SF_PASSWORD,
    sfToken: process.env.SF_SECURITY_TOKEN,
    communityUser: process.env.COMMUNITY_USERNAME,
    communityPass: process.env.COMMUNITY_PASSWORD,
  },
};

module.exports = TestData;
