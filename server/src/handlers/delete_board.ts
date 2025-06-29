
import { db } from '../db';
import { boardsTable } from '../db/schema';
import { type Board } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteBoard(boardId: number, userId: number): Promise<Board> {
  try {
    // First, verify the board exists and belongs to the user
    const existingBoard = await db.select()
      .from(boardsTable)
      .where(and(eq(boardsTable.id, boardId), eq(boardsTable.user_id, userId)))
      .execute();

    if (existingBoard.length === 0) {
      throw new Error('Board not found or not owned by user');
    }

    // Delete the board (cascade will handle lists/tasks)
    const result = await db.delete(boardsTable)
      .where(and(eq(boardsTable.id, boardId), eq(boardsTable.user_id, userId)))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to delete board');
    }

    return result[0];
  } catch (error) {
    console.error('Board deletion failed:', error);
    throw error;
  }
}
