
import { db } from '../db';
import { boardsTable } from '../db/schema';
import { type CreateBoardInput, type Board } from '../schema';

export async function createBoard(input: CreateBoardInput, userId: number): Promise<Board> {
  try {
    // Insert board record
    const result = await db.insert(boardsTable)
      .values({
        title: input.title,
        description: input.description,
        user_id: userId
      })
      .returning()
      .execute();

    // Return the created board
    const board = result[0];
    return board;
  } catch (error) {
    console.error('Board creation failed:', error);
    throw error;
  }
}
