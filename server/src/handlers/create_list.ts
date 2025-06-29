
import { db } from '../db';
import { boardsTable, listsTable } from '../db/schema';
import { type CreateListInput, type List } from '../schema';
import { eq, max } from 'drizzle-orm';

export async function createList(input: CreateListInput, userId: number): Promise<List> {
  try {
    // First, verify the board exists and belongs to the authenticated user
    const boards = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.id, input.board_id))
      .limit(1)
      .execute();

    if (boards.length === 0) {
      throw new Error('Board not found');
    }

    const board = boards[0];
    if (board.user_id !== userId) {
      throw new Error('Unauthorized: Board does not belong to user');
    }

    // Get the next position by finding the maximum position in the board
    const maxPositionResult = await db.select({ 
      maxPosition: max(listsTable.position) 
    })
      .from(listsTable)
      .where(eq(listsTable.board_id, input.board_id))
      .execute();

    const nextPosition = (maxPositionResult[0]?.maxPosition ?? -1) + 1;

    // Create the list
    const result = await db.insert(listsTable)
      .values({
        title: input.title,
        board_id: input.board_id,
        position: nextPosition
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('List creation failed:', error);
    throw error;
  }
}
