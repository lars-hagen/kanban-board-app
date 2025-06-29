
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable } from '../db/schema';
import { getUserBoards } from '../handlers/get_user_boards';

describe('getUserBoards', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return boards for a user', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create test boards for the user
    await db.insert(boardsTable)
      .values([
        {
          title: 'Board 1',
          description: 'First board',
          user_id: userId
        },
        {
          title: 'Board 2',
          description: null,
          user_id: userId
        }
      ])
      .execute();

    const boards = await getUserBoards(userId);

    expect(boards).toHaveLength(2);
    expect(boards[0].title).toEqual('Board 1');
    expect(boards[0].description).toEqual('First board');
    expect(boards[0].user_id).toEqual(userId);
    expect(boards[0].id).toBeDefined();
    expect(boards[0].created_at).toBeInstanceOf(Date);
    expect(boards[0].updated_at).toBeInstanceOf(Date);

    expect(boards[1].title).toEqual('Board 2');
    expect(boards[1].description).toBeNull();
    expect(boards[1].user_id).toEqual(userId);
  });

  it('should return empty array when user has no boards', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const boards = await getUserBoards(userId);

    expect(boards).toHaveLength(0);
    expect(boards).toEqual([]);
  });

  it('should only return boards for the specified user', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        name: 'User 1'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        name: 'User 2'
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create boards for both users
    await db.insert(boardsTable)
      .values([
        {
          title: 'User 1 Board',
          description: 'Board for user 1',
          user_id: user1Id
        },
        {
          title: 'User 2 Board',
          description: 'Board for user 2',
          user_id: user2Id
        }
      ])
      .execute();

    const user1Boards = await getUserBoards(user1Id);
    const user2Boards = await getUserBoards(user2Id);

    expect(user1Boards).toHaveLength(1);
    expect(user1Boards[0].title).toEqual('User 1 Board');
    expect(user1Boards[0].user_id).toEqual(user1Id);

    expect(user2Boards).toHaveLength(1);
    expect(user2Boards[0].title).toEqual('User 2 Board');
    expect(user2Boards[0].user_id).toEqual(user2Id);
  });
});
