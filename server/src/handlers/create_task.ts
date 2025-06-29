
import { db } from '../db';
import { tasksTable, listsTable, boardsTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';
import { eq, desc, and } from 'drizzle-orm';

export async function createTask(input: CreateTaskInput, userId: number): Promise<Task> {
  try {
    // First verify that the list exists and is owned by the user
    const listWithBoard = await db.select({
      list_id: listsTable.id,
      board_user_id: boardsTable.user_id
    })
    .from(listsTable)
    .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
    .where(eq(listsTable.id, input.list_id))
    .execute();

    if (listWithBoard.length === 0) {
      throw new Error('List not found');
    }

    if (listWithBoard[0].board_user_id !== userId) {
      throw new Error('Unauthorized: List does not belong to user');
    }

    // Get the highest position in this list to calculate next position
    const lastTask = await db.select({
      position: tasksTable.position
    })
    .from(tasksTable)
    .where(eq(tasksTable.list_id, input.list_id))
    .orderBy(desc(tasksTable.position))
    .limit(1)
    .execute();

    const nextPosition = lastTask.length > 0 ? lastTask[0].position + 1 : 0;

    // Create the task
    const result = await db.insert(tasksTable)
      .values({
        title: input.title,
        description: input.description,
        list_id: input.list_id,
        position: nextPosition
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
}
