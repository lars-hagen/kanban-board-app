
import { db } from '../db';
import { boardsTable, listsTable } from '../db/schema';
import { type List } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteList(listId: number, userId: number): Promise<List> {
  try {
    // First verify the list exists and user owns the board
    const listWithBoard = await db.select({
      list: listsTable,
      board_user_id: boardsTable.user_id
    })
    .from(listsTable)
    .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
    .where(eq(listsTable.id, listId))
    .execute();

    if (listWithBoard.length === 0) {
      throw new Error('List not found');
    }

    const { list, board_user_id } = listWithBoard[0];

    // Verify ownership
    if (board_user_id !== userId) {
      throw new Error('Not authorized to delete this list');
    }

    // Delete the list (cascade will handle tasks)
    const deletedList = await db.delete(listsTable)
      .where(eq(listsTable.id, listId))
      .returning()
      .execute();

    if (deletedList.length === 0) {
      throw new Error('Failed to delete list');
    }

    return deletedList[0];
  } catch (error) {
    console.error('List deletion failed:', error);
    throw error;
  }
}
