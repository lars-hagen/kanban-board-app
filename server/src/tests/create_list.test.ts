
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, boardsTable, listsTable } from '../db/schema';
import { type CreateListInput } from '../schema';
import { createList } from '../handlers/create_list';
import { eq } from 'drizzle-orm';

describe('createList', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testBoardId: number;
  let otherUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create another user for authorization tests
    const otherUserResult = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashed_password',
        name: 'Other User'
      })
      .returning()
      .execute();
    otherUserId = otherUserResult[0].id;

    // Create test board
    const boardResult = await db.insert(boardsTable)
      .values({
        title: 'Test Board',
        description: 'A board for testing',
        user_id: testUserId
      })
      .returning()
      .execute();
    testBoardId = boardResult[0].id;
  });

  it('should create a list successfully', async () => {
    const input: CreateListInput = {
      title: 'Test List',
      board_id: testBoardId
    };

    const result = await createList(input, testUserId);

    expect(result.title).toEqual('Test List');
    expect(result.board_id).toEqual(testBoardId);
    expect(result.position).toEqual(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save list to database', async () => {
    const input: CreateListInput = {
      title: 'Test List',
      board_id: testBoardId
    };

    const result = await createList(input, testUserId);

    const lists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.id, result.id))
      .execute();

    expect(lists).toHaveLength(1);
    expect(lists[0].title).toEqual('Test List');
    expect(lists[0].board_id).toEqual(testBoardId);
    expect(lists[0].position).toEqual(0);
  });

  it('should assign correct position when multiple lists exist', async () => {
    // Create first list
    const firstInput: CreateListInput = {
      title: 'First List',
      board_id: testBoardId
    };
    const firstList = await createList(firstInput, testUserId);
    expect(firstList.position).toEqual(0);

    // Create second list
    const secondInput: CreateListInput = {
      title: 'Second List',
      board_id: testBoardId
    };
    const secondList = await createList(secondInput, testUserId);
    expect(secondList.position).toEqual(1);

    // Create third list
    const thirdInput: CreateListInput = {
      title: 'Third List',
      board_id: testBoardId
    };
    const thirdList = await createList(thirdInput, testUserId);
    expect(thirdList.position).toEqual(2);
  });

  it('should throw error for non-existent board', async () => {
    const input: CreateListInput = {
      title: 'Test List',
      board_id: 999999 // Non-existent board ID
    };

    expect(createList(input, testUserId)).rejects.toThrow(/board not found/i);
  });

  it('should throw error when user does not own the board', async () => {
    const input: CreateListInput = {
      title: 'Test List',
      board_id: testBoardId
    };

    expect(createList(input, otherUserId)).rejects.toThrow(/unauthorized.*board does not belong to user/i);
  });

  it('should handle position calculation for different boards separately', async () => {
    // Create another board for the same user
    const secondBoardResult = await db.insert(boardsTable)
      .values({
        title: 'Second Board',
        description: 'Another board for testing',
        user_id: testUserId
      })
      .returning()
      .execute();
    const secondBoardId = secondBoardResult[0].id;

    // Create list in first board
    const firstBoardInput: CreateListInput = {
      title: 'First Board List',
      board_id: testBoardId
    };
    const firstBoardList = await createList(firstBoardInput, testUserId);
    expect(firstBoardList.position).toEqual(0);

    // Create list in second board - should also start at position 0
    const secondBoardInput: CreateListInput = {
      title: 'Second Board List',
      board_id: secondBoardId
    };
    const secondBoardList = await createList(secondBoardInput, testUserId);
    expect(secondBoardList.position).toEqual(0);

    // Create another list in first board - should be position 1
    const anotherFirstBoardInput: CreateListInput = {
      title: 'Another First Board List',
      board_id: testBoardId
    };
    const anotherFirstBoardList = await createList(anotherFirstBoardInput, testUserId);
    expect(anotherFirstBoardList.position).toEqual(1);
  });
});
