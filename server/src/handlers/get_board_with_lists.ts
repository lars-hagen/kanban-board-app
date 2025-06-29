
import { db } from '../db';
import { boardsTable, listsTable } from '../db/schema';
import { type BoardWithLists } from '../schema';
import { eq, and, asc } from 'drizzle-orm';

export async function getBoardWithLists(boardId: number, userId: number): Promise<BoardWithLists | null> {
  try {
    // First, verify the board exists and belongs to the user
    const boards = await db.select()
      .from(boardsTable)
      .where(and(
        eq(boardsTable.id, boardId),
        eq(boardsTable.user_id, userId)
      ))
      .execute();

    if (boards.length === 0) {
      return null;
    }

    const board = boards[0];

    // Get the lists for this board, ordered by position
    const lists = await db.select()
      .from(listsTable)
      .where(eq(listsTable.board_id, boardId))
      .orderBy(asc(listsTable.position))
      .execute();

    // Return the board with its lists
    return {
      id: board.id,
      title: board.title,
      description: board.description,
      user_id: board.user_id,
      created_at: board.created_at,
      updated_at: board.updated_at,
      lists: lists
    };
  } catch (error) {
    console.error('Get board with lists failed:', error);
    throw error;
  }
}
