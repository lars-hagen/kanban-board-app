
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema, 
  loginInputSchema,
  createBoardInputSchema,
  updateBoardInputSchema,
  createListInputSchema,
  updateListInputSchema,
  createTaskInputSchema,
  updateTaskInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { loginUser } from './handlers/login_user';
import { createBoard } from './handlers/create_board';
import { getUserBoards } from './handlers/get_user_boards';
import { getBoardWithLists } from './handlers/get_board_with_lists';
import { updateBoard } from './handlers/update_board';
import { deleteBoard } from './handlers/delete_board';
import { createList } from './handlers/create_list';
import { getListWithTasks } from './handlers/get_list_with_tasks';
import { updateList } from './handlers/update_list';
import { deleteList } from './handlers/delete_list';
import { createTask } from './handlers/create_task';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  register: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => loginUser(input)),

  // Board routes
  createBoard: publicProcedure
    .input(createBoardInputSchema)
    .mutation(({ input }) => createBoard(input, 1)), // TODO: Get userId from context

  getUserBoards: publicProcedure
    .query(() => getUserBoards(1)), // TODO: Get userId from context

  getBoardWithLists: publicProcedure
    .input(z.object({ boardId: z.number() }))
    .query(({ input }) => getBoardWithLists(input.boardId, 1)), // TODO: Get userId from context

  updateBoard: publicProcedure
    .input(updateBoardInputSchema)
    .mutation(({ input }) => updateBoard(input, 1)), // TODO: Get userId from context

  deleteBoard: publicProcedure
    .input(z.object({ boardId: z.number() }))
    .mutation(({ input }) => deleteBoard(input.boardId, 1)), // TODO: Get userId from context

  // List routes
  createList: publicProcedure
    .input(createListInputSchema)
    .mutation(({ input }) => createList(input, 1)), // TODO: Get userId from context

  getListWithTasks: publicProcedure
    .input(z.object({ listId: z.number() }))
    .query(({ input }) => getListWithTasks(input.listId, 1)), // TODO: Get userId from context

  updateList: publicProcedure
    .input(updateListInputSchema)
    .mutation(({ input }) => updateList(input, 1)), // TODO: Get userId from context

  deleteList: publicProcedure
    .input(z.object({ listId: z.number() }))
    .mutation(({ input }) => deleteList(input.listId, 1)), // TODO: Get userId from context

  // Task routes
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input }) => createTask(input, 1)), // TODO: Get userId from context

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input }) => updateTask(input, 1)), // TODO: Get userId from context

  deleteTask: publicProcedure
    .input(z.object({ taskId: z.number() }))
    .mutation(({ input }) => deleteTask(input.taskId, 1)), // TODO: Get userId from context
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
