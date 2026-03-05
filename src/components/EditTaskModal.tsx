import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, User, Flag, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { cn } from '../lib/utils';

import { Task } from '../services/storage';

interface EditTaskModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Task>) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Низкий', color: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' },
  { value: 'medium', label: 'Средний', color: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
  { value: 'high', label: 'Высокий', color: 'bg-rose-500/20 text-rose-300 border border-rose-500/30' },
];

const STATUS_OPTIONS = [
  { value: 'todo', label: 'К исполнению', icon: AlertCircle },
  { value: 'in_progress', label: 'В процессе', icon: Clock },
  { value: 'done', label: 'Готово', icon: CheckCircle2 },
];

export default function EditTaskModal({ task, isOpen, onClose, onSave, onDelete }: EditTaskModalProps) {
  const [formData, setFormData] = useState<Partial<Task>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({ ...task });
    }
  }, [task]);

  const handleSave = async () => {
    if (!task || !formData.title) return;
    setIsSaving(true);
    await onSave(task.id, formData);
    setIsSaving(false);
    onClose();
  };

  const handleDelete = async () => {
    if (!task || !confirm('Вы уверены, что хотите удалить эту задачу?')) return;
    await onDelete(task.id);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-panel rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full shadow-[0_0_5px_currentColor]",
                  formData.priority === 'high' ? 'bg-rose-500 text-rose-500' : 
                  formData.priority === 'medium' ? 'bg-amber-500 text-amber-500' : 'bg-emerald-500 text-emerald-500'
                )} />
                <span className="text-xs font-mono text-white/40 uppercase tracking-wider">
                  {task.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/10 text-white/60 hover:text-white">
                  <X size={20} />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
              {/* Title Input */}
              <div>
                <input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-2xl font-serif font-bold bg-transparent border-none focus:ring-0 p-0 text-white placeholder:text-white/30 text-glow"
                  placeholder="Название задачи"
                />
              </div>

              {/* Status & Priority Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={14} /> Статус
                  </label>
                  <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, status: option.value as any })}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-all",
                          formData.status === option.value 
                            ? "bg-white/10 text-white shadow-sm border border-white/10" 
                            : "text-white/40 hover:text-white/70 hover:bg-white/5"
                        )}
                      >
                        <option.icon size={14} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                    <Flag size={14} /> Приоритет
                  </label>
                  <div className="flex gap-2">
                    {PRIORITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFormData({ ...formData, priority: option.value as any })}
                        className={cn(
                          "flex-1 py-2 text-xs font-medium rounded-lg border transition-all",
                          formData.priority === option.value
                            ? cn(option.color, "ring-1 ring-white/20")
                            : "bg-transparent border-white/10 text-white/40 hover:bg-white/5 hover:text-white/70"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
                  Описание
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full min-h-[120px] rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all resize-none"
                  placeholder="Добавьте детали..."
                />
              </div>

              {/* Meta Data */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/10">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} /> Исполнитель
                  </label>
                  <Input
                    value={formData.assignee || ''}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14} /> Начало
                  </label>
                  <Input
                    type="date"
                    value={formData.start_date || ''}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14} /> Срок
                  </label>
                  <Input
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-between items-center">
              <Button 
                variant="ghost" 
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Удалить задачу
              </Button>
              <div className="flex gap-3">
                <Button variant="ghost" onClick={onClose} className="text-white/60 hover:text-white hover:bg-white/10">
                  Отмена
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving}
                  className="bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.2)] min-w-[100px]"
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
