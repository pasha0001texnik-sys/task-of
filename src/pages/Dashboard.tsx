import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, CheckSquare, Clock, 
  FileText, Cloud, DollarSign, ArrowRight,
  Calendar as CalendarIcon, Bell, Plus, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { storage } from '../services/storage';

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [stats, setStats] = useState({
    tasksCount: 0,
    notesCount: 0,
    filesCount: 0,
    income: 0,
    expense: 0
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const { addToast } = useToast();

  const loadData = async () => {
    try {
      // Fetch Data from Storage
      const tasks = await storage.getTasks();
      const pendingTasks = tasks.filter((t) => t.status !== 'done');
      
      const notes = await storage.getNotes();
      const files = await storage.getAllFiles();
      const transactions = await storage.getTransactions();
      
      // Calculate Stats
      const income = transactions
        .filter((t) => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);
        
      const expense = transactions
        .filter((t) => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

      setStats({
        tasksCount: pendingTasks.length,
        notesCount: notes.length,
        filesCount: files.length,
        income,
        expense
      });

      setRecentTasks(pendingTasks.slice(0, 5));
      setRecentNotes(notes.slice(0, 5));
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      if (error.message === 'Failed to fetch') {
        addToast('Ошибка соединения с сервером', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    try {
      await storage.addTask({
        title: quickTaskTitle,
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee: 'Me',
        start_date: new Date().toISOString().split('T')[0],
        due_date: new Date().toISOString().split('T')[0],
      });

      setQuickTaskTitle('');
      addToast('Задача добавлена', 'success');
      loadData(); // Refresh data
    } catch (error) {
      addToast('Ошибка создания задачи', 'error');
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-wide text-white text-glow">
            Добро пожаловать обратно! 👋
          </h1>
          <p className="text-white/60 mt-1">
            Вот обзор вашей продуктивности на сегодня, {format(new Date(), 'd MMMM yyyy', { locale: ru })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 border-white/20 text-white hover:bg-white/10">
            <Bell size={16} />
            Уведомления
          </Button>
          <Button onClick={() => onNavigate('tasks')} className="bg-white text-black hover:bg-white/90 gap-2 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            <CheckSquare size={16} />
            Мои задачи
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('tasks')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Активные задачи</p>
                <h3 className="text-2xl font-serif font-bold text-white mt-1 text-glow">{stats.tasksCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                <CheckSquare size={20} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('notes')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Заметки</p>
                <h3 className="text-2xl font-serif font-bold text-white mt-1 text-glow">{stats.notesCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                <FileText size={20} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('finance')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Прибыль</p>
                <h3 className={cn("text-2xl font-serif font-bold mt-1 text-glow", (stats.income - stats.expense) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  ${(stats.income - stats.expense).toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <DollarSign size={20} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onNavigate('cloud')}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/60">Файлы</p>
                <h3 className="text-2xl font-serif font-bold text-white mt-1 text-glow">{stats.filesCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                <Cloud size={20} />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Tasks & Finance Preview */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tasks Preview */}
          <motion.div variants={item}>
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Приоритетные задачи</CardTitle>
                  <CardDescription>Что нужно сделать в первую очередь</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('tasks')} className="text-white/60 hover:text-white">
                  Все задачи <ArrowRight size={16} className="ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {recentTasks.length > 0 ? (
                  <div className="space-y-3">
                    {recentTasks.map((task) => (
                      <div 
                        key={task.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors group cursor-pointer"
                        onClick={() => onNavigate('tasks')}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]",
                            task.priority === 'high' ? "bg-rose-500 text-rose-500" :
                            task.priority === 'medium' ? "bg-amber-500 text-amber-500" :
                            "bg-blue-500 text-blue-500"
                          )} />
                          <div>
                            <p className="font-medium text-white text-sm">{task.title}</p>
                            <p className="text-xs text-white/50 flex items-center gap-2 mt-0.5">
                              <CalendarIcon size={12} />
                              {task.due_date ? format(new Date(task.due_date), 'd MMM', { locale: ru }) : 'Нет даты'}
                              {task.assignee && (
                                <>
                                  <span className="w-1 h-1 bg-white/30 rounded-full" />
                                  <span>{task.assignee}</span>
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="text-white/80 hover:text-white">
                            Открыть
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-white/40">
                    Нет активных задач
                    <Button variant="ghost" onClick={() => onNavigate('tasks')} className="mt-2 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/10">
                      Создать задачу
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column: Notes & Quick Actions */}
        <div className="space-y-8">
          {/* Quick Add Task */}
          <motion.div variants={item}>
            <Card className="bg-gradient-to-br from-indigo-900/80 to-purple-900/80 text-white border border-white/10 shadow-[0_0_20px_rgba(79,70,229,0.3)]">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-white text-glow">
                  <Zap size={18} className="text-yellow-300 drop-shadow-[0_0_5px_rgba(253,224,71,0.5)]" />
                  Быстрая задача
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuickAddTask} className="flex gap-2">
                  <Input 
                    placeholder="Что нужно сделать?" 
                    value={quickTaskTitle}
                    onChange={(e) => setQuickTaskTitle(e.target.value)}
                    className="bg-black/20 border-white/10 text-white placeholder:text-white/40 focus:bg-black/30"
                  />
                  <Button type="submit" size="icon" className="bg-white text-indigo-900 hover:bg-white/90 shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                    <Plus size={20} />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Notes */}
          <motion.div variants={item}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Недавние заметки</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('notes')} className="text-white/60 hover:text-white">
                  <ArrowRight size={16} />
                </Button>
              </CardHeader>
              <CardContent>
                {recentNotes.length > 0 ? (
                  <div className="space-y-4">
                    {recentNotes.map((note) => (
                      <div 
                        key={note.id}
                        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/10"
                        onClick={() => onNavigate('notes')}
                      >
                        <h4 className="font-medium text-white text-sm mb-1">{note.title}</h4>
                        <p className="text-xs text-white/50 line-clamp-2">
                          {note.content.replace(/[#*`]/g, '')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {note.tags && note.tags.split(',').slice(0, 2).map((tag: string) => (
                            <span key={tag} className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-[10px] text-white/60">
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-white/40 text-sm">
                    Нет заметок
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
