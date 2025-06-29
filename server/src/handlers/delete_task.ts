
import { db } from '../db';
import { tasksTable, listsTable, boardsTable } from '../db/schema';
import { type Task } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function deleteTask(taskId: number, userId: number): Promise<Task> {
  try {
    // First, verify the user owns the task through the board ownership chain
    const taskWithOwnership = await db.select({
      id: tasksTable.id,
      title: tasksTable.title,
      description: tasksTable.description,
      list_id: tasksTable.list_id,
      position: tasksTable.position,
      created_at: tasksTable.created_at,
      updated_at: tasksTable.updated_at,
      user_id: boardsTable.user_id
    })
    .from(tasksTable)
    .innerJoin(listsTable, eq(tasksTable.list_id, listsTable.id))
    .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
    .where(eq(tasksTable.id, taskId))
    .execute();

    if (taskWithOwnership.length === 0) {
      throw new Error('Task not found');
    }

    const task = taskWithOwnership[0];
    
    if (task.user_id !== userId) {
      throw new Error('Unauthorized: You can only delete your own tasks');
    }

    // Delete the task
    const deletedTasks = await db.delete(tasksTable)
      .where(eq(tasksTable.id, taskId))
      .returning()
      .execute();

    if (deletedTasks.length === 0) {
      throw new Error('Failed to delete task');
    }

    return deletedTasks[0];
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
}
