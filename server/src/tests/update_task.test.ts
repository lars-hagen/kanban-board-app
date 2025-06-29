
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, tasksTable } from '../db/schema';
import { type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq, and, asc } from 'drizzle-orm';

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let otherUserId: number;
  let testBoardId: number;
  let otherBoardId: number;
  let testListId: number;
  let secondListId: number;
  let otherListId: number;
  let testTaskId: number;
  let otherTaskId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        { email: 'test@example.com', password_hash: 'hash', name: 'Test User' },
        { email: 'other@example.com', password_hash: 'hash', name: 'Other User' }
      ])
      .returning()
      .execute();

    testUserId = users[0].id;
    otherUserId = users[1].id;

    // Create test boards
    const boards = await db.insert(boardsTable)
      .values([
        { title: 'Test Board', user_id: testUserId },
        { title: 'Other Board', user_id: otherUserId }
      ])
      .returning()
      .execute();

    testBoardId = boards[0].id;
    otherBoardId = boards[1].id;

    // Create test lists
    const lists = await db.insert(listsTable)
      .values([
        { title: 'Test List', board_id: testBoardId, position: 0 },
        { title: 'Second List', board_id: testBoardId, position: 1 },
        { title: 'Unauthorized List', board_id: otherBoardId, position: 0 }
      ])
      .returning()
      .execute();

    testListId = lists[0].id;
    secondListId = lists[1].id;
    otherListId = lists[2].id;

    // Create test tasks
    const tasks = await db.insert(tasksTable)
      .values([
        { title: 'Test Task', description: 'Original description', list_id: testListId, position: 0 },
        { title: 'Other Task', description: 'Other description', list_id: testListId, position: 1 },
        { title: 'Task 3', description: 'Third task', list_id: testListId, position: 2 }
      ])
      .returning()
      .execute();

    testTaskId = tasks[0].id;
    otherTaskId = tasks[1].id;
  });

  it('should update task title and description', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Updated Task Title',
      description: 'Updated description'
    };

    const result = await updateTask(input, testUserId);

    expect(result.id).toEqual(testTaskId);
    expect(result.title).toEqual('Updated Task Title');
    expect(result.description).toEqual('Updated description');
    expect(result.list_id).toEqual(testListId);
    expect(result.position).toEqual(0);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated task to database', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Updated Task Title',
      description: 'Updated description'
    };

    const result = await updateTask(input, testUserId);

    const savedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    expect(savedTask).toHaveLength(1);
    expect(savedTask[0].title).toEqual('Updated Task Title');
    expect(savedTask[0].description).toEqual('Updated description');
    expect(savedTask[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update position within same list', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      position: 2
    };

    const result = await updateTask(input, testUserId);

    expect(result.position).toEqual(2);

    // Verify position recalculation - other tasks should shift up
    const allTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.list_id, testListId))
      .orderBy(asc(tasksTable.position))
      .execute();

    expect(allTasks[0].id).toEqual(otherTaskId); // Task 2 moved to position 0
    expect(allTasks[0].position).toEqual(0);
    expect(allTasks[1].position).toEqual(1); // Task 3 moved to position 1
    expect(allTasks[2].id).toEqual(testTaskId); // Test task moved to position 2
    expect(allTasks[2].position).toEqual(2);
  });

  it('should move task to different list', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      list_id: secondListId
    };

    const result = await updateTask(input, testUserId);

    expect(result.list_id).toEqual(secondListId);
    expect(result.position).toEqual(0); // Should be at end of new list (which is empty)

    // Verify task moved
    const movedTask = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTaskId))
      .execute();

    expect(movedTask[0].list_id).toEqual(secondListId);
    expect(movedTask[0].position).toEqual(0);

    // Verify original list tasks shifted up
    const originalListTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.list_id, testListId))
      .orderBy(asc(tasksTable.position))
      .execute();

    expect(originalListTasks).toHaveLength(2);
    expect(originalListTasks[0].position).toEqual(0);
    expect(originalListTasks[1].position).toEqual(1);
  });

  it('should move task to specific position in different list', async () => {
    // Add existing tasks to second list
    await db.insert(tasksTable)
      .values([
        { title: 'Existing Task 1', list_id: secondListId, position: 0 },
        { title: 'Existing Task 2', list_id: secondListId, position: 1 }
      ])
      .execute();

    const input: UpdateTaskInput = {
      id: testTaskId,
      list_id: secondListId,
      position: 1
    };

    const result = await updateTask(input, testUserId);

    expect(result.list_id).toEqual(secondListId);
    expect(result.position).toEqual(1);

    // Verify tasks in target list shifted to make room
    const targetListTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.list_id, secondListId))
      .orderBy(asc(tasksTable.position))
      .execute();

    expect(targetListTasks).toHaveLength(3);
    expect(targetListTasks[0].title).toEqual('Existing Task 1');
    expect(targetListTasks[0].position).toEqual(0);
    expect(targetListTasks[1].id).toEqual(testTaskId);
    expect(targetListTasks[1].position).toEqual(1);
    expect(targetListTasks[2].title).toEqual('Existing Task 2');
    expect(targetListTasks[2].position).toEqual(2);
  });

  it('should throw error when task not found', async () => {
    const input: UpdateTaskInput = {
      id: 999999,
      title: 'Updated Title'
    };

    await expect(updateTask(input, testUserId)).rejects.toThrow(/task not found/i);
  });

  it('should throw error when user does not own task', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Updated Title'
    };

    await expect(updateTask(input, otherUserId)).rejects.toThrow(/unauthorized.*task not owned/i);
  });

  it('should throw error when target list not found', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      list_id: 999999
    };

    await expect(updateTask(input, testUserId)).rejects.toThrow(/target list not found/i);
  });

  it('should throw error when target list not owned by user', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      list_id: otherListId
    };

    await expect(updateTask(input, testUserId)).rejects.toThrow(/unauthorized.*target list not owned/i);
  });

  it('should handle partial updates correctly', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      title: 'Only Title Updated'
    };

    const result = await updateTask(input, testUserId);

    expect(result.title).toEqual('Only Title Updated');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.list_id).toEqual(testListId);
    expect(result.position).toEqual(0);
  });

  it('should handle setting description to null', async () => {
    const input: UpdateTaskInput = {
      id: testTaskId,
      description: null
    };

    const result = await updateTask(input, testUserId);

    expect(result.description).toBeNull();
    expect(result.title).toEqual('Test Task'); // Should remain unchanged
  });
});
