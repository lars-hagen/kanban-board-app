
import { db } from '../db';
import { listsTable, boardsTable } from '../db/schema';
import { type UpdateListInput, type List } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateList(input: UpdateListInput, userId: number): Promise<List> {
  try {
    // First verify that the list exists and the user owns the board
    const existingList = await db.select({
      list: listsTable,
      board: boardsTable
    })
    .from(listsTable)
    .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
    .where(eq(listsTable.id, input.id))
    .execute();

    if (existingList.length === 0) {
      throw new Error('List not found');
    }

    if (existingList[0].board.user_id !== userId) {
      throw new Error('Access denied');
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof listsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateData.title = input.title;
    }

    if (input.position !== undefined) {
      updateData.position = input.position;
    }

    // Update the list
    const result = await db.update(listsTable)
      .set(updateData)
      .where(eq(listsTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('List update failed:', error);
    throw error;
  }
}
