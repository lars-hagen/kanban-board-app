
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { boardsTable, usersTable } from '../db/schema';
import { type CreateBoardInput } from '../schema';
import { createBoard } from '../handlers/create_board';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateBoardInput = {
  title: 'Test Board',
  description: 'A board for testing'
};

const testInputWithNullDescription: CreateBoardInput = {
  title: 'Test Board No Description',
  description: null
};

describe('createBoard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first (boards need a user_id)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;
  });

  it('should create a board with description', async () => {
    const result = await createBoard(testInput, testUserId);

    // Basic field validation
    expect(result.title).toEqual('Test Board');
    expect(result.description).toEqual('A board for testing');
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a board with null description', async () => {
    const result = await createBoard(testInputWithNullDescription, testUserId);

    // Basic field validation
    expect(result.title).toEqual('Test Board No Description');
    expect(result.description).toBeNull();
    expect(result.user_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save board to database', async () => {
    const result = await createBoard(testInput, testUserId);

    // Query using proper drizzle syntax
    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, result.id))
      .execute();

    expect(boards).toHaveLength(1);
    expect(boards[0].title).toEqual('Test Board');
    expect(boards[0].description).toEqual('A board for testing');
    expect(boards[0].user_id).toEqual(testUserId);
    expect(boards[0].created_at).toBeInstanceOf(Date);
    expect(boards[0].updated_at).toBeInstanceOf(Date);
  });

  it('should fail when user_id does not exist', async () => {
    const nonExistentUserId = 99999;
    
    await expect(createBoard(testInput, nonExistentUserId)).rejects.toThrow(/violates foreign key constraint/i);
  });
});
