import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Download, 
  Search,
  Wallet,
  X,
  Briefcase,
  ShoppingBag,
  Users,
  Calendar as CalendarIcon,
  CreditCard,
  Trash2,
  Pencil
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area
} from 'recharts';
import { format, subMonths, isSameMonth, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { storage, Transaction } from '../services/storage';

const TRANSACTION_CONFIG = {
  income: {
    model: {
      label: 'Модель',
      icon: Users,
      color: 'emerald',
      categories: ['Subscriptions', 'PPV', 'Tips', 'Custom Content', 'Referral'],
      platforms: ['OnlyFans', 'Fanvue', 'Fansly', 'Loyalfans', 'Other']
    },
    brand: {
      label: 'Бренд',
      icon: Briefcase,
      color: 'amber',
      categories: ['Workflow Sale', 'Private', 'Collaboration', 'Sponsorship', 'UGC'],
      platforms: ['Telegram', 'Web']
    },
    commerce: {
      label: 'Коммерц',
      icon: ShoppingBag,
      color: 'purple',
      categories: ['Selling Content', 'RevShare'],
      platforms: ['Crypto', 'Other']
    }
  },
  expense: {
    payouts: {
      label: 'Выплаты',
      icon: Users,
      color: 'rose',
      categories: ['Model Payout', 'Agency Fee'],
      platforms: ['Bank Transfer', 'Crypto', 'PayPal', 'Wise', 'Revolut']
    },
    salary: {
      label: 'Зарплата',
      icon: Briefcase,
      color: 'rose',
      categories: ['Chatter Salary', 'Manager Salary', 'Editor Salary', 'Admin Salary'],
      platforms: ['Bank Transfer', 'Crypto', 'PayPal', 'Wise']
    },
    traffic: {
      label: 'Трафик',
      icon: TrendingUp,
      color: 'rose',
      categories: ['Ads Spend', 'Promo', 'Influencer Marketing'],
      platforms: ['Instagram', 'TikTok', 'Twitter/X', 'Reddit', 'Google Ads', 'Other']
    },
    services: {
      label: 'Сервисы',
      icon: CreditCard,
      color: 'rose',
      categories: ['Software', 'Proxy', 'Hosting', 'Domains', 'Tax', 'Legal'],
      platforms: ['Card', 'PayPal', 'Crypto', 'Bank Transfer']
    }
  }
};

export default function Finance({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');
  const [statsTab, setStatsTab] = useState<'models' | 'brands' | 'commerce'>('models');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { addToast } = useToast();

  // Form State
  const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    type: 'income',
    category: TRANSACTION_CONFIG.income.model.categories[0],
    description: '',
    platform: TRANSACTION_CONFIG.income.model.platforms[0],
    model_name: '',
  });

  const [activeTab, setActiveTab] = useState<string>('model');

  useEffect(() => {
    if (isAdding && !editingId) {
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        type: 'income',
        category: TRANSACTION_CONFIG.income.model.categories[0],
        platform: TRANSACTION_CONFIG.income.model.platforms[0],
        description: '',
        model_name: '',
      });
      setActiveTab('model');
    }
  }, [isAdding, editingId]);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await storage.getTransactions();
      setTransactions(data);
    } catch (error: any) {
      console.error('Failed to load transactions', error);
      if (error.message === 'Failed to fetch') {
        addToast('Ошибка соединения с сервером', 'error');
      } else {
        addToast('Ошибка загрузки транзакций', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await storage.updateTransaction(editingId, newTransaction);
        setTransactions(transactions.map(t => t.id === editingId ? updated : t));
        addToast('Транзакция обновлена', 'success');
      } else {
        // Ensure required fields are present for a new transaction
        if (!newTransaction.amount || !newTransaction.description) {
           addToast('Заполните обязательные поля', 'error');
           return;
        }
        const created = await storage.addTransaction(newTransaction as Omit<Transaction, 'id'>);
        setTransactions([created, ...transactions]);
        addToast('Транзакция добавлена', 'success');
      }
      
      setIsAdding(false);
      setEditingId(null);
      setNewTransaction({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        type: 'income',
        category: TRANSACTION_CONFIG.income.model.categories[0],
        description: '',
        platform: TRANSACTION_CONFIG.income.model.platforms[0],
        model_name: '',
      });
    } catch (error) {
      addToast(editingId ? 'Ошибка обновления' : 'Ошибка добавления', 'error');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setNewTransaction({
      date: transaction.date,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category,
      description: transaction.description,
      platform: transaction.platform,
      model_name: transaction.model_name || '',
    });
    setEditingId(transaction.id);
    
    // Determine active tab based on category
    const type = transaction.type;
    let foundTab = type === 'income' ? 'model' : 'services'; // Default fallback

    if (type === 'income') {
      for (const [key, config] of Object.entries(TRANSACTION_CONFIG.income)) {
        if (config.categories.includes(transaction.category)) {
          foundTab = key;
          break;
        }
      }
    } else {
      for (const [key, config] of Object.entries(TRANSACTION_CONFIG.expense)) {
        if (config.categories.includes(transaction.category)) {
          foundTab = key;
          break;
        }
      }
    }
    
    setActiveTab(foundTab);
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    
    try {
      await storage.deleteTransaction(deletingId);
      setTransactions(prev => prev.filter(t => t.id !== deletingId));
      addToast('Транзакция удалена', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      addToast('Ошибка удаления', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // --- Calculations ---

  const totalIncome = useMemo(() => 
    transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0), 
    [transactions]
  );

  const totalExpense = useMemo(() => 
    transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0), 
    [transactions]
  );

  const netProfit = totalIncome - totalExpense;
  const profitMargin = totalIncome > 0 ? ((netProfit / totalIncome) * 100).toFixed(1) : '0';

  // Daily Stats
  const dailyStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(t => t.date === today);
    const income = todayTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = todayTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, transactions: todayTransactions };
  }, [transactions]);

  // Detailed Stats (Brand, Commerce, Models)
  const detailedStats = useMemo(() => {
    const stats = {
      models: { total: 0, items: {} as Record<string, number> },
      brands: { total: 0, items: {} as Record<string, number> },
      commerce: { total: 0, items: {} as Record<string, number> }
    };

    transactions.filter(t => t.type === 'income').forEach(t => {
      const name = t.model_name || 'Unknown';
      
      if (TRANSACTION_CONFIG.income.brand.categories.includes(t.category)) {
        stats.brands.total += t.amount;
        if (t.model_name) {
          stats.brands.items[name] = (stats.brands.items[name] || 0) + t.amount;
        }
      } else if (TRANSACTION_CONFIG.income.commerce.categories.includes(t.category)) {
        stats.commerce.total += t.amount;
        if (t.model_name) {
          stats.commerce.items[name] = (stats.commerce.items[name] || 0) + t.amount;
        }
      } else {
        // Model related (default or explicit check)
        stats.models.total += t.amount;
        if (t.model_name) {
          stats.models.items[name] = (stats.models.items[name] || 0) + t.amount;
        }
      }
    });

    return stats;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesFilter = filter === 'all' || t.type === filter;
      const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) ||
                            t.category.toLowerCase().includes(search.toLowerCase()) ||
                            (t.model_name && t.model_name.toLowerCase().includes(search.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, search]);

  // Chart Data: Last 6 Months
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      
      const monthTransactions = transactions.filter(t => isSameMonth(parseISO(t.date), date));

      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

      const incomeTransactions = monthTransactions.filter(t => t.type === 'income');
      
      let modelsIncome = 0;
      let brandsIncome = 0;
      let commerceIncome = 0;

      incomeTransactions.forEach(t => {
        if (TRANSACTION_CONFIG.income.brand.categories.includes(t.category)) {
          brandsIncome += t.amount;
        } else if (TRANSACTION_CONFIG.income.commerce.categories.includes(t.category)) {
          commerceIncome += t.amount;
        } else {
          modelsIncome += t.amount;
        }
      });

      data.push({
        name: format(date, 'MMM', { locale: ru }),
        modelsIncome,
        brandsIncome,
        commerceIncome,
        expense,
      });
    }
    return data;
  }, [transactions]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-white text-glow">Финансы</h1>
          <p className="text-white/60">Управление доходами и расходами агентства</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="gap-2">
            <Download size={16} /> Экспорт
          </Button>
          <Button onClick={() => setIsAdding(true)} className="bg-white text-black hover:bg-white/90 gap-2 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            <Plus size={16} /> Добавить
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight size={20} />
            </div>
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full flex items-center gap-1 border border-emerald-500/20">
              <TrendingUp size={12} /> +12.5%
            </span>
          </div>
          <p className="text-white/60 text-sm font-medium">Общий доход</p>
          <h3 className="text-3xl font-bold text-white mt-1 tracking-tight text-glow">
            ${totalIncome.toLocaleString()}
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 border border-rose-500/20">
              <ArrowDownRight size={20} />
            </div>
            <span className="text-xs font-medium text-rose-400 bg-rose-500/10 px-2 py-1 rounded-full border border-rose-500/20">
              -2.4%
            </span>
          </div>
          <p className="text-white/60 text-sm font-medium">Расходы</p>
          <h3 className="text-3xl font-bold text-white mt-1 tracking-tight text-glow">
            ${totalExpense.toLocaleString()}
          </h3>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Wallet size={20} />
            </div>
            <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full border border-indigo-500/20">
              Маржа {profitMargin}%
            </span>
          </div>
          <p className="text-white/60 text-sm font-medium">Чистая прибыль</p>
          <h3 className="text-3xl font-bold text-white mt-1 tracking-tight text-glow">
            ${netProfit.toLocaleString()}
          </h3>
        </motion.div>
      </div>

      {/* Daily Report & Source Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Report */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6 rounded-2xl flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-indigo-400" />
              Дневной отчет
            </h3>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded border border-white/10">
              {format(new Date(), 'd MMMM yyyy', { locale: ru })}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-emerald-400/60 text-xs font-medium uppercase tracking-wider mb-1">Доход сегодня</p>
              <p className="text-2xl font-bold text-emerald-400 text-glow">+${dailyStats.income.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
              <p className="text-rose-400/60 text-xs font-medium uppercase tracking-wider mb-1">Расход сегодня</p>
              <p className="text-2xl font-bold text-rose-400 text-glow">-${dailyStats.expense.toLocaleString()}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[200px] space-y-2">
            {dailyStats.transactions.length === 0 ? (
              <div className="text-center py-8 text-white/20 text-sm italic">
                Сегодня операций не было
              </div>
            ) : (
              dailyStats.transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                      t.type === 'income' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    )}>
                      {t.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t.description}</p>
                      <p className="text-xs text-white/40">{t.category}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "font-bold text-sm",
                    t.type === 'income' ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Detailed Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6 rounded-2xl flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Статистика
            </h3>
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
              <button 
                onClick={() => setStatsTab('models')}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", statsTab === 'models' ? "bg-white/10 shadow-sm text-white" : "text-white/40 hover:text-white")}
              >
                Модели
              </button>
              <button 
                onClick={() => setStatsTab('brands')}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", statsTab === 'brands' ? "bg-white/10 shadow-sm text-white" : "text-white/40 hover:text-white")}
              >
                Бренды
              </button>
              <button 
                onClick={() => setStatsTab('commerce')}
                className={cn("px-3 py-1.5 text-xs font-medium rounded-md transition-all", statsTab === 'commerce' ? "bg-white/10 shadow-sm text-white" : "text-white/40 hover:text-white")}
              >
                Коммерц
              </button>
            </div>
          </div>

          <div className="space-y-4 flex-1 flex flex-col">
            {/* Total for Tab */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl border transition-colors",
              statsTab === 'models' ? "bg-emerald-500/5 border-emerald-500/10" :
              statsTab === 'brands' ? "bg-amber-500/5 border-amber-500/10" :
              "bg-purple-500/5 border-purple-500/10"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border",
                  statsTab === 'models' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  statsTab === 'brands' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                  "bg-purple-500/10 text-purple-400 border-purple-500/20"
                )}>
                  {statsTab === 'models' ? <Users size={18} /> : 
                   statsTab === 'brands' ? <Briefcase size={18} /> : 
                   <ShoppingBag size={18} />}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {statsTab === 'models' ? 'Все модели' : 
                     statsTab === 'brands' ? 'Все бренды' : 
                     'Вся коммерция'}
                  </p>
                  <p className="text-xs text-white/40">Общий доход</p>
                </div>
              </div>
              <p className="text-xl font-bold text-white text-glow">
                ${detailedStats[statsTab].total.toLocaleString()}
              </p>
            </div>

            {/* List of Items */}
            <div className="space-y-2 pt-2 flex-1 overflow-y-auto custom-scrollbar max-h-[200px]">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider px-1">
                {statsTab === 'models' ? 'Топ моделей' : 
                 statsTab === 'brands' ? 'Топ брендов' : 
                 'Топ клиентов'}
              </p>
              {Object.entries(detailedStats[statsTab].items).length === 0 ? (
                <p className="text-sm text-white/20 italic px-1 py-4 text-center">Нет данных</p>
              ) : (
                Object.entries(detailedStats[statsTab].items)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, amount]) => (
                    <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/60 border border-white/10">
                          {statsTab === 'models' ? <Users size={14} /> : 
                           statsTab === 'brands' ? <Briefcase size={14} /> : 
                           <ShoppingBag size={14} />}
                        </div>
                        <span className="text-sm font-medium text-white">{name}</span>
                      </div>
                      <span className="font-bold text-white text-glow">${amount.toLocaleString()}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Charts Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
        className="glass-card p-6 rounded-2xl w-full"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-serif font-bold text-white">Динамика доходов</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" /> Модели
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]" /> Бренды
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_10px_#8b5cf6]" /> Коммерция
            </div>
            <div className="flex items-center gap-2 text-xs text-white/60">
              <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" /> Расход
            </div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorModels" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBrands" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCommerce" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} 
                tickFormatter={(value) => `$${value/1000}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(20, 20, 25, 0.9)', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  color: '#fff'
                }}
                cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
              />
              <Area 
                type="monotone" 
                dataKey="modelsIncome" 
                stackId="income"
                stroke="#10b981" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorModels)" 
                name="Модели"
              />
              <Area 
                type="monotone" 
                dataKey="brandsIncome" 
                stackId="income"
                stroke="#f59e0b" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorBrands)" 
                name="Бренды"
              />
              <Area 
                type="monotone" 
                dataKey="commerceIncome" 
                stackId="income"
                stroke="#8b5cf6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorCommerce)" 
                name="Коммерция"
              />
              <Area 
                type="monotone" 
                dataKey="expense" 
                stroke="#f43f5e" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorExpense)" 
                name="Расход"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Transactions Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-serif font-bold text-white">История операций</h3>
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
              <Input 
                placeholder="Поиск..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full md:w-64 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
              <button 
                onClick={() => setFilter('all')}
                className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all", filter === 'all' ? "bg-white/10 shadow-sm text-white" : "text-white/40 hover:text-white")}
              >
                Все
              </button>
              <button 
                onClick={() => setFilter('income')}
                className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all", filter === 'income' ? "bg-white/10 shadow-sm text-white" : "text-white/40 hover:text-white")}
              >
                Доходы
              </button>
              <button 
                onClick={() => setFilter('expense')}
                className={cn("px-3 py-1.5 text-sm font-medium rounded-md transition-all", filter === 'expense' ? "bg-white/10 shadow-sm text-white" : "text-white/40 hover:text-white")}
              >
                Расходы
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="text-left text-xs font-semibold text-white/40 uppercase tracking-wider">
                <th className="px-6 py-4">Дата</th>
                <th className="px-6 py-4">Описание</th>
                <th className="px-6 py-4">Категория</th>
                <th className="px-6 py-4">Платформа</th>
                <th className="px-6 py-4 text-right">Сумма</th>
                <th className="px-6 py-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 text-sm text-white/60 whitespace-nowrap">
                    {format(parseISO(t.date), 'd MMM yyyy', { locale: ru })}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                        t.type === 'income' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      )}>
                        {t.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      </div>
                      <div>
                        <div>{t.description || 'Без описания'}</div>
                        {t.model_name && <div className="text-xs text-white/40 font-normal">{t.model_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/60">
                    <span className="px-2 py-1 rounded-full bg-white/5 text-white/60 text-xs font-medium border border-white/10">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-white/60">
                    {t.platform}
                  </td>
                  <td className={cn(
                    "px-6 py-4 text-sm font-bold text-right whitespace-nowrap text-glow",
                    t.type === 'income' ? "text-emerald-400" : "text-rose-400"
                  )}>
                    {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(t);
                      }}
                      className="text-white/40 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
                      title="Редактировать"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(t.id);
                      }}
                      className="text-white/40 hover:text-rose-400 transition-colors p-2 hover:bg-white/5 rounded-full"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-white/30 italic">
                    Транзакции не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add Transaction Modal */}
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
                <h3 className="text-lg font-serif font-bold text-white">{editingId ? 'Редактировать транзакцию' : 'Новая транзакция'}</h3>
                <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddTransaction} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
                
                {/* Type Toggle */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTransaction({ 
                        ...newTransaction, 
                        type: 'income', 
                        category: TRANSACTION_CONFIG.income.model.categories[0],
                        platform: TRANSACTION_CONFIG.income.model.platforms[0],
                        model_name: '' 
                      });
                      setActiveTab('model');
                    }}
                    className={cn(
                      "flex items-center justify-center py-2.5 rounded-lg transition-all gap-2 text-sm font-medium",
                      newTransaction.type === 'income'
                        ? "bg-emerald-500/10 text-emerald-400 shadow-sm border border-emerald-500/20" 
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <ArrowUpRight size={18} />
                    Доход
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTransaction({ 
                        ...newTransaction, 
                        type: 'expense', 
                        category: TRANSACTION_CONFIG.expense.payouts.categories[0],
                        platform: TRANSACTION_CONFIG.expense.payouts.platforms[0],
                        model_name: '' 
                      });
                      setActiveTab('payouts');
                    }}
                    className={cn(
                      "flex items-center justify-center py-2.5 rounded-lg transition-all gap-2 text-sm font-medium",
                      newTransaction.type === 'expense'
                        ? "bg-rose-500/10 text-rose-400 shadow-sm border border-rose-500/20" 
                        : "text-white/40 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <ArrowDownRight size={18} />
                    Расход
                  </button>
                </div>

                {/* Source Tabs (Income Only) */}
                {newTransaction.type === 'income' && (
                  <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
                    {Object.entries(TRANSACTION_CONFIG.income).map(([key, config]) => {
                      const Icon = config.icon;
                      const isActive = activeTab === key;
                      const colorClass = config.color === 'emerald' ? 'text-emerald-400' : 
                                       config.color === 'amber' ? 'text-amber-400' : 
                                       'text-purple-400';
                      
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setNewTransaction({ 
                              ...newTransaction, 
                              category: config.categories[0],
                              platform: config.platforms[0],
                              model_name: '' 
                            });
                            setActiveTab(key);
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center py-2 rounded-lg transition-all gap-1",
                            isActive
                              ? `bg-white/10 ${colorClass} shadow-sm border border-white/10` 
                              : "text-white/40 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <Icon size={16} />
                          <span className="text-[10px] font-medium uppercase tracking-wide">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Expense Tabs (Expense Only) */}
                {newTransaction.type === 'expense' && (
                  <div className="grid grid-cols-4 gap-2 p-1 bg-white/5 rounded-xl border border-white/10 shrink-0">
                    {Object.entries(TRANSACTION_CONFIG.expense).map(([key, config]) => {
                      const Icon = config.icon;
                      const isActive = activeTab === key;
                      
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setNewTransaction({ 
                              ...newTransaction, 
                              category: config.categories[0],
                              platform: config.platforms[0],
                              model_name: '' 
                            });
                            setActiveTab(key);
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center py-2 rounded-lg transition-all gap-1",
                            isActive
                              ? "bg-white/10 text-rose-400 shadow-sm border border-white/10" 
                              : "text-white/40 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <Icon size={16} />
                          <span className="text-[10px] font-medium uppercase tracking-wide">{config.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold text-lg">$</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newTransaction.amount || ''}
                    onChange={(e) => setNewTransaction({ ...newTransaction, amount: parseFloat(e.target.value) })}
                    required
                    className="pl-8 text-2xl font-bold h-14 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Описание</label>
                  <Input
                    placeholder="Например: Выплата за рекламу"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Категория</label>
                    <select
                      value={newTransaction.category}
                      onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                      className="w-full rounded-xl border border-white/10 p-2.5 text-sm bg-zinc-900 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none transition-shadow"
                    >
                      {(() => {
                        const config = newTransaction.type === 'income' 
                          ? TRANSACTION_CONFIG.income[activeTab as keyof typeof TRANSACTION_CONFIG.income]
                          : TRANSACTION_CONFIG.expense[activeTab as keyof typeof TRANSACTION_CONFIG.expense];
                        
                        return config?.categories.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Платформа</label>
                    <select
                      value={newTransaction.platform}
                      onChange={(e) => setNewTransaction({ ...newTransaction, platform: e.target.value })}
                      className="w-full rounded-xl border border-white/10 p-2.5 text-sm bg-zinc-900 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent outline-none transition-shadow"
                    >
                      {(() => {
                        const config = newTransaction.type === 'income' 
                          ? TRANSACTION_CONFIG.income[activeTab as keyof typeof TRANSACTION_CONFIG.income]
                          : TRANSACTION_CONFIG.expense[activeTab as keyof typeof TRANSACTION_CONFIG.expense];
                        
                        return config?.platforms.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-white/40 uppercase tracking-wider">Дата</label>
                    <Input
                      type="date"
                      value={newTransaction.date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, date: e.target.value })}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-4 shrink-0">
                  <Button type="button" variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-white/60 hover:text-white hover:bg-white/10">
                    Отмена
                  </Button>
                  <Button type="submit" className="bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    {editingId ? 'Обновить' : 'Сохранить'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingId && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/10 p-6"
            >
              <h3 className="text-lg font-serif font-bold text-white mb-2">Удалить транзакцию?</h3>
              <p className="text-white/60 text-sm mb-6">Это действие нельзя отменить.</p>
              
              <div className="flex justify-end gap-3">
                <Button 
                  onClick={() => setDeletingId(null)} 
                  variant="ghost" 
                  className="text-white/60 hover:text-white hover:bg-white/10"
                >
                  Отмена
                </Button>
                <Button 
                  onClick={confirmDelete} 
                  className="bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20"
                >
                  Удалить
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
