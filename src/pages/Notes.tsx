import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Save, Trash2, Tag, FileText, Folder, 
  ChevronRight, ChevronDown, Network, Bold, Italic, 
  List, Link as LinkIcon, Image, Code, MoreHorizontal,
  Layout, Search, Clock, Hash, ArrowLeft, Star, Calendar, Eye,
  Maximize2, Minimize2, Menu
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import ReactMarkdown from 'react-markdown';
import { cn, safeDate } from '../lib/utils';
import GraphView from '../components/GraphView';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { storage, Note } from '../services/storage';

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  notes: Note[];
}

export default function Notes({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { addToast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewMode, setViewMode] = useState<'editor' | 'graph'>('editor');
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isTagsOpen, setIsTagsOpen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '/': true });
  const [editorMode, setEditorMode] = useState<'split' | 'edit' | 'preview'>('edit');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    
    // Set initial
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await storage.getNotes();
      setNotes(data);
    } catch (error: any) {
      console.error('Failed to load notes', error);
      if (error.message === 'Failed to fetch') {
        addToast('Ошибка соединения с сервером', 'error');
      } else {
        addToast('Ошибка загрузки заметок', 'error');
      }
    }
  };

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      if (note.tags) {
        note.tags.split(',').map(t => t.trim()).filter(Boolean).forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [notes]);

  // Calculate backlinks for selected note
  const backlinks = useMemo(() => {
    if (!selectedNote) return [];
    return notes.filter(n => 
      n.id !== selectedNote.id && 
      n.content.includes(`[[${selectedNote.title}]]`)
    );
  }, [selectedNote, notes]);

  // Build Folder Tree
  const tree = useMemo(() => {
    const root: FolderNode = { name: 'Root', path: '/', children: [], notes: [] };
    const filteredNotes = notes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                            n.content.toLowerCase().includes(search.toLowerCase());
      const matchesTag = selectedTag ? n.tags.includes(selectedTag) : true;
      return matchesSearch && matchesTag;
    });
    
    filteredNotes.forEach(note => {
      const folderPath = note.folder || '/';
      if (folderPath === '/') {
        root.notes.push(note);
      } else {
        let folder = root.children.find(c => c.name === folderPath);
        if (!folder) {
          folder = { name: folderPath, path: folderPath, children: [], notes: [] };
          root.children.push(folder);
        }
        folder.notes.push(note);
      }
    });
    return root;
  }, [notes, search, selectedTag]);

  const createNote = async (folder: string = '/') => {
    try {
      const newNote = await storage.addNote({
        title: 'Новая заметка',
        content: '',
        tags: '',
        folder: folder,
        is_guide: 0,
      });
      setNotes([newNote, ...notes]);
      setSelectedNote(newNote);
      setViewMode('editor');
      setExpandedFolders(prev => ({ ...prev, [folder]: true }));
    } catch (err) {
      console.error('Failed to create note:', err);
      addToast('Не удалось создать заметку', 'error');
    }
  };

  const saveNote = async (note: Note) => {
    try {
      const updated = await storage.updateNote(note.id, note);
      setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  // Debounced save
  useEffect(() => {
    if (!selectedNote) return;
    const timer = setTimeout(() => {
      saveNote(selectedNote);
    }, 1000);
    return () => clearTimeout(timer);
  }, [selectedNote?.title, selectedNote?.content, selectedNote?.tags, selectedNote?.folder]);

  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);

  const deleteNote = (note: Note) => {
    setNoteToDelete(note);
  };

  const confirmDelete = async () => {
    if (!noteToDelete) return;
    
    try {
      await storage.deleteNote(noteToDelete.id);
      setNotes(notes.filter((n) => n.id !== noteToDelete.id));
      if (selectedNote?.id === noteToDelete.id) {
        setSelectedNote(null);
      }
      addToast('Заметка удалена', 'success');
      setNoteToDelete(null);
    } catch (err) {
      console.error('Failed to delete note:', err);
      addToast('Не удалось удалить заметку', 'error');
    }
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const insertText = (before: string, after: string = '') => {
    if (!selectedNote) return;
    const textarea = document.querySelector('textarea');
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = selectedNote.content;
    const newText = text.substring(0, start) + before + text.substring(start, end) + after + text.substring(end);
    
    const updatedNote = { ...selectedNote, content: newText };
    setSelectedNote(updatedNote);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  const toggleFavorite = (note: Note) => {
    const updatedNote = { ...note, is_guide: note.is_guide ? 0 : 1 };
    saveNote(updatedNote);
    setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n));
    if (selectedNote?.id === note.id) {
      setSelectedNote(updatedNote);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedNote) return;

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveNote(selectedNote);
      addToast('Заметка сохранена', 'success');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      insertText('**', '**');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      insertText('*', '*');
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      insertText('[[', ']]');
    }
  };

  return (
    <div className={cn(
      "flex glass-panel rounded-2xl border border-white/10 shadow-sm overflow-hidden transition-all duration-300 relative",
      isFullscreen ? "fixed inset-0 z-50 rounded-none h-screen bg-[var(--color-witch-black)]" : "h-[calc(100vh-6rem)]"
    )}>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {(isSidebarOpen && window.innerWidth < 768) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? (window.innerWidth < 768 ? 280 : 280) : 0,
          x: isSidebarOpen ? 0 : (window.innerWidth < 768 ? -280 : 0),
          opacity: isSidebarOpen ? 1 : 0 
        }}
        className={cn(
          "flex-shrink-0 bg-[#0A0A0A] md:bg-white/5 border-r border-white/10 flex flex-col overflow-hidden backdrop-blur-md",
          "fixed md:relative inset-y-0 left-0 z-30 h-full"
        )}
      >
        <div className="p-4 border-b border-white/10 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="font-serif font-semibold text-white flex items-center gap-2 text-glow">
              <FileText className="w-5 h-5 text-white" />
              Гримуар
            </span>
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setViewMode(viewMode === 'graph' ? 'editor' : 'graph')}
                title={viewMode === 'graph' ? "Список" : "Граф"}
                className={cn("h-8 w-8 text-white/60 hover:text-white hover:bg-white/10", viewMode === 'graph' && "bg-white/10 text-white")}
              >
                <Network size={16} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => createNote('/')}
                className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
              >
                <Plus size={16} />
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/40" />
            <Input 
              placeholder="Поиск..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="h-9 pl-9 bg-white/5 border-white/10 focus:bg-white/10 transition-all text-sm text-white placeholder:text-white/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          {/* Tags Section */}
          {allTags.length > 0 && (
            <div className="mb-4">
              <div 
                onClick={() => setIsTagsOpen(!isTagsOpen)}
                className="px-3 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1 cursor-pointer hover:text-white/60"
              >
                <Tag size={10} />
                Теги
                <ChevronDown size={10} className={cn("ml-auto transition-transform", !isTagsOpen && "-rotate-90")} />
              </div>
              <AnimatePresence>
                {isTagsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden px-2 flex flex-wrap gap-1"
                  >
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className={cn(
                          "text-xs px-2 py-1 rounded-full border transition-colors",
                          selectedTag === tag 
                            ? "bg-white/20 text-white border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                            : "bg-white/5 text-white/60 border-white/10 hover:border-white/20 hover:text-white"
                        )}
                      >
                        #{tag}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Favorites Section */}
          {notes.some(n => n.is_guide === 1) && (
            <div className="mb-4">
              <div className="px-3 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Star size={10} className="fill-yellow-400/50 text-yellow-400/50" />
                Избранное
              </div>
              {notes.filter(n => n.is_guide === 1).map(note => (
                <div 
                  key={note.id}
                  onClick={() => { 
                    setSelectedNote(note); 
                    setViewMode('editor'); 
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-all group",
                    selectedNote?.id === note.id 
                      ? "bg-white/10 text-white font-medium shadow-[0_0_10px_rgba(255,255,255,0.1)] border border-white/10" 
                      : "hover:bg-white/5 text-white/60 hover:text-white"
                  )}
                >
                  <FileText size={14} className={cn(selectedNote?.id === note.id ? "text-white shadow-[0_0_5px_white]" : "text-white/40")} />
                  <span className="truncate flex-1">{note.title || 'Без названия'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Folders Section */}
          {tree.children.map(folder => (
            <div key={folder.path} className="mb-1">
              <div 
                onClick={() => toggleFolder(folder.path)}
                className="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm hover:bg-white/5 text-white/80 font-medium select-none transition-colors"
              >
                <span className="text-white/40 group-hover:text-white/60 transition-colors">
                  {expandedFolders[folder.path] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                <Folder size={16} className="text-white/60 fill-white/10" />
                <span className="truncate flex-1">{folder.name}</span>
                <span className="text-xs text-white/30">{folder.notes.length}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); createNote(folder.name); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-md transition-all text-white/60 hover:text-white"
                >
                  <Plus size={12} />
                </button>
              </div>
              
              <AnimatePresence>
                {expandedFolders[folder.path] && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 border-l border-white/5 ml-4 my-1 space-y-0.5">
                      {folder.notes.map(note => (
                        <div 
                          key={note.id}
                          onClick={() => { 
                            setSelectedNote(note); 
                            setViewMode('editor'); 
                            if (window.innerWidth < 768) setIsSidebarOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-all relative group",
                            selectedNote?.id === note.id 
                              ? "bg-white/10 text-white font-medium shadow-[0_0_10px_rgba(255,255,255,0.1)] border border-white/10" 
                              : "hover:bg-white/5 text-white/60 hover:text-white"
                          )}
                        >
                          <span className="truncate flex-1">{note.title || 'Без названия'}</span>
                          {selectedNote?.id !== note.id && (
                            <span className="text-[10px] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity">
                              {note.updated_at ? formatDistanceToNow(safeDate(note.updated_at), { locale: ru, addSuffix: true }) : ''}
                            </span>
                          )}
                        </div>
                      ))}
                      {folder.notes.length === 0 && (
                        <div className="text-xs text-white/30 px-3 py-2 italic">Нет заметок</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Root Notes */}
          {tree.notes.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="px-3 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
                Без папки
              </div>
              {tree.notes.map(note => (
                <div 
                  key={note.id}
                  onClick={() => { 
                    setSelectedNote(note); 
                    setViewMode('editor'); 
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-all group",
                    selectedNote?.id === note.id 
                      ? "bg-white/10 text-white font-medium shadow-[0_0_10px_rgba(255,255,255,0.1)] border border-white/10" 
                      : "hover:bg-white/5 text-white/60 hover:text-white"
                  )}
                >
                  <FileText size={14} className={cn(selectedNote?.id === note.id ? "text-white shadow-[0_0_5px_white]" : "text-white/40")} />
                  <span className="truncate flex-1">{note.title || 'Без названия'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-transparent min-w-0 relative">
        {viewMode === 'graph' ? (
          <div className="flex-1 relative bg-transparent">
            <GraphView 
              notes={notes} 
              onSelectNote={(n) => { 
                setSelectedNote(n); 
                setViewMode('editor'); 
              }} 
            />
          </div>
        ) : selectedNote ? (
          <>
            {/* Editor Header */}
            <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 md:px-6 bg-white/5 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2 text-sm text-white/60 overflow-hidden">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-2 hover:text-white transition-colors md:hidden">
                  <Menu size={18} />
                </button>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-2 hover:text-white transition-colors hidden md:block">
                  <Layout size={18} />
                </button>
                <Folder size={14} className="shrink-0" />
                <span className="truncate max-w-[80px] md:max-w-[100px]">{selectedNote.folder}</span>
                <ChevronRight size={14} className="text-white/20 shrink-0" />
                <span className="truncate font-medium text-white max-w-[100px] md:max-w-none">{selectedNote.title}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => toggleFavorite(selectedNote)}
                  className={cn("text-white/40 hover:text-yellow-400 hidden sm:flex", selectedNote.is_guide === 1 && "text-yellow-400")}
                >
                  <Star size={18} className={cn(selectedNote.is_guide === 1 && "fill-current")} />
                </Button>
                
                <div className="flex bg-white/5 p-0.5 rounded-lg mr-2 border border-white/10 hidden sm:flex">
                  <button 
                    type="button"
                    onClick={() => setEditorMode('edit')}
                    className={cn("px-2 py-1 text-xs font-medium rounded-md transition-all", editorMode === 'edit' ? "bg-white/10 shadow-sm text-white" : "text-white/40 hover:text-white/70")}
                  >
                    Редактор
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditorMode('split')}
                    className={cn("px-2 py-1 text-xs font-medium rounded-md transition-all", editorMode === 'split' ? "bg-white/10 shadow-sm text-white" : "text-white/40 hover:text-white/70")}
                  >
                    Сплит
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditorMode('preview')}
                    className={cn("px-2 py-1 text-xs font-medium rounded-md transition-all", editorMode === 'preview' ? "bg-white/10 shadow-sm text-white" : "text-white/40 hover:text-white/70")}
                  >
                    Просмотр
                  </button>
                </div>

                <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} className="text-white/40 hover:text-white hidden sm:flex">
                  {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </Button>

                <Button variant="ghost" size="icon" onClick={() => deleteNote(selectedNote)} className="text-white/40 hover:text-red-400">
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>

            {/* Note Metadata & Title */}
            <div className="px-4 md:px-8 pt-8 pb-4 max-w-4xl mx-auto w-full">
              <input
                value={selectedNote.title}
                onChange={(e) => setSelectedNote({ ...selectedNote, title: e.target.value })}
                className="text-3xl md:text-4xl font-serif font-bold w-full focus:outline-none placeholder:text-white/20 bg-transparent text-white mb-4 text-glow"
                placeholder="Заголовок заметки..."
              />
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/50 mb-6">
                <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                  <Folder size={14} className="text-white/40" />
                  <input 
                    value={selectedNote.folder}
                    onChange={(e) => setSelectedNote({ ...selectedNote, folder: e.target.value })}
                    className="bg-transparent border-none focus:outline-none w-24 text-white/80 placeholder:text-white/30"
                    placeholder="Папка"
                    list="folder-suggestions"
                  />
                  <datalist id="folder-suggestions">
                    {tree.children.map(f => (
                      <option key={f.path} value={f.name} />
                    ))}
                  </datalist>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                  <Hash size={14} className="text-white/40" />
                  <input 
                    value={selectedNote.tags}
                    onChange={(e) => setSelectedNote({ ...selectedNote, tags: e.target.value })}
                    className="bg-transparent border-none focus:outline-none w-32 md:w-48 text-white/80 placeholder:text-white/30"
                    placeholder="Теги (через запятую)"
                  />
                </div>
                {selectedNote.updated_at && (
                  <div className="flex items-center gap-1.5 text-xs text-white/30 ml-auto hidden sm:flex">
                    <Clock size={12} />
                    Обновлено {formatDistanceToNow(safeDate(selectedNote.updated_at), { locale: ru, addSuffix: true })}
                  </div>
                )}
              </div>

              {/* Formatting Toolbar */}
              <div className="flex items-center gap-1 border-y border-white/10 py-2 mb-4 sticky top-0 bg-[var(--color-witch-black)]/80 backdrop-blur-md z-10 overflow-x-auto no-scrollbar">
                <Button variant="ghost" size="sm" onClick={() => insertText('**', '**')} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                  <Bold size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertText('*', '*')} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                  <Italic size={16} />
                </Button>
                <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />
                <Button variant="ghost" size="sm" onClick={() => insertText('# ')} className="h-8 w-8 p-0 font-bold text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                  H1
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertText('## ')} className="h-8 w-8 p-0 font-bold text-sm text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                  H2
                </Button>
                <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />
                <Button variant="ghost" size="sm" onClick={() => insertText('- ')} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                  <List size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertText('`', '`')} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                  <Code size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => insertText('[[', ']]')} className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 shrink-0">
                  <LinkIcon size={16} />
                </Button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full px-4 md:px-8 pb-8">
              <div className="flex-1 flex overflow-hidden">
                {(editorMode === 'edit' || editorMode === 'split') && (
                  <textarea
                    value={selectedNote.content || ''}
                    onChange={(e) => setSelectedNote({ ...selectedNote, content: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className={cn(
                      "flex-1 resize-none focus:outline-none font-mono text-sm leading-relaxed bg-transparent text-white/90 placeholder:text-white/20 custom-scrollbar",
                      editorMode === 'split' && "border-r border-white/10 pr-4 mr-4 hidden md:block" // Hide split on mobile
                    )}
                    placeholder="Начните писать..."
                    spellCheck={false}
                  />
                )}
                
                {(editorMode === 'preview' || editorMode === 'split') && (
                  <div className={cn("flex-1 overflow-y-auto custom-scrollbar", editorMode === 'split' && "hidden md:block")}>
                    <div className="prose prose-invert prose-sm max-w-none prose-headings:font-serif prose-headings:font-semibold prose-a:text-indigo-400 prose-code:bg-white/10 prose-code:px-1 prose-code:rounded prose-code:text-indigo-300 prose-pre:bg-black/50 prose-pre:text-white/90">
                      <ReactMarkdown
                        components={{
                          a: ({ node, href, children, ...props }) => {
                            if (href?.startsWith('#note/')) {
                              const noteTitle = decodeURIComponent(href.replace('#note/', ''));
                              return (
                                <span 
                                  className="text-indigo-400 cursor-pointer hover:underline font-medium hover:text-indigo-300 transition-colors"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const targetNote = notes.find(n => n.title === noteTitle);
                                    if (targetNote) setSelectedNote(targetNote);
                                    else addToast(`Заметка "${noteTitle}" не найдена`, 'error');
                                  }}
                                >
                                  {children}
                                </span>
                              );
                            }
                            return <a href={href} {...props} target="_blank" rel="noopener noreferrer">{children}</a>;
                          }
                        }}
                      >
                        {(selectedNote.content || '').replace(/\[\[(.*?)\]\]/g, '[$1](#note/$1)')} 
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              {/* Backlinks Section */}
              {backlinks.length > 0 && (
                <div className="mt-8 pt-4 border-t border-white/10 shrink-0">
                  <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                    Ссылки на эту заметку
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {backlinks.map(link => (
                      <button
                        key={link.id}
                        onClick={() => setSelectedNote(link)}
                        className="text-sm px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-md border border-white/10 transition-colors flex items-center gap-2"
                      >
                        <FileText size={14} className="text-white/40" />
                        {link.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/40 bg-transparent relative">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="absolute top-4 left-4 p-2 hover:text-white transition-colors md:hidden"
            >
              <Menu size={24} />
            </button>
            <div className="w-20 h-20 bg-white/5 rounded-2xl shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-white/10 flex items-center justify-center mb-6">
              <FileText size={40} className="text-white/20" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2 font-serif text-glow">Выберите заметку</h3>
            <p className="text-sm text-white/50 max-w-xs text-center mb-6">
              Выберите заметку из списка слева или создайте новую, чтобы начать писать.
            </p>
            <Button onClick={() => createNote('/')} className="bg-white text-black hover:bg-white/90 shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <Plus size={16} className="mr-2" />
              Создать заметку
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {noteToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-white/10"
            >
              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30">
                    <Trash2 className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Удалить заметку?</h3>
                    <p className="text-sm text-white/60">
                      Вы собираетесь удалить "{noteToDelete.title}". Это действие нельзя отменить.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="ghost" onClick={() => setNoteToDelete(null)} className="text-white/60 hover:text-white hover:bg-white/10">
                    Отмена
                  </Button>
                  <Button 
                    onClick={confirmDelete}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30"
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
