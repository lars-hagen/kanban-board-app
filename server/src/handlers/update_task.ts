
import { db } from '../db';
import { tasksTable, listsTable, boardsTable } from '../db/schema';
import { type UpdateTaskInput, type Task } from '../schema';
import { eq, and, gte, sql, max } from 'drizzle-orm';

export async function updateTask(input: UpdateTaskInput, userId: number): Promise<Task> {
  try {
    // First, verify the task exists and user owns it through list->board relationship
    const existingTask = await db.select({
      task: tasksTable,
      board_user_id: boardsTable.user_id
    })
    .from(tasksTable)
    .innerJoin(listsTable, eq(tasksTable.list_id, listsTable.id))
    .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
    .where(eq(tasksTable.id, input.id))
    .execute();

    if (existingTask.length === 0) {
      throw new Error('Task not found');
    }

    if (existingTask[0].board_user_id !== userId) {
      throw new Error('Unauthorized: Task not owned by user');
    }

    // If moving to a different list, verify the new list exists and is owned by the user
    let newListId = existingTask[0].task.list_id;
    if (input.list_id !== undefined && input.list_id !== existingTask[0].task.list_id) {
      const targetList = await db.select({
        list_id: listsTable.id,
        board_user_id: boardsTable.user_id
      })
      .from(listsTable)
      .innerJoin(boardsTable, eq(listsTable.board_id, boardsTable.id))
      .where(eq(listsTable.id, input.list_id))
      .execute();

      if (targetList.length === 0) {
        throw new Error('Target list not found');
      }

      if (targetList[0].board_user_id !== userId) {
        throw new Error('Unauthorized: Target list not owned by user');
      }

      newListId = input.list_id;
    }

    // Handle position updates
    let newPosition = existingTask[0].task.position;
    
    if (input.list_id !== undefined && input.list_id !== existingTask[0].task.list_id) {
      // Moving between lists - handle position recalculation
      if (input.position !== undefined) {
        // Moving to specific position in new list
        // Shift existing tasks in target list to make room
        await db.update(tasksTable)
          .set({ position: sql`${tasksTable.position} + 1` })
          .where(
            and(
              eq(tasksTable.list_id, input.list_id),
              gte(tasksTable.position, input.position)
            )
          )
          .execute();

        newPosition = input.position;
      } else {
        // Moving to end of new list - get the max position
        const maxPositionResult = await db.select({
          max_position: max(tasksTable.position)
        })
        .from(tasksTable)
        .where(eq(tasksTable.list_id, input.list_id))
        .execute();

        // Handle case where list is empty (max returns null)
        const maxPosition = maxPositionResult[0].max_position;
        newPosition = maxPosition !== null ? maxPosition + 1 : 0;
      }

      // Shift tasks in original list to fill the gap
      await db.update(tasksTable)
        .set({ position: sql`${tasksTable.position} - 1` })
        .where(
          and(
            eq(tasksTable.list_id, existingTask[0].task.list_id),
            gte(tasksTable.position, existingTask[0].task.position + 1)
          )
        )
        .execute();

    } else if (input.position !== undefined && input.position !== existingTask[0].task.position) {
      // Moving within the same list
      const oldPosition = existingTask[0].task.position;
      const targetPosition = input.position;

      if (targetPosition > oldPosition) {
        // Moving down - shift tasks between old and new position up
        await db.update(tasksTable)
          .set({ position: sql`${tasksTable.position} - 1` })
          .where(
            and(
              eq(tasksTable.list_id, existingTask[0].task.list_id),
              gte(tasksTable.position, oldPosition + 1),
              sql`${tasksTable.position} <= ${targetPosition}`
            )
          )
          .execute();
      } else {
        // Moving up - shift tasks between new and old position down
        await db.update(tasksTable)
          .set({ position: sql`${tasksTable.position} + 1` })
          .where(
            and(
              eq(tasksTable.list_id, existingTask[0].task.list_id),
              gte(tasksTable.position, targetPosition),
              sql`${tasksTable.position} < ${oldPosition}`
            )
          )
          .execute();
      }

      newPosition = targetPosition;
    }

    // Build update values
    const updateValues: Partial<typeof tasksTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateValues.title = input.title;
    }

    if (input.description !== undefined) {
      updateValues.description = input.description;
    }

    if (input.list_id !== undefined) {
      updateValues.list_id = newListId;
    }

    if (newPosition !== existingTask[0].task.position) {
      updateValues.position = newPosition;
    }

    // Update the task
    const result = await db.update(tasksTable)
      .set(updateValues)
      .where(eq(tasksTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task update failed:', error);
    throw error;
  }
}
