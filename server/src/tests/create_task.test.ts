
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq, desc } from 'drizzle-orm';

describe('createTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testBoardId: number;
  let testListId: number;
  let otherUserId: number;
  let otherBoardId: number;
  let otherListId: number;

  beforeEach(async () => {
    // Create test user and board/list
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = user[0].id;

    const board = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'A test board',
        user_id: testUserId
      })
      .returning()
      .execute();
    testBoardId = board[0].id;

    const list = await db.insert(listsTable)
      .values({
        title: 'Test List',
        board_id: testBoardId,
        position: 0
      })
      .returning()
      .execute();
    testListId = list[0].id;

    // Create another user and board/list for authorization tests
    const otherUser = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashed_password',
        name: 'Other User'
      })
      .returning()
      .execute();
    otherUserId = otherUser[0].id;

    const otherBoard = await db.insert(boardsTable)
      .values({
        title: 'Other Board',
        description: 'Another board',
        user_id: otherUserId
      })
      .returning()
      .execute();
    otherBoardId = otherBoard[0].id;

    const otherList = await db.insert(listsTable)
      .values({
        title: 'Other List',
        board_id: otherBoardId,
        position: 0
      })
      .returning()
      .execute();
    otherListId = otherList[0].id;
  });

  const testInput: CreateTaskInput = {
    title: 'Test Task',
    description: 'A task for testing',
    list_id: 0 // Will be set in tests
  };

  it('should create a task successfully', async () => {
    const input = { ...testInput, list_id: testListId };
    const result = await createTask(input, testUserId);

    expect(result.title).toEqual('Test Task');
    expect(result.description).toEqual('A task for testing');
    expect(result.list_id).toEqual(testListId);
    expect(result.position).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save task to database', async () => {
    const input = { ...testInput, list_id: testListId };
    const result = await createTask(input, testUserId);

    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Test Task');
    expect(tasks[0].description).toEqual('A task for testing');
    expect(tasks[0].list_id).toEqual(testListId);
    expect(tasks[0].position).toEqual(0);
  });

  it('should calculate correct position for multiple tasks', async () => {
    const input = { ...testInput, list_id: testListId };

    // Create first task
    const task1 = await createTask(input, testUserId);
    expect(task1.position).toEqual(0);

    // Create second task
    const task2 = await createTask({ ...input, title: 'Second Task' }, testUserId);
    expect(task2.position).toEqual(1);

    // Create third task
    const task3 = await createTask({ ...input, title: 'Third Task' }, testUserId);
    expect(task3.position).toEqual(2);
  });

  it('should handle null description', async () => {
    const input = {
      title: 'Task without description',
      description: null,
      list_id: testListId
    };

    const result = await createTask(input, testUserId);

    expect(result.title).toEqual('Task without description');
    expect(result.description).toBeNull();
    expect(result.list_id).toEqual(testListId);
  });

  it('should throw error when list does not exist', async () => {
    const input = { ...testInput, list_id: 99999 };

    await expect(createTask(input, testUserId)).rejects.toThrow(/list not found/i);
  });

  it('should throw error when user does not own the list', async () => {
    const input = { ...testInput, list_id: otherListId };

    await expect(createTask(input, testUserId)).rejects.toThrow(/unauthorized/i);
  });

  it('should allow other user to create task in their own list', async () => {
    const input = { ...testInput, list_id: otherListId };
    const result = await createTask(input, otherUserId);

    expect(result.title).toEqual('Test Task');
    expect(result.list_id).toEqual(otherListId);
    expect(result.position).toEqual(0);
  });
});
