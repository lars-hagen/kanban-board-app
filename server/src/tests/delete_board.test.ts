
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, tasksTable } from '../db/schema';
import { deleteBoard } from '../handlers/delete_board';
import { eq } from 'drizzle-orm';

describe('deleteBoard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a board owned by the user', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test board
    const boardResult = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'Test Description',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boardResult[0].id;

    // Delete the board
    const result = await deleteBoard(boardId, userId);

    // Verify returned data
    expect(result.id).toEqual(boardId);
    expect(result.title).toEqual('Test Board');
    expect(result.description).toEqual('Test Description');
    expect(result.user_id).toEqual(userId);

    // Verify board was deleted from database
    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, boardId))
      .execute();

    expect(boards).toHaveLength(0);
  });

  it('should cascade delete lists and tasks', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test board
    const boardResult = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'Test Description',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boardResult[0].id;

    // Create test list
    const listResult = await db.insert(listsTable)
      .values({
        title: 'Test List',
        board_id: boardId,
        position: 1
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    // Create test task
    await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'Test Task Description',
        list_id: listId,
        position: 1
      })
      .execute();

    // Delete the board
    await deleteBoard(boardId, userId);

    // Verify board was deleted
    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, boardId))
      .execute();
    expect(boards).toHaveLength(0);

    // Verify list was cascade deleted
    const lists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, listId))
      .execute();
    expect(lists).toHaveLength(0);

    // Verify task was cascade deleted
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.list_id, listId))
      .execute();
    expect(tasks).toHaveLength(0);
  });

  it('should throw error when board does not exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const nonExistentBoardId = 99999;

    await expect(deleteBoard(nonExistentBoardId, userId))
      .rejects.toThrow(/board not found or not owned by user/i);
  });

  it('should throw error when user does not own the board', async () => {
    // Create first user and board
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashedpassword',
        name: 'User 1'
      })
      .returning()
      .execute();
    const user1Id = user1Result[0].id;

    const boardResult = await db.insert(boardsTable)
      .values({
        title: 'User 1 Board',
        description: 'Test Description',
        user_id: user1Id
      })
      .returning()
      .execute();
    const boardId = boardResult[0].id;

    // Create second user
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashedpassword',
        name: 'User 2'
      })
      .returning()
      .execute();
    const user2Id = user2Result[0].id;

    // Try to delete board as user 2
    await expect(deleteBoard(boardId, user2Id))
      .rejects.toThrow(/board not found or not owned by user/i);

    // Verify board still exists
    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, boardId))
      .execute();
    expect(boards).toHaveLength(1);
  });
});
