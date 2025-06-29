
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'test_password_123',
  name: 'Test User'
};

const loginInput: LoginInput = {
  email: 'test@example.com',
  password: 'test_password_123'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login user with valid credentials', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await loginUser(loginInput);

    // Verify user data
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.name).toEqual('Test User');
    expect(result.user.password_hash).toEqual('test_password_123');
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);

    // Verify token is generated
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
    expect(result.token).toMatch(/^jwt_token_\d+_\d+$/);
  });

  it('should reject login with invalid email', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const invalidInput: LoginInput = {
      email: 'nonexistent@example.com',
      password: 'test_password_123'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login with invalid password', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const invalidInput: LoginInput = {
      email: 'test@example.com',
      password: 'wrong_password'
    };

    await expect(loginUser(invalidInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should reject login when no users exist', async () => {
    // Don't create any users
    await expect(loginUser(loginInput)).rejects.toThrow(/invalid email or password/i);
  });
});
