
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable, tasksTable } from '../db/schema';
import { getListWithTasks } from '../handlers/get_list_with_tasks';

describe('getListWithTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return list with tasks ordered by position', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
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

    // Create test tasks with different positions
    await db.insert(tasksTable)
      .values([
        {
          title: 'Task 3',
          description: 'Third task',
          list_id: listId,
          position: 3
        },
        {
          title: 'Task 1',
          description: 'First task',
          list_id: listId,
          position: 1
        },
        {
          title: 'Task 2',
          description: null,
          list_id: listId,
          position: 2
        }
      ])
      .execute();

    const result = await getListWithTasks(listId, userId);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(listId);
    expect(result?.title).toEqual('Test List');
    expect(result?.board_id).toEqual(boardId);
    expect(result?.position).toEqual(1);
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);

    // Verify tasks are ordered by position
    expect(result?.tasks).toHaveLength(3);
    expect(result?.tasks[0].title).toEqual('Task 1');
    expect(result?.tasks[0].position).toEqual(1);
    expect(result?.tasks[1].title).toEqual('Task 2');
    expect(result?.tasks[1].position).toEqual(2);
    expect(result?.tasks[2].title).toEqual('Task 3');
    expect(result?.tasks[2].position).toEqual(3);
  });

  it('should return null for non-existent list', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const result = await getListWithTasks(999, userId);

    expect(result).toBeNull();
  });

  it('should return null when user does not own the board', async () => {
    // Create first user (owner)
    const ownerResult = await db.insert(usersTable)
      .values({
        email: 'owner@example.com',
        password_hash: 'hashed_password',
        name: 'Owner User'
      })
      .returning()
      .execute();
    const ownerId = ownerResult[0].id;

    // Create second user (non-owner)
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hashed_password',
        name: 'Regular User'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create board owned by first user
    const boardResult = await db.insert(boardsTable)
      .values({
        title: 'Owner Board',
        description: 'Owned by first user',
        user_id: ownerId
      })
      .returning()
      .execute();
    const boardId = boardResult[0].id;

    // Create list in owner's board
    const listResult = await db.insert(listsTable)
      .values({
        title: 'Owner List',
        board_id: boardId,
        position: 1
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    // Try to access with non-owner user
    const result = await getListWithTasks(listId, userId);

    expect(result).toBeNull();
  });

  it('should return list with empty tasks array when no tasks exist', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
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

    // Create test list without tasks
    const listResult = await db.insert(listsTable)
      .values({
        title: 'Empty List',
        board_id: boardId,
        position: 1
      })
      .returning()
      .execute();
    const listId = listResult[0].id;

    const result = await getListWithTasks(listId, userId);

    expect(result).toBeDefined();
    expect(result?.id).toEqual(listId);
    expect(result?.title).toEqual('Empty List');
    expect(result?.tasks).toHaveLength(0);
  });
});
