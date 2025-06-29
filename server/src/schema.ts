
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  name: z.string(),
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Board schema
export const boardSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  user_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Board = z.infer<typeof boardSchema>;

// List schema
export const listSchema = z.object({
  id: z.number(),
  title: z.string(),
  board_id: z.number(),
  position: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type List = z.infer<typeof listSchema>;

// Task schema
export const taskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  list_id: z.number(),
  position: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const createBoardInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable()
});

export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;

export const createListInputSchema = z.object({
  title: z.string().min(1),
  board_id: z.number()
});

export type CreateListInput = z.infer<typeof createListInputSchema>;

export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  list_id: z.number()
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

// Input schemas for updating entities
export const updateBoardInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional()
});

export type UpdateBoardInput = z.infer<typeof updateBoardInputSchema>;

export const updateListInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  position: z.number().int().optional()
});

export type UpdateListInput = z.infer<typeof updateListInputSchema>;

export const updateTaskInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  list_id: z.number().optional(),
  position: z.number().int().optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Response schemas
export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const boardWithListsSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  user_id: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  lists: z.array(listSchema)
});

export type BoardWithLists = z.infer<typeof boardWithListsSchema>;

export const listWithTasksSchema = z.object({
  id: z.number(),
  title: z.string(),
  board_id: z.number(),
  position: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  tasks: z.array(taskSchema)
});

export type ListWithTasks = z.infer<typeof listWithTasksSchema>;
