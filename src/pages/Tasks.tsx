import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  List, 
  Layout, 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn, safeDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import EditTaskModal from '../components/EditTaskModal';
import { storage, Task } from '../services/storage';

const PRIORITY_COLORS = {
  low: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  high: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
};

const STATUS_COLORS = {
  todo: 'bg-white/10 text-white/70 border border-white/10',
  in_progress: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  done: 'bg-green-500/20 text-green-300 border border-green-500/30',
};

const STATUS_LABELS = {
  todo: 'К исполнению',
  in_progress: 'В процессе',
  done: 'Готово',
};

export default function Tasks({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [view, setView] = useState<'list' | 'board' | 'calendar'>('board');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  // Edit Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form State
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee: 'AI Assistant',
    start_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const data = await storage.getTasks();
      setTasks(data);
    } catch (error: any) {
      console.error('Failed to load tasks', error);
      if (error.message === 'Failed to fetch') {
        addToast('Ошибка соединения с сервером', 'error');
      } else {
        addToast('Ошибка загрузки задач', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createdTask = await storage.addTask(newTask as Omit<Task, 'id' | 'created_at'>);
      setTasks([createdTask, ...tasks]);
      setIsAdding(false);
      setNewTask({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee: 'AI Assistant',
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
      });
      addToast('Задача создана', 'success');
    } catch (error) {
      addToast('Ошибка создания задачи', 'error');
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      // Optimistic update
      const updated = await storage.updateTask(id, updates);
      setTasks(prev => prev.map(t => t.id === id ? updated : t));
      addToast('Задача обновлена', 'success');
    } catch (error) {
      console.error('Update error:', error);
      loadTasks(); // Revert on error
      addToast('Ошибка обновления', 'error');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await storage.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      addToast('Задача удалена', 'success');
    } catch (error) {
      addToast('Ошибка удаления', 'error');
    }
  };


  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.assignee || '').toLowerCase().includes(search.toLowerCase())
    );
  }, [tasks, search]);

  // --- Views ---

  const ListView = () => (
    <div className="glass-card rounded-xl border border-white/10 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-white/10 bg-white/5 text-xs font-semibold text-white/50 uppercase tracking-wider">
            <div className="col-span-5">Задача</div>
            <div className="col-span-2">Исполнитель</div>
            <div className="col-span-2">Срок</div>
            <div className="col-span-1">Приоритет</div>
            <div className="col-span-1">Статус</div>
            <div className="col-span-1 text-right">Действия</div>
          </div>
          <div className="divide-y divide-white/5">
            {filteredTasks.map(task => (
              <div 
                key={task.id} 
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors cursor-pointer"
                onClick={() => openEditModal(task)}
              >
                <div className="col-span-5 font-medium text-white flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]", 
                    task.priority === 'high' ? 'bg-rose-500 text-rose-500' : 
                    task.priority === 'medium' ? 'bg-amber-500 text-amber-500' : 'bg-emerald-500 text-emerald-500'
                  )} />
                  {task.title}
                </div>
                <div className="col-span-2 text-sm text-white/70 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-bold border border-white/10">
                    {(task.assignee || '?').charAt(0)}
                  </div>
                  {task.assignee || 'Unassigned'}
                </div>
                <div className="col-span-2 text-sm text-white/50">
                  {format(safeDate(task.due_date), 'd MMM', { locale: ru })}
                </div>
                <div className="col-span-1">
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium border", PRIORITY_COLORS[task.priority])}>
                    {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                  </span>
                </div>
                <div className="col-span-1">
                  <span 
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextStatus = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
                      handleUpdateTask(task.id, { status: nextStatus });
                    }}
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 border",
                      STATUS_COLORS[task.status]
                    )}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                </div>
                <div className="col-span-1 text-right">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} 
                    className="text-white/40 hover:text-red-400 p-1 rounded-md hover:bg-white/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const BoardView = () => (
    <div className="flex md:grid md:grid-cols-3 gap-6 h-full overflow-x-auto pb-4 snap-x snap-mandatory md:snap-none">
      {(['todo', 'in_progress', 'done'] as const).map(status => (
        <div key={status} className="flex flex-col h-full min-w-[85vw] md:min-w-[300px] snap-center">
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="font-semibold text-white/80 flex items-center gap-2 font-serif">
              <span className={cn("w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]", 
                status === 'todo' ? 'bg-white/40 text-white/40' : 
                status === 'in_progress' ? 'bg-blue-500 text-blue-500' : 'bg-green-500 text-green-500'
              )} />
              {STATUS_LABELS[status]}
              <span className="ml-2 text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded-full border border-white/5">
                {filteredTasks.filter(t => t.status === status).length}
              </span>
            </h3>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white" onClick={() => {
              setNewTask({ ...newTask, status });
              setIsAdding(true);
            }}>
              <Plus size={14} />
            </Button>
          </div>
          
          <div className="flex-1 bg-white/5 rounded-xl p-2 space-y-3 overflow-y-auto custom-scrollbar border border-white/5">
            {filteredTasks.filter(t => t.status === status).map(task => (
              <motion.div
                key={task.id}
                layoutId={task.id}
                onClick={() => openEditModal(task)}
                className="glass-card p-4 rounded-lg shadow-sm border border-white/10 hover:bg-white/10 transition-all cursor-pointer group relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-white line-clamp-2">{task.title}</h4>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} 
                    className="opacity-100 md:opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 transition-opacity p-1 hover:bg-white/10 rounded"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border", PRIORITY_COLORS[task.priority])}>
                    {task.priority}
                  </span>
                  {new Date(task.due_date) < new Date() && task.status !== 'done' && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                      <AlertCircle size={10} /> Просрочено
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-white/50 mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-[10px] border border-white/10">
                      {(task.assignee || '?').charAt(0)}
                    </div>
                    {task.assignee || 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {format(safeDate(task.due_date), 'd MMM', { locale: ru })}
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="mt-3 flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                  {status !== 'todo' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleUpdateTask(task.id, { status: 'todo' }); }}
                      className="text-[10px] bg-zinc-100 hover:bg-zinc-200 px-2 py-1 rounded text-zinc-600"
                    >
                      ← To Do
                    </button>
                  )}
                  {status !== 'in_progress' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleUpdateTask(task.id, { status: 'in_progress' }); }}
                      className="text-[10px] bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded text-blue-600"
                    >
                      In Progress
                    </button>
                  )}
                  {status !== 'done' && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleUpdateTask(task.id, { status: 'done' }); }}
                      className="text-[10px] bg-green-50 hover:bg-green-100 px-2 py-1 rounded text-green-600"
                    >
                      Done →
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
            <Button 
              variant="ghost" 
              className="w-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/50 border border-dashed border-zinc-300"
              onClick={() => {
                setNewTask({ ...newTask, status });
                setIsAdding(true);
              }}
            >
              <Plus size={14} className="mr-2" /> Добавить задачу
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    
    const days = useMemo(() => {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end });
    }, [currentDate]);

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    return (
      <div className="bg-white text-zinc-900 rounded-xl overflow-hidden border border-zinc-200 h-full flex flex-col shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-zinc-100">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold capitalize text-zinc-900">
              {format(currentDate, 'MMMM yyyy', { locale: ru })}
            </h2>
            <div className="flex gap-1">
              <button onClick={prevMonth} className="p-1 hover:bg-zinc-100 rounded text-zinc-600"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentDate(new Date())} className="text-xs px-2 py-1 hover:bg-zinc-100 rounded text-zinc-600 font-medium">Сегодня</button>
              <button onClick={nextMonth} className="p-1 hover:bg-zinc-100 rounded text-zinc-600"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50">
          {['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'].map(day => (
            <div key={day} className="p-2 text-xs font-semibold text-zinc-400 text-center uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-white overflow-y-auto">
          {days.map(day => {
            const dayTasks = filteredTasks.filter(t => 
              isWithinInterval(day, {
                start: parseISO(t.start_date),
                end: parseISO(t.due_date)
              })
            );

            return (
              <div 
                key={day.toString()} 
                className={cn(
                  "min-h-[100px] p-2 border-r border-b border-zinc-100 relative group transition-colors hover:bg-zinc-50",
                  !isSameDay(day, new Date()) && "text-zinc-400"
                )}
                onClick={() => {
                  setNewTask({ ...newTask, start_date: format(day, 'yyyy-MM-dd'), due_date: format(day, 'yyyy-MM-dd') });
                  setIsAdding(true);
                }}
              >
                <div className={cn(
                  "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday(day) ? "bg-indigo-600 text-white" : "text-zinc-500"
                )}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayTasks.map(task => (
                    <div 
                      key={task.id}
                      onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer flex items-center gap-1 border transition-all hover:shadow-sm",
                        task.priority === 'high' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        task.priority === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                        'bg-emerald-50 text-emerald-700 border-emerald-100'
                      )}
                    >
                      {task.status === 'done' && <CheckCircle2 size={8} />}
                      {task.title}
                    </div>
                  ))}
                </div>
                
                <button className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-indigo-600 transition-opacity">
                  <Plus size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-wide text-white text-glow">Задачи</h1>
          <p className="text-white/60">Планирование и управление проектами</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-lg border border-white/10 shadow-sm backdrop-blur-sm">
          <button
            onClick={() => setView('board')}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
              view === 'board' ? "bg-white text-black shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <Layout size={16} /> Доска
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
              view === 'list' ? "bg-white text-black shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <List size={16} /> Список
          </button>
          <button
            onClick={() => setView('calendar')}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2",
              view === 'calendar' ? "bg-white text-black shadow-sm" : "text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <CalendarIcon size={16} /> Календарь
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
            <Input 
              placeholder="Поиск задач..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <Button onClick={() => setIsAdding(true)} className="bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            <Plus className="mr-2 h-4 w-4" /> Новая задача
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {view === 'list' && <ListView />}
            {view === 'board' && <BoardView />}
            {view === 'calendar' && <CalendarView />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
                <h3 className="text-lg font-serif font-bold text-white">Новая задача</h3>
                <button onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddTask} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Название</label>
                  <Input
                    placeholder="Название задачи"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                    className="text-lg font-semibold bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Описание</label>
                  <textarea
                    placeholder="Описание..."
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full min-h-[100px] rounded-xl border border-white/10 p-3 text-sm bg-zinc-900/50 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-transparent transition-all resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Статус</label>
                    <select
                      value={newTask.status}
                      onChange={(e) => setNewTask({ ...newTask, status: e.target.value as any })}
                      className="w-full rounded-xl border border-white/10 p-2.5 text-sm bg-zinc-900 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none transition-shadow"
                    >
                      <option value="todo">К исполнению</option>
                      <option value="in_progress">В процессе</option>
                      <option value="done">Готово</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Приоритет</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full rounded-xl border border-white/10 p-2.5 text-sm bg-zinc-900 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none transition-shadow"
                    >
                      <option value="low">Низкий</option>
                      <option value="medium">Средний</option>
                      <option value="high">Высокий</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Начало</label>
                    <Input
                      type="date"
                      value={newTask.start_date}
                      onChange={(e) => setNewTask({ ...newTask, start_date: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Срок</label>
                    <Input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Исполнитель</label>
                  <Input
                    value={newTask.assignee}
                    onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                    placeholder="Имя исполнителя"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-4 shrink-0">
                  <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="text-white/60 hover:text-white hover:bg-white/10">
                    Отмена
                  </Button>
                  <Button type="submit" className="bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    Создать задачу
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Task Modal */}
      <EditTaskModal
        task={selectedTask}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
}
