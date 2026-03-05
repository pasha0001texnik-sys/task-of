import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, TrendingUp, ArrowUpRight, ArrowDownRight, Wallet, FileText, CheckSquare, Plus, Save, LogIn, UserPlus, Loader2, Home } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { storage, Transaction, Note, Task } from '../services/storage';
import { supabase } from '../lib/supabase';

export default function Landing({ onStart }: { onStart: () => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Quick Actions State
  const [note, setNote] = useState('');
  const [task, setTask] = useState('');
  const [recentNotes, setRecentNotes] = useState<Note[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const { addToast } = useToast();

  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadData();
      } else {
        setTransactions([]);
        setRecentNotes([]);
        setRecentTasks([]);
        setIsLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      loadData();
    } else {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [trans, notes, tasks] = await Promise.all([
        storage.getTransactions(),
        storage.getNotes(),
        storage.getTasks()
      ]);

      setTransactions(trans);
      setRecentNotes(notes.slice(0, 3));
      setRecentTasks(tasks.filter((t) => t.status !== 'done').slice(0, 3));
    } catch (error: any) {
      console.error('Failed to load data', error);
      if (error.message === 'Failed to fetch') {
        addToast('Ошибка соединения с сервером. Проверьте интернет.', 'error');
      } else {
        addToast('Ошибка загрузки данных', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        if (data.user && !data.session) {
            addToast('Пожалуйста, подтвердите email перед входом', 'error');
            return;
        }

        addToast('Вход выполнен успешно', 'success');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: email.split('@')[0],
            },
          },
        });
        if (error) throw error;
        addToast('Регистрация успешна! Проверьте почту для подтверждения.', 'success');
        setIsLogin(true); // Switch to login mode
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.message === 'Failed to fetch') {
        addToast('Ошибка соединения с сервером. Проверьте интернет.', 'error');
      } else if (error.message.includes('Email not confirmed')) {
        addToast('Пожалуйста, подтвердите email перед входом', 'error');
      } else if (error.message.includes('Invalid login credentials')) {
        addToast('Неверный email или пароль', 'error');
      } else {
        addToast(error.message || 'Ошибка авторизации', 'error');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
        addToast('Введите email', 'error');
        return;
    }
    setAuthLoading(true);
    try {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email,
        });
        if (error) throw error;
        addToast('Письмо с подтверждением отправлено повторно', 'success');
    } catch (error: any) {
        addToast(error.message || 'Ошибка отправки письма', 'error');
    } finally {
        setAuthLoading(false);
    }
  };

  const stats = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const profit = income - expense;
    return { income, expense, profit };
  }, [transactions]);

  const handleAddNote = async () => {
    if (!note.trim()) return;
    if (!user) {
      addToast('Войдите, чтобы сохранять заметки', 'error');
      return;
    }
    try {
      const newNote = await storage.addNote({
        title: 'Быстрая заметка',
        content: note,
        tags: 'Quick',
        folder: '/',
        is_guide: 0
      });
      setRecentNotes([newNote, ...recentNotes].slice(0, 3));
      setNote('');
      addToast('Заметка сохранена', 'success');
    } catch (e) {
      addToast('Ошибка сохранения', 'error');
    }
  };

  const handleAddTask = async () => {
    if (!task.trim()) return;
    if (!user) {
      addToast('Войдите, чтобы создавать задачи', 'error');
      return;
    }
    try {
      const newTask = await storage.addTask({
        title: task,
        description: '',
        status: 'todo',
        priority: 'medium',
        due_date: new Date().toISOString()
      });
      setRecentTasks([newTask, ...recentTasks].slice(0, 3));
      setTask('');
      addToast('Задача добавлена', 'success');
    } catch (e) {
      addToast('Ошибка добавления', 'error');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-witch-black)] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-white">
        <div className="sunray-bg" />
        <div className="noise-bg" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-card p-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md relative z-10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] bg-white/5 mb-4">
              <Home size={24} className="text-white" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-white text-glow">OFM HUB</h1>
            <p className="text-white/60 mt-2">Войдите в свой аккаунт</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30 h-12"
                required
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black/20 border-white/10 text-white placeholder:text-white/30 h-12"
                required
              />
            </div>

            <Button 
              type="submit" 
              disabled={authLoading}
              className="w-full h-12 bg-white text-black hover:bg-white/90 font-medium text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {authLoading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Войти' : 'Регистрация')}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-white/60 hover:text-white transition-colors block w-full"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </button>
            
            {isLogin && (
                <button 
                  type="button"
                  onClick={handleResendConfirmation}
                  className="text-xs text-white/40 hover:text-white transition-colors block w-full"
                >
                  Не пришло письмо? Отправить повторно
                </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-witch-black)] flex flex-col relative overflow-hidden font-sans text-white selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="sunray-bg" />
      <div className="noise-bg" />
      
      {/* Navbar (Minimal) */}
      <header className="px-6 py-6 flex items-center justify-between relative z-10 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] bg-white/5">
            <TrendingUp size={16} className="fill-white" />
          </div>
          <span className="font-serif font-bold text-xl tracking-wide text-white text-glow">OFM HUB</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-white/60 hidden md:block">{user.email}</span>
          <Button 
            variant="ghost" 
            onClick={() => supabase.auth.signOut()}
            className="text-white/60 hover:text-white hover:bg-white/10"
          >
            Выйти
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 relative z-10 pb-20 pt-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-6xl mx-auto flex flex-col items-center w-full"
        >
          {/* Typography */}
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-none mb-4 text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            Панель управления
          </h1>
          <p className="text-white/70 text-lg leading-relaxed max-w-lg mx-auto font-light tracking-wide mb-10">
            Быстрый доступ к ключевым показателям и функциям.
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-8">
            {/* Income */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <ArrowUpRight size={16} />
                </div>
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Income
                </span>
              </div>
              <p className="text-white/40 text-xs font-medium text-left uppercase tracking-wider">Доход</p>
              <h3 className="text-2xl font-bold text-white mt-1 tracking-tight text-glow text-left">
                ${isLoading ? '...' : stats.income.toLocaleString()}
              </h3>
            </motion.div>

            {/* Expense */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center text-rose-400 border border-rose-500/20">
                  <ArrowDownRight size={16} />
                </div>
                <span className="text-[10px] font-medium text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  Expense
                </span>
              </div>
              <p className="text-white/40 text-xs font-medium text-left uppercase tracking-wider">Расход</p>
              <h3 className="text-2xl font-bold text-white mt-1 tracking-tight text-glow text-left">
                ${isLoading ? '...' : stats.expense.toLocaleString()}
              </h3>
            </motion.div>

            {/* Profit */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-5 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                  <Wallet size={16} />
                </div>
                <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Net Profit
                </span>
              </div>
              <p className="text-white/40 text-xs font-medium text-left uppercase tracking-wider">Прибыль</p>
              <h3 className="text-2xl font-bold text-white mt-1 tracking-tight text-glow text-left">
                ${isLoading ? '...' : stats.profit.toLocaleString()}
              </h3>
            </motion.div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
            {/* Quick Note */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-6 rounded-2xl border border-white/10 bg-white/5 text-left"
            >
              <div className="flex items-center gap-2 mb-4 text-white/80">
                <FileText size={18} className="text-indigo-400" />
                <h3 className="font-medium">Быстрая заметка</h3>
              </div>
              <div className="space-y-3">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Запишите мысль..."
                  className="w-full h-24 rounded-xl bg-black/20 border border-white/10 p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
                />
                <Button onClick={handleAddNote} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
                  <Save size={14} className="mr-2" /> Сохранить
                </Button>
              </div>
              
              {recentNotes.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider">Недавние</p>
                  {recentNotes.map(n => (
                    <div key={n.id} className="text-xs text-white/60 truncate p-2 rounded bg-white/5 border border-white/5">
                      {n.content}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Quick Task */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-card p-6 rounded-2xl border border-white/10 bg-white/5 text-left"
            >
              <div className="flex items-center gap-2 mb-4 text-white/80">
                <CheckSquare size={18} className="text-emerald-400" />
                <h3 className="font-medium">Новая задача</h3>
              </div>
              <div className="space-y-3">
                <Input
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Что нужно сделать?"
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                />
                <Button onClick={handleAddTask} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
                  <Plus size={14} className="mr-2" /> Добавить
                </Button>
              </div>

              {recentTasks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider">В работе</p>
                  {recentTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 text-xs text-white/60 p-2 rounded bg-white/5 border border-white/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={onStart} 
            className="group h-12 px-8 rounded-full bg-white text-black hover:bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:scale-105"
          >
            <span className="text-base font-medium tracking-wide">Перейти в приложение</span>
            <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
          </Button>
        </motion.div>
      </main>

      {/* Bottom Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full backdrop-blur-sm z-10" />
    </div>
  );
}
