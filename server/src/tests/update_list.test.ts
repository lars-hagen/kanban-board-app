
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable } from '../db/schema';
import { updateList } from '../handlers/update_list';
import { type UpdateListInput } from '../schema';
import { eq } from 'drizzle-orm';

describe('updateList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a list successfully', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test board
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'A board for testing',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    // Create test list
    const lists = await db.insert(listsTable)
      .values({
        title: 'Original List',
        board_id: boardId,
        position: 0
      })
      .returning()
      .execute();
    const listId = lists[0].id;

    const input: UpdateListInput = {
      id: listId,
      title: 'Updated List',
      position: 5
    };

    const result = await updateList(input, userId);

    expect(result.id).toEqual(listId);
    expect(result.title).toEqual('Updated List');
    expect(result.position).toEqual(5);
    expect(result.board_id).toEqual(boardId);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(lists[0].updated_at.getTime());
  });

  it('should update only title when position not provided', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test board
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'A board for testing',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    // Create test list
    const lists = await db.insert(listsTable)
      .values({
        title: 'Original List',
        board_id: boardId,
        position: 3
      })
      .returning()
      .execute();
    const listId = lists[0].id;

    const input: UpdateListInput = {
      id: listId,
      title: 'Updated Title Only'
    };

    const result = await updateList(input, userId);

    expect(result.title).toEqual('Updated Title Only');
    expect(result.position).toEqual(3); // Position should remain unchanged
  });

  it('should update only position when title not provided', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test board
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'A board for testing',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    // Create test list
    const lists = await db.insert(listsTable)
      .values({
        title: 'Original List',
        board_id: boardId,
        position: 2
      })
      .returning()
      .execute();
    const listId = lists[0].id;

    const input: UpdateListInput = {
      id: listId,
      position: 8
    };

    const result = await updateList(input, userId);

    expect(result.title).toEqual('Original List'); // Title should remain unchanged
    expect(result.position).toEqual(8);
  });

  it('should persist changes to database', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test board
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'A board for testing',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    // Create test list
    const lists = await db.insert(listsTable)
      .values({
        title: 'Original List',
        board_id: boardId,
        position: 1
      })
      .returning()
      .execute();
    const listId = lists[0].id;

    const input: UpdateListInput = {
      id: listId,
      title: 'Updated List',
      position: 10
    };

    await updateList(input, userId);

    // Verify changes persisted in database
    const savedLists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, listId))
      .execute();

    expect(savedLists).toHaveLength(1);
    expect(savedLists[0].title).toEqual('Updated List');
    expect(savedLists[0].position).toEqual(10);
    expect(savedLists[0].board_id).toEqual(boardId);
  });

  it('should throw error when list not found', async () => {
    const input: UpdateListInput = {
      id: 999, // Non-existent list ID
      title: 'Updated List'
    };

    await expect(updateList(input, 1)).rejects.toThrow(/list not found/i);
  });

  it('should throw error when user does not own the board', async () => {
    // Create first user (owner)
    const users1 = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashedpassword',
        name: 'Owner'
      })
      .returning()
      .execute();
    const ownerId = users1[0].id;

    // Create second user (non-owner)
    const users2 = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        name: 'Other User'
      })
      .returning()
      .execute();
    const otherUserId = users2[0].id;

    // Create board owned by first user
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Owner Board',
        description: 'Board owned by first user',
        user_id: ownerId
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    // Create list in the board
    const lists = await db.insert(listsTable)
      .values({
        title: 'List in Owner Board',
        board_id: boardId,
        position: 0
      })
      .returning()
      .execute();
    const listId = lists[0].id;

    const input: UpdateListInput = {
      id: listId,
      title: 'Unauthorized Update'
    };

    // Try to update with different user
    await expect(updateList(input, otherUserId)).rejects.toThrow(/access denied/i);
  });
});
