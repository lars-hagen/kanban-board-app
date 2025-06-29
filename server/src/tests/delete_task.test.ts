
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, tasksTable } from '../db/schema';
import { deleteTask } from '../handlers/delete_task';
import { eq } from 'drizzle-orm';

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: { id: number; email: string; password_hash: string; name: string; created_at: Date };
  let otherUser: { id: number; email: string; password_hash: string; name: string; created_at: Date };
  let testBoard: { id: number; title: string; description: string | null; user_id: number; created_at: Date; updated_at: Date };
  let testList: { id: number; title: string; board_id: number; position: number; created_at: Date; updated_at: Date };
  let testTask: { id: number; title: string; description: string | null; list_id: number; position: number; created_at: Date; updated_at: Date };

  beforeEach(async () => {
    // Create test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUser = users[0];

    // Create other user for unauthorized test
    const otherUsers = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashedpassword',
        name: 'Other User'
      })
      .returning()
      .execute();
    otherUser = otherUsers[0];

    // Create test board
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'A test board',
        user_id: testUser.id
      })
      .returning()
      .execute();
    testBoard = boards[0];

    // Create test list
    const lists = await db.insert(listsTable)
      .values({
        title: 'Test List',
        board_id: testBoard.id,
        position: 0
      })
      .returning()
      .execute();
    testList = lists[0];

    // Create test task
    const tasks = await db.insert(tasksTable)
      .values({
        title: 'Test Task',
        description: 'A test task',
        list_id: testList.id,
        position: 0
      })
      .returning()
      .execute();
    testTask = tasks[0];
  });

  it('should delete a task owned by the user', async () => {
    const result = await deleteTask(testTask.id, testUser.id);

    // Verify the returned task data
    expect(result.id).toEqual(testTask.id);
    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A test task');
    expect(result.list_id).toEqual(testList.id);
    expect(result.position).toEqual(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should remove task from database', async () => {
    await deleteTask(testTask.id, testUser.id);

    // Verify task is deleted from database
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTask.id))
      .execute();

    expect(tasks).toHaveLength(0);
  });

  it('should throw error for non-existent task', async () => {
    const nonExistentId = 99999;

    await expect(deleteTask(nonExistentId, testUser.id))
      .rejects.toThrow(/task not found/i);
  });

  it('should throw error when user tries to delete task they do not own', async () => {
    await expect(deleteTask(testTask.id, otherUser.id))
      .rejects.toThrow(/unauthorized.*own tasks/i);
  });

  it('should verify ownership through board relationship', async () => {
    // Create another user's board, list, and task
    const otherBoard = await db.insert(boardsTable)
      .values({
        title: 'Other Board',
        description: 'Another board',
        user_id: otherUser.id
      })
      .returning()
      .execute();

    const otherList = await db.insert(listsTable)
      .values({
        title: 'Other List',
        board_id: otherBoard[0].id,
        position: 0
      })
      .returning()
      .execute();

    const otherTask = await db.insert(tasksTable)
      .values({
        title: 'Other Task',
        description: 'Another task',
        list_id: otherList[0].id,
        position: 0
      })
      .returning()
      .execute();

    // Test user should not be able to delete other user's task
    await expect(deleteTask(otherTask[0].id, testUser.id))
      .rejects.toThrow(/unauthorized.*own tasks/i);
  });
});
