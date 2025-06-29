
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable } from '../db/schema';
import { type UpdateBoardInput } from '../schema';
import { updateBoard } from '../handlers/update_board';
import { eq } from 'drizzle-orm';

describe('updateBoard', () => {
  let testUserId: number;
  let testBoardId: number;
  let otherUserId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'test@example.com',
          password_hash: 'hash123',
          name: 'Test User'
        },
        {
          email: 'other@example.com',
          password_hash: 'hash456',
          name: 'Other User'
        }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test board
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Original Board',
        description: 'Original description',
        user_id: testUserId
      })
      .returning()
      .execute();

    testBoardId = boards[0].id;
  });

  afterEach(resetDB);

  it('should update board title', async () => {
    const input: UpdateBoardInput = {
      id: testBoardId,
      title: 'Updated Title'
    };

    const result = await updateBoard(input, testUserId);

    expect(result.id).toEqual(testBoardId);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('Original description');
    expect(result.user_id).toEqual(testUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update board description', async () => {
    const input: UpdateBoardInput = {
      id: testBoardId,
      description: 'Updated description'
    };

    const result = await updateBoard(input, testUserId);

    expect(result.title).toEqual('Original Board');
    expect(result.description).toEqual('Updated description');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update board description to null', async () => {
    const input: UpdateBoardInput = {
      id: testBoardId,
      description: null
    };

    const result = await updateBoard(input, testUserId);

    expect(result.title).toEqual('Original Board');
    expect(result.description).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both title and description', async () => {
    const input: UpdateBoardInput = {
      id: testBoardId,
      title: 'New Title',
      description: 'New description'
    };

    const result = await updateBoard(input, testUserId);

    expect(result.title).toEqual('New Title');
    expect(result.description).toEqual('New description');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    const input: UpdateBoardInput = {
      id: testBoardId,
      title: 'Database Test Title'
    };

    await updateBoard(input, testUserId);

    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, testBoardId))
      .execute();

    expect(boards).toHaveLength(1);
    expect(boards[0].title).toEqual('Database Test Title');
    expect(boards[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent board', async () => {
    const input: UpdateBoardInput = {
      id: 99999,
      title: 'Updated Title'
    };

    await expect(updateBoard(input, testUserId))
      .rejects.toThrow(/board not found or access denied/i);
  });

  it('should throw error when updating board owned by different user', async () => {
    const input: UpdateBoardInput = {
      id: testBoardId,
      title: 'Unauthorized Update'
    };

    await expect(updateBoard(input, otherUserId))
      .rejects.toThrow(/board not found or access denied/i);
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalBoard = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, testBoardId))
      .execute();

    const originalUpdatedAt = originalBoard[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateBoardInput = {
      id: testBoardId,
      title: 'Timestamp Test'
    };

    const result = await updateBoard(input, testUserId);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });
});
