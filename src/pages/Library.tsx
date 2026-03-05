import { useState, useEffect, useMemo } from 'react';
import { 
  Book, 
  Plus, 
  Search, 
  FileText, 
  Tag, 
  Folder, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  ChevronRight, 
  Layout,
  Hash,
  Bold,
  Italic,
  List,
  Code,
  Link as LinkIcon,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn, safeDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { storage, Note } from '../services/storage';

export default function Library({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { addToast } = useToast();
  const [guides, setGuides] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Navigation State
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedGuide, setSelectedGuide] = useState<Note | null>(null);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit Form State
  const [editForm, setEditForm] = useState<{
    title: string;
    content: string;
    tags: string;
    folder: string;
  }>({ title: '', content: '', tags: '', folder: '' });

  useEffect(() => {
    loadGuides();
  }, []);

  const loadGuides = async () => {
    try {
      const allNotes = await storage.getNotes();
      const data = allNotes.filter(note => note.is_guide === 1);
      setGuides(data);
    } catch (error: any) {
      console.error('Failed to load guides', error);
      if (error.message === 'Failed to fetch') {
        addToast('Ошибка соединения с сервером', 'error');
      } else {
        addToast('Ошибка загрузки базы знаний', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Derived Data
  const folders = useMemo(() => {
    const uniqueFolders = new Set(guides.map(g => g.folder || 'Общее'));
    return Array.from(uniqueFolders).sort();
  }, [guides]);

  const tags = useMemo(() => {
    const allTags = new Set<string>();
    guides.forEach(g => {
      if (g.tags) {
        g.tags.split(',').forEach(t => allTags.add(t.trim()));
      }
    });
    return Array.from(allTags).sort();
  }, [guides]);

  const filteredGuides = useMemo(() => {
    return guides.filter(g => {
      const matchesSearch = (g.title.toLowerCase().includes(search.toLowerCase()) || 
                             g.content.toLowerCase().includes(search.toLowerCase()));
      const matchesFolder = selectedFolder ? (g.folder || 'Общее') === selectedFolder : true;
      const matchesTag = selectedTag ? g.tags?.includes(selectedTag) : true;
      
      return matchesSearch && matchesFolder && matchesTag;
    });
  }, [guides, search, selectedFolder, selectedTag]);

  // Actions
  const handleCreateGuide = () => {
    const newGuide = {
      title: 'Новая статья',
      content: 'Начните писать здесь...',
      tags: '',
      folder: selectedFolder || 'Общее',
      is_guide: 1,
    };
    
    // Optimistic update
    const tempId = 'temp-' + Date.now();
    const tempGuide: Note = { 
      ...newGuide, 
      id: tempId, 
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    setGuides([tempGuide, ...guides]);
    setSelectedGuide(tempGuide);
    setEditForm(newGuide);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedGuide) return;

    try {
      const isNew = selectedGuide.id.startsWith('temp-');
      let savedGuide: Note;

      if (isNew) {
        savedGuide = await storage.addNote({
          ...editForm,
          is_guide: 1
        });
      } else {
        savedGuide = await storage.updateNote(selectedGuide.id, {
          ...editForm,
          is_guide: 1
        });
      }
      
      setGuides(prev => {
        if (isNew) {
          return prev.map(g => g.id === selectedGuide.id ? savedGuide : g);
        } else {
          return prev.map(g => g.id === savedGuide.id ? savedGuide : g);
        }
      });
      
      setSelectedGuide(savedGuide);
      setIsEditing(false);
      addToast('Статья сохранена', 'success');
    } catch (error) {
      console.error('Save error:', error);
      addToast('Ошибка сохранения', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedGuide || !confirm('Удалить эту статью?')) return;
    
    try {
      if (!selectedGuide.id.startsWith('temp-')) {
        await storage.deleteNote(selectedGuide.id);
      }
      
      setGuides(prev => prev.filter(g => g.id !== selectedGuide.id));
      setSelectedGuide(null);
      setIsEditing(false);
      addToast('Статья удалена', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      addToast('Ошибка удаления', 'error');
    }
  };

  const startEditing = (guide: Note) => {
    setEditForm({
      title: guide.title,
      content: guide.content,
      tags: guide.tags,
      folder: guide.folder || 'Общее'
    });
    setIsEditing(true);
  };

  const insertText = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editForm.content;
    const newText = text.substring(0, start) + before + text.substring(start, end) + after + text.substring(end);
    
    setEditForm({ ...editForm, content: newText });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] glass-panel rounded-2xl overflow-hidden border border-white/10 relative">
      {/* Sidebar - Navigation */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <>
            {/* Mobile Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden fixed inset-0 bg-black/60 z-20 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ x: -240, opacity: 0 }}
              animate={{ x: 0, opacity: 1, width: 240 }}
              exit={{ x: -240, opacity: 0, width: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed md:relative inset-y-0 left-0 z-30 flex-shrink-0 border-r border-white/10 flex flex-col overflow-hidden bg-[#0A0A0A] md:bg-white/5 h-full"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
                <span className="font-serif font-bold text-white flex items-center gap-2 text-glow">
                  <Book className="w-5 h-5 text-indigo-400" />
                  Библиотека
                </span>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden p-1 rounded-full hover:bg-white/10 text-white/50"
                >
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 space-y-6 custom-scrollbar">
                {/* Main Links */}
                <div className="space-y-1">
                  <button
                    onClick={() => { setSelectedFolder(null); setSelectedTag(null); setIsSidebarOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                      !selectedFolder && !selectedTag ? "bg-white/10 shadow-sm text-indigo-400 font-medium border border-white/10" : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Layout size={16} />
                    Все статьи
                  </button>
                </div>

                {/* Folders */}
                <div>
                  <div className="px-3 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                    Разделы
                  </div>
                  <div className="space-y-1">
                    {folders.map(folder => (
                      <button
                        key={folder}
                        onClick={() => { setSelectedFolder(folder); setSelectedTag(null); setIsSidebarOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                          selectedFolder === folder ? "bg-white/10 shadow-sm text-indigo-400 font-medium border border-white/10" : "text-white/60 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Folder size={16} className={selectedFolder === folder ? "text-indigo-400" : "text-white/40"} />
                        {folder}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <div className="px-3 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
                    Теги
                  </div>
                  <div className="space-y-1">
                    {tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => { setSelectedTag(tag); setSelectedFolder(null); setIsSidebarOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                          selectedTag === tag ? "bg-white/10 shadow-sm text-indigo-400 font-medium border border-white/10" : "text-white/60 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Hash size={14} className={selectedTag === tag ? "text-indigo-400" : "text-white/40"} />
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* List Pane */}
      <div className={cn(
        "border-r border-white/10 flex flex-col bg-white/5 flex-shrink-0 backdrop-blur-md transition-all duration-300",
        "w-full md:w-80",
        selectedGuide ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="md:hidden h-8 w-8 text-white/60 hover:text-white hover:bg-white/10">
              <Menu size={18} />
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
              <Input 
                placeholder="Поиск..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                className="h-9 pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10"
              />
            </div>
          </div>
          <Button onClick={handleCreateGuide} className="w-full justify-center bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.2)]" size="sm">
            <Plus className="mr-2 h-4 w-4" /> Новая статья
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {filteredGuides.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-sm">
              Нет статей
            </div>
          ) : (
            filteredGuides.map(guide => (
              <div
                key={guide.id}
                onClick={() => {
                  if (isEditing && !confirm('Отменить изменения?')) return;
                  setSelectedGuide(guide);
                  setIsEditing(false);
                }}
                className={cn(
                  "p-3 rounded-lg cursor-pointer transition-all border",
                  selectedGuide?.id === guide.id 
                    ? "bg-white/10 border-white/20 ring-1 ring-white/10 shadow-lg backdrop-blur-sm" 
                    : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/10"
                )}
              >
                <h3 className={cn("font-medium text-sm mb-1", selectedGuide?.id === guide.id ? "text-white text-glow" : "text-white/90")}>
                  {guide.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span className="truncate max-w-[80px]">{guide.folder || 'Общее'}</span>
                  <span>•</span>
                  <span>{format(safeDate(guide.updated_at), 'd MMM', { locale: ru })}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Content Pane */}
      <div className={cn(
        "flex-col bg-zinc-950/50 min-w-0 backdrop-blur-sm transition-all duration-300",
        "w-full md:flex-1",
        selectedGuide ? "flex" : "hidden md:flex"
      )}>
        {selectedGuide ? (
          <>
            {/* Toolbar */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 md:px-6 bg-white/5 shrink-0">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSelectedGuide(null)} 
                  className="md:hidden h-8 w-8 text-white/60 hover:text-white -ml-2"
                >
                  <ChevronLeft size={20} />
                </Button>
                
                <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded text-xs border border-white/10">
                  <Folder size={12} />
                  {isEditing ? (
                     <input 
                       className="bg-transparent border-none focus:ring-0 p-0 w-24 text-xs text-white placeholder:text-white/30"
                       value={editForm.folder}
                       onChange={(e) => setEditForm({...editForm, folder: e.target.value})}
                       placeholder="Раздел"
                     />
                  ) : (
                    selectedGuide.folder || 'Общее'
                  )}
                </span>
                {isEditing && <span className="text-xs text-white/40 ml-2 hidden sm:inline">Редактирование...</span>}
              </div>
              
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-white/60 hover:text-white hover:bg-white/10">
                      <span className="hidden sm:inline">Отмена</span>
                      <X className="sm:hidden h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500/50">
                      <Save className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">Сохранить</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete()} className="text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors">
                      <Trash2 size={18} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => startEditing(selectedGuide)} className="text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                      <Edit2 size={18} />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Editor / Viewer */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <div className="max-w-3xl mx-auto">
                {isEditing ? (
                  <div className="space-y-6">
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                      className="text-3xl font-bold border-none px-0 shadow-none focus-visible:ring-0 placeholder:text-white/20 bg-transparent text-white font-serif"
                      placeholder="Заголовок статьи"
                    />
                    <Input
                      value={editForm.tags}
                      onChange={(e) => setEditForm({...editForm, tags: e.target.value})}
                      className="text-sm border-none px-0 shadow-none focus-visible:ring-0 text-white/60 bg-transparent placeholder:text-white/20"
                      placeholder="Теги (через запятую)..."
                    />
                    
                    {/* Formatting Toolbar */}
                    <div className="flex items-center gap-1 border-y border-white/10 py-2 sticky top-0 bg-zinc-950/90 backdrop-blur-md z-10">
                      <Button variant="ghost" size="sm" onClick={() => insertText('**', '**')} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10">
                        <Bold size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => insertText('*', '*')} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10">
                        <Italic size={16} />
                      </Button>
                      <div className="w-px h-4 bg-white/10 mx-1" />
                      <Button variant="ghost" size="sm" onClick={() => insertText('# ')} className="h-8 w-8 p-0 font-bold text-white/60 hover:text-white hover:bg-white/10">
                        H1
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => insertText('## ')} className="h-8 w-8 p-0 font-bold text-sm text-white/60 hover:text-white hover:bg-white/10">
                        H2
                      </Button>
                      <div className="w-px h-4 bg-white/10 mx-1" />
                      <Button variant="ghost" size="sm" onClick={() => insertText('- ')} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10">
                        <List size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => insertText('`', '`')} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10">
                        <Code size={16} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => insertText('[[', ']]')} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10">
                        <LinkIcon size={16} />
                      </Button>
                    </div>

                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                      className="w-full h-[calc(100vh-400px)] resize-none border-none focus:ring-0 text-white/90 leading-relaxed text-lg p-0 font-mono bg-transparent placeholder:text-white/20"
                      placeholder="Напишите что-нибудь полезное..."
                    />
                  </div>
                ) : (
                  <div className="prose prose-invert prose-zinc max-w-none">
                    <h1 className="mb-2 font-serif text-white text-glow">{selectedGuide.title}</h1>
                    {selectedGuide.tags && (
                      <div className="flex gap-2 mb-8 not-prose">
                        {selectedGuide.tags.split(',').filter(Boolean).map(tag => (
                          <span key={tag} className="px-2 py-1 bg-white/10 text-white/70 text-xs rounded-full flex items-center gap-1 border border-white/10">
                            <Hash size={10} />
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-white/80 leading-relaxed">
                      <ReactMarkdown>{selectedGuide.content}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20">
            <Book className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-white/40">Выберите статью для чтения</p>
            <p className="text-sm">или создайте новую</p>
          </div>
        )}
      </div>
    </div>
  );
}
