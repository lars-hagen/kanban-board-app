
import { db } from '../db';
import { boardsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Board } from '../schema';

export async function getUserBoards(userId: number): Promise<Board[]> {
  try {
    const results = await db.select()
      .from(boardsTable)
      .where(eq(boardsTable.user_id, userId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get user boards:', error);
    throw error;
  }
}
