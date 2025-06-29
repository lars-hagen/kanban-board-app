
import { db } from '../db';
import { boardsTable } from '../db/schema';
import { type UpdateBoardInput, type Board } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateBoard = async (input: UpdateBoardInput, userId: number): Promise<Board> => {
  try {
    // First verify the board exists and is owned by the user
    const existingBoard = await db.select()
      .from(boardsTable)
      .where(and(
        eq(boardsTable.id, input.id),
        eq(boardsTable.user_id, userId)
      ))
      .execute();

    if (existingBoard.length === 0) {
      throw new Error('Board not found or access denied');
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof boardsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    // Update the board
    const result = await db.update(boardsTable)
      .set(updateData)
      .where(and(
        eq(boardsTable.id, input.id),
        eq(boardsTable.user_id, userId)
      ))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Board update failed');
    }

    return result[0];
  } catch (error) {
    console.error('Board update failed:', error);
    throw error;
  }
};
