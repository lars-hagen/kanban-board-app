
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateUserInput = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user', async () => {
    const result = await createUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123'); // Should be hashed
  });

  it('should hash the password', async () => {
    const result = await createUser(testInput);

    // Verify password is hashed correctly using Bun's built-in verify
    const isValidPassword = await Bun.password.verify('password123', result.password_hash);
    expect(isValidPassword).toBe(true);

    // Verify wrong password doesn't match
    const isInvalidPassword = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalidPassword).toBe(false);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error for duplicate email', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email
    await expect(createUser(testInput)).rejects.toThrow(/duplicate key value/i);
  });
});
