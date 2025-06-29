
import { db } from '../db';
import { listsTable, tasksTable, boardsTable } from '../db/schema';
import { type ListWithTasks } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getListWithTasks(listId: number, userId: number): Promise<ListWithTasks | null> {
  try {
    // First, get the list and verify ownership through board
    const listResults = await db.select()
      .from(listsTable)
      .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
      .where(eq(listsTable.id, listId))
      .execute();

    if (listResults.length === 0) {
      return null;
    }

    const listData = listResults[0].lists;
    const boardData = listResults[0].boards;

    // Verify ownership
    if (boardData.user_id !== userId) {
      return null;
    }

    // Get tasks for this list, ordered by position
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.list_id, listId))
      .orderBy(asc(tasksTable.position))
      .execute();

    return {
      id: listData.id,
      title: listData.title,
      board_id: listData.board_id,
      position: listData.position,
      created_at: listData.created_at,
      updated_at: listData.updated_at,
      tasks: tasks
    };
  } catch (error) {
    console.error('Get list with tasks failed:', error);
    throw error;
  }
}
