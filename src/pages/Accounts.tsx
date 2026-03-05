import { useState, useEffect } from 'react';
import { 
  Eye, EyeOff, Copy, Plus, Trash2, Search, ExternalLink, 
  Shield, Key, Globe, MoreHorizontal, Lock, User, Server,
  CreditCard, Smartphone, LayoutGrid, List, Briefcase, Box, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { storage, Account } from '../services/storage';

const CATEGORIES = [
  { value: 'Models', label: 'Модели', color: 'bg-pink-500', icon: User },
  { value: 'Chatters', label: 'Чаттеры', color: 'bg-indigo-500', icon: Smartphone },
  { value: 'Social', label: 'Соцсети', color: 'bg-blue-500', icon: Globe },
  { value: 'Banking', label: 'Банкинг', color: 'bg-emerald-500', icon: CreditCard },
  { value: 'Proxy', label: 'Прокси', color: 'bg-violet-500', icon: Server },
  { value: 'Software', label: 'Софт', color: 'bg-orange-500', icon: Box },
  { value: 'Other', label: 'Другое', color: 'bg-zinc-500', icon: MoreHorizontal },
];

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (confirming) {
      const timeout = setTimeout(() => setConfirming(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [confirming]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (confirming) {
          onDelete();
        } else {
          setConfirming(true);
        }
      }}
      className={cn(
        "inline-flex items-center justify-center text-xs font-medium transition-colors focus:outline-none gap-1.5",
        confirming 
          ? "text-rose-600 font-bold" 
          : "text-zinc-400 hover:text-rose-500"
      )}
    >
      <Trash2 size={14} />
      <span>{confirming ? 'Подтвердить' : 'Удалить'}</span>
    </button>
  );
}

export default function Accounts({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [isAdding, setIsAdding] = useState(false);
  const { addToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [newAccount, setNewAccount] = useState({
    title: '',
    service: '',
    username: '',
    password: '',
    url: '',
    category: 'Social',
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await storage.getAccounts();
      setAccounts(data);
    } catch (error: any) {
      console.error('Failed to load accounts', error);
      if (error.message === 'Failed to fetch') {
        addToast('Ошибка соединения с сервером', 'error');
      } else {
        addToast('Ошибка загрузки аккаунтов', 'error');
      }
    }
  };

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const createdAccount = await storage.addAccount(newAccount);
      setAccounts([...accounts, createdAccount]);
      setIsAdding(false);
      setNewAccount({ title: '', service: '', username: '', password: '', url: '', category: 'Social' });
      addToast('Аккаунт добавлен', 'success');
    } catch (error) {
      addToast('Ошибка добавления', 'error');
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      await storage.deleteAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
      addToast('Аккаунт удален', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      addToast('Ошибка удаления', 'error');
    }
  };

  const togglePassword = (id: string) => {
    setShowPassword((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Скопировано', 'success');
  };

  const filteredAccounts = accounts.filter((acc) => {
    const matchesSearch = (acc.title || acc.service).toLowerCase().includes(search.toLowerCase()) ||
      acc.username.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || acc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });


  return (
    <div className="relative min-h-screen pb-20 overflow-hidden bg-[#050505] rounded-[3rem] border border-white/5">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute inset-0 star-rays pointer-events-none" />
      {/* Star Core */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-[60px] pointer-events-none mix-blend-screen" />
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-white rounded-full blur-[40px] pointer-events-none shadow-[0_0_60px_rgba(255,255,255,0.8)]" />
      
      <div className="noise-overlay pointer-events-none opacity-40" />

      <div className="relative z-10 space-y-12 pt-10 px-6 md:px-12 w-full mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-serif text-white tracking-tight leading-[0.9]">
              Пароли
            </h1>
            <p className="text-lg text-white/60 font-light tracking-wide max-w-md">
              Безопасное хранение доступов, ключей и секретной информации в одном месте.
            </p>
          </div>
          
          <div className="flex items-center gap-3 pb-2">
            <div className="bg-white/5 p-1 rounded-full flex items-center border border-white/10 backdrop-blur-sm">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-2.5 rounded-full transition-all", viewMode === 'grid' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white")}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-2.5 rounded-full transition-all", viewMode === 'list' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white")}
              >
                <List size={18} />
              </button>
            </div>
            <Button onClick={() => setIsAdding(true)} className="h-12 px-8 bg-white text-black hover:bg-white/90 rounded-full font-medium text-sm tracking-wide shadow-[0_0_20px_rgba(255,255,255,0.2)]">
              <Plus size={18} className="mr-2" /> Добавить
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-[#111111] border border-white/5 rounded-full p-2 flex flex-col md:flex-row items-center gap-4 shadow-2xl shadow-black/40">
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
            <input
              placeholder="Поиск по названию или логину..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-white/[0.03] border border-white/5 rounded-full text-white placeholder:text-white/20 focus:outline-none focus:bg-white/[0.07] focus:border-white/10 transition-all text-sm"
            />
          </div>
          
          <div className="h-px w-full md:w-px md:h-8 bg-white/5 mx-2" />
          
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full pb-2 md:pb-0 pr-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={cn(
                "px-6 py-2.5 text-sm font-bold rounded-full whitespace-nowrap transition-all",
                selectedCategory === 'All' 
                  ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
                  : "bg-transparent text-white/40 hover:text-white"
              )}
            >
              Все
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  "px-5 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all flex items-center gap-2",
                  selectedCategory === cat.value
                    ? "bg-white/5 text-white" 
                    : "bg-transparent text-white/40 hover:text-white"
                )}
              >
                <span className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", cat.color.replace('bg-', 'text-').replace('500', '400'), cat.color)} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accounts Grid */}
        <div className={cn(
          "grid gap-6",
          viewMode === 'grid' ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "grid-cols-1"
        )}>
          <AnimatePresence>
            {filteredAccounts.map((acc) => {
              const category = CATEGORIES.find(c => c.value === acc.category) || CATEGORIES[6];
              const Icon = category.icon;
              
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={acc.id}
                >
                  <div className={cn(
                    "group relative overflow-hidden rounded-[2.5rem] border border-white/[0.03] bg-[#0A0A0A] hover:bg-[#0F0F0F] transition-all duration-500 hover:border-white/5 hover:shadow-[0_0_40px_rgba(0,0,0,0.5)]",
                    viewMode === 'list' ? "flex items-center p-5 gap-8" : "flex flex-col h-full p-8"
                  )}>
                    
                    {/* Header */}
                    <div className={cn("flex items-start justify-between mb-8", viewMode === 'list' && "mb-0 w-1/3")}>
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          {/* Icon Container */}
                          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0 group-hover:bg-white/[0.05] transition-colors duration-300">
                             {acc.url ? (
                               <img 
                                 src={`https://www.google.com/s2/favicons?domain=${acc.url}&sz=64`} 
                                 alt={acc.service} 
                                 className="w-7 h-7 opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
                                 onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                               />
                             ) : (
                               <Icon size={24} className="text-white/20 group-hover:text-white/60 transition-colors" />
                             )}
                          </div>
                        </div>
                        
                        <div className="min-w-0 space-y-1">
                          <h3 className="font-serif text-xl text-white tracking-wide truncate pr-2">{acc.title || acc.service}</h3>
                          <div className="flex items-center gap-2 text-[10px] text-white/20 font-bold uppercase tracking-[0.15em]">
                            <span className="truncate max-w-[150px]">{acc.service}</span>
                            {acc.url && (
                              <a href={acc.url} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Credentials */}
                    <div className={cn("space-y-3 mb-8", viewMode === 'list' && "space-y-0 mb-0 flex items-center gap-4 flex-1")}>
                      {/* Username */}
                      <div className={cn("relative group/input", viewMode === 'list' && "flex-1")}>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/10 group-hover/input:text-white/30 transition-colors">
                          <User size={14} />
                        </div>
                        <div className="w-full bg-black/40 border border-white/[0.03] rounded-xl py-3.5 pl-11 pr-10 text-sm text-white/60 font-medium truncate group-hover/input:bg-black/60 group-hover/input:border-white/10 group-hover/input:text-white transition-colors">
                          {acc.username}
                        </div>
                        <button 
                          onClick={() => copyToClipboard(acc.username)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/10 hover:text-white transition-colors opacity-0 group-hover/input:opacity-100"
                        >
                          <Copy size={14} />
                        </button>
                      </div>

                      {/* Password */}
                      <div className={cn("relative group/input", viewMode === 'list' && "flex-1")}>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/10 group-hover/input:text-white/30 transition-colors">
                          <Key size={14} />
                        </div>
                        <div className="w-full bg-black/40 border border-white/[0.03] rounded-xl py-3.5 pl-11 pr-20 text-sm text-white/60 font-mono truncate group-hover/input:bg-black/60 group-hover/input:border-white/10 group-hover/input:text-white transition-colors tracking-wider">
                          {showPassword[acc.id] ? acc.password : '••••••••••••'}
                        </div>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/input:opacity-100 transition-opacity">
                          <button 
                            onClick={() => togglePassword(acc.id)}
                            className="p-1.5 text-white/20 hover:text-white transition-colors"
                          >
                            {showPassword[acc.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button 
                            onClick={() => copyToClipboard(acc.password)}
                            className="p-1.5 text-white/20 hover:text-white transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className={cn("flex items-center justify-between mt-auto pt-5 border-t border-white/[0.03]", viewMode === 'list' && "mt-0 pt-0 border-0 w-auto gap-8")}>
                      {viewMode === 'grid' && (
                        <div className="flex items-center gap-2.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", category.color.replace('bg-', 'text-').replace('500', '400'), category.color)} />
                          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/20">
                            {category.label}
                          </span>
                        </div>
                      )}
                      <DeleteButton onDelete={() => deleteAccount(acc.id)} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {filteredAccounts.length === 0 && (
            <div className="col-span-full py-32 text-center relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.02]">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(255,255,255,0.05)] border border-white/10 backdrop-blur-sm">
                  <Shield size={40} className="text-white/20" />
                </div>
                <h3 className="text-3xl font-serif text-white mb-3">Пустота</h3>
                <p className="text-white/40 mb-10 max-w-md mx-auto font-light text-lg">
                  Здесь пока ничего нет. Добавьте первую запись, чтобы начать.
                </p>
                <Button onClick={() => setIsAdding(true)} className="h-14 px-8 bg-white text-black hover:bg-white/90 rounded-xl font-medium tracking-wide shadow-[0_0_30px_rgba(255,255,255,0.15)] text-lg">
                  <Plus size={20} className="mr-2" /> Создать запись
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Add Account Modal */}
        <AnimatePresence>
          {isAdding && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-xl">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[85vh]"
              >
                {/* Modal Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-indigo-500/10 blur-[60px] pointer-events-none" />

                <div className="p-8 border-b border-white/5 flex justify-between items-center relative z-10 shrink-0">
                  <div>
                    <h3 className="text-2xl font-serif text-white">Новая запись</h3>
                    <p className="text-white/40 text-sm mt-1">Заполните данные для сохранения</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white hover:bg-white/5 rounded-full w-10 h-10 p-0">
                    <span className="sr-only">Закрыть</span>
                    <X size={24} />
                  </Button>
                </div>
                <form onSubmit={addAccount} className="p-8 space-y-6 relative z-10 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Название</label>
                    <Input
                      placeholder="Например: Основной Instagram"
                      value={newAccount.title}
                      onChange={(e) => setNewAccount({ ...newAccount, title: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/20 h-12 text-lg font-serif"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Сервис</label>
                      <Input
                        placeholder="Instagram"
                        value={newAccount.service}
                        onChange={(e) => setNewAccount({ ...newAccount, service: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/20 h-11"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Категория</label>
                      <div className="relative">
                        <select
                          className="w-full h-11 rounded-xl border border-white/10 px-4 py-2 text-sm bg-white/5 text-white focus:ring-2 focus:ring-white/10 focus:border-white/20 outline-none transition-all appearance-none cursor-pointer hover:bg-white/10"
                          value={newAccount.category}
                          onChange={(e) => setNewAccount({ ...newAccount, category: e.target.value })}
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value} className="bg-zinc-900 text-white">{cat.label}</option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Логин / Email</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-3.5 h-4 w-4 text-white/30 group-focus-within:text-white/60 transition-colors" />
                      <Input
                        placeholder="username@example.com"
                        value={newAccount.username}
                        onChange={(e) => setNewAccount({ ...newAccount, username: e.target.value })}
                        className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/20 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Пароль</label>
                    <div className="relative group">
                      <Key className="absolute left-4 top-3.5 h-4 w-4 text-white/30 group-focus-within:text-white/60 transition-colors" />
                      <Input
                        type="text"
                        placeholder="Пароль"
                        value={newAccount.password}
                        onChange={(e) => setNewAccount({ ...newAccount, password: e.target.value })}
                        className="pl-11 font-mono bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/20 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest">URL (Опционально)</label>
                    <div className="relative group">
                      <Globe className="absolute left-4 top-3.5 h-4 w-4 text-white/30 group-focus-within:text-white/60 transition-colors" />
                      <Input
                        placeholder="https://..."
                        value={newAccount.url}
                        onChange={(e) => setNewAccount({ ...newAccount, url: e.target.value })}
                        className="pl-11 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:bg-white/10 focus:border-white/20 h-11"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-6 border-t border-white/5 mt-8 shrink-0">
                    <Button type="button" variant="ghost" onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white hover:bg-white/5 h-12 px-6 rounded-xl">
                      Отмена
                    </Button>
                    <Button type="submit" className="bg-white text-black hover:bg-white/90 shadow-[0_0_20px_rgba(255,255,255,0.2)] h-12 px-8 rounded-xl font-medium tracking-wide">
                      Сохранить
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
