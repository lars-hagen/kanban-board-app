
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { trpc } from '@/utils/trpc';
import type { Board, CreateBoardInput, BoardWithLists, ListWithTasks, CreateListInput, CreateTaskInput, Task } from '../../server/src/schema';

function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<BoardWithLists | null>(null);
  const [lists, setLists] = useState<ListWithTasks[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<'boards' | 'kanban'>('boards');

  // Form states
  const [boardForm, setBoardForm] = useState<CreateBoardInput>({
    title: '',
    description: null
  });
  const [listForm, setListForm] = useState<CreateListInput>({
    title: '',
    board_id: 0
  });
  const [taskForm, setTaskForm] = useState<CreateTaskInput>({
    title: '',
    description: null,
    list_id: 0
  });

  // Dialog states
  const [showBoardDialog, setShowBoardDialog] = useState(false);
  const [showListDialog, setShowListDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  const loadBoards = useCallback(async () => {
    try {
      const result = await trpc.getUserBoards.query();
      setBoards(result);
    } catch (error) {
      console.error('Failed to load boards:', error);
    }
  }, []);

  const loadBoardWithLists = useCallback(async (boardId: number) => {
    try {
      setIsLoading(true);
      const board = await trpc.getBoardWithLists.query({ boardId });
      if (board) {
        setCurrentBoard(board);
        // Load each list with its tasks
        const listsWithTasks = await Promise.all(
          board.lists.map(async (list) => {
            const listWithTasks = await trpc.getListWithTasks.query({ listId: list.id });
            return listWithTasks || { ...list, tasks: [] };
          })
        );
        setLists(listsWithTasks);
        setView('kanban');
      }
    } catch (error) {
      console.error('Failed to load board:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newBoard = await trpc.createBoard.mutate(boardForm);
      setBoards((prev: Board[]) => [...prev, newBoard]);
      setBoardForm({ title: '', description: null });
      setShowBoardDialog(false);
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBoard) return;
    
    setIsLoading(true);
    try {
      const newList = await trpc.createList.mutate({
        ...listForm,
        board_id: currentBoard.id
      });
      // Add the new list to the current board's lists
      const listWithTasks: ListWithTasks = { ...newList, tasks: [] };
      setLists((prev: ListWithTasks[]) => [...prev, listWithTasks]);
      setListForm({ title: '', board_id: 0 });
      setShowListDialog(false);
    } catch (error) {
      console.error('Failed to create list:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newTask = await trpc.createTask.mutate(taskForm);
      // Add task to the appropriate list
      setLists((prev: ListWithTasks[]) => 
        prev.map((list: ListWithTasks) => 
          list.id === taskForm.list_id 
            ? { ...list, tasks: [...list.tasks, newTask] }
            : list
        )
      );
      setTaskForm({ title: '', description: null, list_id: 0 });
      setShowTaskDialog(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: number, listId: number) => {
    try {
      await trpc.deleteTask.mutate({ taskId });
      setLists((prev: ListWithTasks[]) => 
        prev.map((list: ListWithTasks) => 
          list.id === listId 
            ? { ...list, tasks: list.tasks.filter((task: Task) => task.id !== taskId) }
            : list
        )
      );
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleDeleteList = async (listId: number) => {
    try {
      await trpc.deleteList.mutate({ listId });
      setLists((prev: ListWithTasks[]) => prev.filter((list: ListWithTasks) => list.id !== listId));
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };

  const handleDeleteBoard = async (boardId: number) => {
    try {
      await trpc.deleteBoard.mutate({ boardId });
      setBoards((prev: Board[]) => prev.filter((board: Board) => board.id !== boardId));
      if (currentBoard && currentBoard.id === boardId) {
        setCurrentBoard(null);
        setLists([]);
        setView('boards');
      }
    } catch (error) {
      console.error('Failed to delete board:', error);
    }
  };

  if (view === 'boards') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📋 My Kanban Boards</h1>
              <p className="text-gray-600 mt-2">Organize your projects and tasks efficiently</p>
            </div>
            
            <Dialog open={showBoardDialog} onOpenChange={setShowBoardDialog}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Board
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Board</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateBoard} className="space-y-4">
                  <Input
                    placeholder="Board title"
                    value={boardForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setBoardForm((prev: CreateBoardInput) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                  <Textarea
                    placeholder="Board description (optional)"
                    value={boardForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setBoardForm((prev: CreateBoardInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                  />
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Creating...' : 'Create Board'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {boards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No boards yet</h2>
              <p className="text-gray-500 mb-6">Create your first board to start organizing your tasks</p>
              <Button onClick={() => setShowBoardDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Board
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {boards.map((board: Board) => (
                <Card key={board.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {board.title}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => loadBoardWithLists(board.id)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Open Board
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteBoard(board.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Board
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {board.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{board.description}</p>
                    )}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Created {board.created_at.toLocaleDateString()}</span>
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700">
                        Personal
                      </Badge>
                    </div>
                  </CardContent>
                  <div 
                    className="absolute inset-0 bg-transparent"
                    onClick={() => loadBoardWithLists(board.id)}
                  />
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-4 py-3">
        <div className="max-w-full mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setView('boards')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Boards
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {currentBoard?.title || 'Kanban Board'}
              </h1>
              {currentBoard?.description && (
                <p className="text-sm text-gray-600">{currentBoard.description}</p>
              )}
            </div>
          </div>
          
          <Dialog open={showListDialog} onOpenChange={setShowListDialog}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-sm">
                <Plus className="w-4 h-4 mr-2" />
                Add List
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New List</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateList} className="space-y-4">
                <Input
                  placeholder="List title (e.g., To Do, In Progress, Done)"
                  value={listForm.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setListForm((prev: CreateListInput) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? 'Creating...' : 'Create List'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="p-4 overflow-x-auto">
        <div className="min-w-max">
          {isLoading && lists.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading board...</p>
              </div>
            </div>
          ) : lists.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No lists yet</h2>
              <p className="text-gray-500 mb-6">Add your first list to start organizing tasks</p>
              <Button onClick={() => setShowListDialog(true)} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First List
              </Button>
            </div>
          ) : (
            <div className="flex gap-6 pb-4" style={{ minWidth: 'max-content' }}>
              {lists.map((list: ListWithTasks) => (
                <div key={list.id} className="flex-shrink-0 w-80">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {list.title}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {list.tasks.length}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setTaskForm((prev: CreateTaskInput) => ({ ...prev, list_id: list.id }));
                                  setShowTaskDialog(true);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Task
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteList(list.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete List
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                      {list.tasks.map((task: Task) => (
                        <Card key={task.id} className="p-3 bg-white border hover:shadow-md transition-shadow group">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                                {task.title}
                              </h4>
                              {task.description && (
                                <p className="text-xs text-gray-600 line-clamp-3 mb-2">
                                  {task.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400">
                                {task.created_at.toLocaleDateString()}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteTask(task.id, list.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                      
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-500 hover:text-gray-700 border-2 border-dashed border-gray-200 hover:border-gray-300"
                        onClick={() => {
                          setTaskForm((prev: CreateTaskInput) => ({ ...prev, list_id: list.id }));
                          setShowTaskDialog(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add a task
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task Creation Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            <Input
              placeholder="Task title"
              value={taskForm.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTaskForm((prev: CreateTaskInput) => ({ ...prev, title: e.target.value }))
              }
              required
            />
            <Textarea
              placeholder="Task description (optional)"
              value={taskForm.description || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setTaskForm((prev: CreateTaskInput) => ({
                  ...prev,
                  description: e.target.value || null
                }))
              }
            />
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Creating...' : 'Create Task'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
