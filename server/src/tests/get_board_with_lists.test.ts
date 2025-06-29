
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable } from '../db/schema';
import { getBoardWithLists } from '../handlers/get_board_with_lists';

describe('getBoardWithLists', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return board with lists for authorized user', async () => {
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
        description: 'A test board',
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    // Create test lists with different positions
    await db.insert(listsTable)
      .values([
        {
          title: 'Third List',
          board_id: boardId,
          position: 3
        },
        {
          title: 'First List',
          board_id: boardId,
          position: 1
        },
        {
          title: 'Second List',
          board_id: boardId,
          position: 2
        }
      ])
      .execute();

    const result = await getBoardWithLists(boardId, userId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(boardId);
    expect(result!.title).toBe('Test Board');
    expect(result!.description).toBe('A test board');
    expect(result!.user_id).toBe(userId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
    expect(result!.lists).toHaveLength(3);

    // Verify lists are ordered by position
    expect(result!.lists[0].title).toBe('First List');
    expect(result!.lists[0].position).toBe(1);
    expect(result!.lists[1].title).toBe('Second List');
    expect(result!.lists[1].position).toBe(2);
    expect(result!.lists[2].title).toBe('Third List');
    expect(result!.lists[2].position).toBe(3);

    // Verify list properties
    result!.lists.forEach(list => {
      expect(list.id).toBeDefined();
      expect(list.board_id).toBe(boardId);
      expect(list.created_at).toBeInstanceOf(Date);
      expect(list.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return null for non-existent board', async () => {
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

    const result = await getBoardWithLists(999, userId);

    expect(result).toBeNull();
  });

  it('should return null for board owned by different user', async () => {
    // Create two test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'owner@example.com',
          password_hash: 'hashed_password',
          name: 'Board Owner'
        },
        {
          email: 'other@example.com',
          password_hash: 'hashed_password',
          name: 'Other User'
        }
      ])
      .returning()
      .execute();
    const ownerId = users[0].id;
    const otherId = users[1].id;

    // Create board owned by first user
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Private Board',
        description: 'This board belongs to owner',
        user_id: ownerId
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    // Try to access with different user
    const result = await getBoardWithLists(boardId, otherId);

    expect(result).toBeNull();
  });

  it('should return board with empty lists array when no lists exist', async () => {
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

    // Create test board without lists
    const boards = await db.insert(boardsTable)
      .values({
        title: 'Empty Board',
        description: null,
        user_id: userId
      })
      .returning()
      .execute();
    const boardId = boards[0].id;

    const result = await getBoardWithLists(boardId, userId);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(boardId);
    expect(result!.title).toBe('Empty Board');
    expect(result!.description).toBeNull();
    expect(result!.lists).toHaveLength(0);
  });
});
