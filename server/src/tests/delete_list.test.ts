
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, tasksTable } from '../db/schema';
import { deleteList } from '../handlers/delete_list';
import { eq } from 'drizzle-orm';

describe('deleteList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a list owned by the user', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test board
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'Test board description',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    // Create test list
    const lists = await db.insert(listsTable)
      .values({
        title: 'Test List',
        board_id: boardId,
        position: 1
      })
      .returning()
      .execute();
    const listId = lists[0].id;

    // Delete the list
    const result = await deleteList(listId, userId);

    // Verify return value
    expect(result.id).toEqual(listId);
    expect(result.title).toEqual('Test List');
    expect(result.board_id).toEqual(boardId);
    expect(result.position).toEqual(1);

    // Verify list is deleted from database
    const remainingLists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, listId))
      .execute();

    expect(remainingLists).toHaveLength(0);
  });

  it('should delete list and cascade delete associated tasks', async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = users[0].id;

    // Create test board
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'Test board description',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    // Create test list
    const lists = await db.insert(listsTable)
      .values({
        title: 'Test List',
        board_id: boardId,
        position: 1
      })
      .returning()
      .execute();
    const listId = lists[0].id;

    // Create test tasks in the list
    await db.insert(tasksTable)
      .values([
        {
          title: 'Task 1',
          description: 'First task',
          list_id: listId,
          position: 1
        },
        {
          title: 'Task 2',
          description: 'Second task',
          list_id: listId,
          position: 2
        }
      ])
      .execute();

    // Verify tasks exist before deletion
    const tasksBefore = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.list_id, listId))
      .execute();
    expect(tasksBefore).toHaveLength(2);

    // Delete the list
    await deleteList(listId, userId);

    // Verify tasks are cascade deleted
    const tasksAfter = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.list_id, listId))
      .execute();
    expect(tasksAfter).toHaveLength(0);
  });

  it('should throw error when list does not exist', async () => {
    const nonExistentListId = 999;
    const userId = 1;

    await expect(deleteList(nonExistentListId, userId))
      .rejects.toThrow(/list not found/i);
  });

  it('should throw error when user does not own the board', async () => {
    // Create test user 1
    const users1 = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User 1'
      })
      .returning()
      .execute();
    const user1Id = users1[0].id;

    // Create test user 2
    const users2 = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User 2'
      })
      .returning()
      .execute();
    const user2Id = users2[0].id;

    // Create board owned by user 1
    const boards = await db.insert(boardsTable)
      .values({
        title: 'User 1 Board',
        description: 'Board owned by user 1',
        user_id: user1Id
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    // Create list in user 1's board
    const lists = await db.insert(listsTable)
      .values({
        title: 'Test List',
        board_id: boardId,
        position: 1
      })
      .returning()
      .execute();
    const listId = lists[0].id;

    // Try to delete list as user 2 (should fail)
    await expect(deleteList(listId, user2Id))
      .rejects.toThrow(/not authorized/i);

    // Verify list still exists
    const remainingLists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, listId))
      .execute();
    expect(remainingLists).toHaveLength(1);
  });
});
