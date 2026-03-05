import { useState } from 'react';
import { Book, Cloud, FileText, Lock, DollarSign, Menu, X, CheckSquare, LayoutDashboard, LogOut, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import CloudDrive from './pages/CloudDrive';
import Notes from './pages/Notes';
import Accounts from './pages/Accounts';
import Finance from './pages/Finance';
import Tasks from './pages/Tasks';
import Landing from './pages/Landing';
import { ToastProvider } from './components/ui/Toast';

const TABS = [
  { id: 'dashboard', label: 'Главная', icon: LayoutDashboard, component: Dashboard },
  { id: 'tasks', label: 'Задачи', icon: CheckSquare, component: Tasks },
  { id: 'library', label: 'База Знаний', icon: Book, component: Library },
  { id: 'cloud', label: 'Облако', icon: Cloud, component: CloudDrive },
  { id: 'notes', label: 'Заметки', icon: FileText, component: Notes },
  { id: 'accounts', label: 'Пароли', icon: Lock, component: Accounts },
  { id: 'finance', label: 'Финансы', icon: DollarSign, component: Finance },
];

export default function App() {
  const [isLanding, setIsLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const ActiveComponent = TABS.find((tab) => tab.id === activeTab)?.component || Dashboard;

  return (
    <ToastProvider>
      {isLanding ? (
        <Landing onStart={() => setIsLanding(false)} />
      ) : (
        <div className="flex h-screen bg-[var(--color-witch-black)] text-white font-sans overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
          <div className="sunray-bg" />
          
          {/* Mobile Header */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between bg-[var(--color-witch-black)]/80 backdrop-blur-md border-b border-white/5">
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] bg-white/5">
                  <Zap size={16} className="fill-white" />
                </div>
                <span className="font-serif font-bold text-lg tracking-wide text-white text-glow">Modern Witch</span>
             </div>
             <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <Menu size={24} />
              </button>
          </div>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm"
              />
            )}
          </AnimatePresence>

          {/* Sidebar */}
          <aside
            className={cn(
              "glass-panel flex flex-col z-40 border-r-0 transition-all duration-300 ease-in-out",
              "fixed inset-y-0 left-0 w-[280px] md:relative",
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
              !isSidebarExpanded && "md:w-[72px]"
            )}
            style={{ width: undefined }} // Let classes handle width
          >
            <div className="p-5 flex items-center justify-between shrink-0">
              {isSidebarExpanded ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,255,255,0.3)] bg-white/5">
                    <Zap size={16} className="fill-white" />
                  </div>
                  <span className="font-serif font-bold text-xl tracking-wide text-white text-glow">Modern Witch</span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-white mx-auto shadow-[0_0_15px_rgba(255,255,255,0.3)] bg-white/5">
                  <Zap size={16} className="fill-white" />
                </div>
              )}
              
              {/* Close button for mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>

              {/* Collapse button for desktop */}
              {isSidebarExpanded && (
                <button
                  onClick={() => setIsSidebarExpanded(false)}
                  className="hidden md:block p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            
            {!isSidebarExpanded && (
               <button
                  onClick={() => setIsSidebarExpanded(true)}
                  className="hidden md:block mx-auto p-1.5 mb-4 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                  <Menu size={18} />
                </button>
            )}

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative border border-transparent',
                    activeTab === tab.id
                      ? 'bg-white/10 text-white border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <tab.icon size={20} className={cn('shrink-0 transition-colors', activeTab === tab.id ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'text-white/40 group-hover:text-white', !isSidebarExpanded && 'md:mx-auto')} />
                  
                  {/* Show label if expanded OR if on mobile (mobile sidebar is always expanded width) */}
                  <span className={cn("ml-3 tracking-wide", !isSidebarExpanded && "md:hidden")}>{tab.label}</span>
                  
                  {/* Active Indicator for collapsed state (Desktop only) */}
                  {!isSidebarExpanded && activeTab === tab.id && (
                    <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-[0_0_10px_white]" />
                  )}

                  {/* Tooltip for collapsed state (Desktop only) */}
                  {!isSidebarExpanded && (
                    <div className="hidden md:block absolute left-full ml-3 px-3 py-1.5 glass text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-all translate-x-2 group-hover:translate-x-0 shadow-xl border border-white/10">
                      {tab.label}
                    </div>
                  )}
                </button>
              ))}
            </nav>
            
            <div className="p-3 border-t border-white/5 shrink-0">
              <button
                onClick={() => setIsLanding(true)}
                className={cn(
                  'w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-white/50 hover:bg-white/5 hover:text-white hover:shadow-sm border border-transparent hover:border-white/10'
                )}
              >
                <LogOut size={20} className={cn('shrink-0', !isSidebarExpanded && 'md:mx-auto')} />
                <span className={cn("ml-3", !isSidebarExpanded && "md:hidden")}>Выйти</span>
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden relative bg-transparent pt-[60px] md:pt-0">
            {/* Subtle background pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
            
            <div className="h-full w-full overflow-y-auto p-4 md:p-8 relative z-10 custom-scrollbar">
              <div className={cn("mx-auto", (activeTab === 'accounts' || activeTab === 'finance' || activeTab === 'cloud' || activeTab === 'notes') ? "max-w-full" : "max-w-7xl")}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.99 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="h-full"
                  >
                    <ActiveComponent onNavigate={setActiveTab} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>
      )}
    </ToastProvider>
  );
}
