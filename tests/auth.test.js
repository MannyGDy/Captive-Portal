const request = require('supertest');
const { app } = require('../backend/server');
const { pool } = require('../backend/config/database');

describe('Authentication API', () => {
  let testUser = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@test.com',
    phone_number: '08012345678',
    company: 'Test Company'
  };

  beforeAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM user_registrations WHERE email = $1', [testUser.email]);
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM user_registrations WHERE email = $1', [testUser.email]);
    await pool.end();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.token).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Email already registered');
    });

    it('should validate required fields', async () => {
      const invalidUser = {
        first_name: 'John',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should validate Nigerian phone number format', async () => {
      const invalidUser = {
        ...testUser,
        email: 'invalid@test.com',
        phone_number: '1234567890' // Invalid format
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        phone_number: testUser.phone_number
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const invalidLoginData = {
        email: testUser.email,
        phone_number: '08099999999' // Wrong phone number
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLoginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should validate email format', async () => {
      const invalidLoginData = {
        email: 'invalid-email',
        phone_number: testUser.phone_number
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLoginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          phone_number: testUser.phone_number
        });

      authToken = loginResponse.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken;

    beforeAll(async () => {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          phone_number: testUser.phone_number
        });

      authToken = loginResponse.body.token;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logout successful');
    });
  });
});

describe('Health Check API', () => {
  it('should return health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain('MikroTik Captive Portal API is running');
    expect(response.body.timestamp).toBeDefined();
    expect(response.body.version).toBeDefined();
  });
});
