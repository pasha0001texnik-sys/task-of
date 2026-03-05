import { useState, useEffect, useMemo } from 'react';
import { Folder, File, Upload, Trash2, ChevronRight, ChevronDown, Home, Download, X, FileVideo, FileImage, FileText, Plus, Search, Layout, MoreVertical, Copy, Move, Edit, Menu, ChevronLeft } from 'lucide-react';

import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { format } from 'date-fns';
import { cn, safeDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel,
} from '../components/ui/ContextMenu';
import { storage, FileItem } from '../services/storage';

interface FolderNode extends FileItem {
  children: FolderNode[];
}

export default function CloudDrive({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const { addToast } = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [allFolders, setAllFolders] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedFile, setDraggedFile] = useState<FileItem | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [search, setSearch] = useState('');

  const [itemToDelete, setItemToDelete] = useState<FileItem | null>(null);

  useEffect(() => {
    loadFiles();
    loadAllFolders();
  }, [currentFolder]);

  const loadFiles = async () => {
    try {
      const data = await storage.getFiles(currentFolder);
      setFiles(data);
    } catch (error: any) {
      console.error('Failed to load files', error);
      if (error.message === 'Failed to fetch') {
        addToast('Ошибка соединения с сервером', 'error');
      } else {
        addToast('Ошибка загрузки файлов', 'error');
      }
    }
  };

  const loadAllFolders = async () => {
    try {
      const allFiles = await storage.getAllFiles();
      const data = allFiles.filter(f => f.is_folder === 1);
      setAllFolders(data);
    } catch (error) {
      console.error('Failed to load folders', error);
    }
  };

  // Build Folder Tree
  const folderTree = useMemo(() => {
    const folderMap = new Map<string, FolderNode>();
    const rootChildren: FolderNode[] = [];

    // Initialize nodes
    allFolders.forEach(f => {
      folderMap.set(f.id, { ...f, children: [] });
    });

    // Build hierarchy
    allFolders.forEach(f => {
      const node = folderMap.get(f.id)!;
      if (f.parent_id && folderMap.has(f.parent_id)) {
        folderMap.get(f.parent_id)!.children.push(node);
      } else {
        // Only add to root if parent_id is null/undefined OR parent doesn't exist (orphan)
        // But for tree view we usually only want true roots (parent_id is null)
        if (!f.parent_id) {
            rootChildren.push(node);
        }
      }
    });

    return rootChildren;
  }, [allFolders]);

  const toggleFolderExpand = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleFolderSelect = (folderId: string | null, folderName: string) => {
    setCurrentFolder(folderId);
    
    // Reconstruct breadcrumbs based on selected folder
    if (folderId === null) {
      setBreadcrumbs([]);
    } else {
      const path: { id: string; name: string }[] = [];
      let currentId: string | null = folderId;
      
      // Helper to find folder in allFolders
      const findFolder = (id: string) => allFolders.find(f => f.id === id);

      // We need to traverse up, but since we only have parent_id, we can do it iteratively
      // However, we need to be careful about infinite loops if data is corrupted (circular ref)
      let safetyCounter = 0;
      while (currentId && safetyCounter < 100) {
        const folder = findFolder(currentId);
        if (folder) {
          path.unshift({ id: folder.id, name: folder.name });
          currentId = folder.parent_id || null;
        } else {
          break;
        }
        safetyCounter++;
      }
      setBreadcrumbs(path);
    }
  };

  const FolderTreeItem = ({ node, depth = 0 }: { node: FolderNode, depth?: number }) => {
    const isExpanded = expandedFolders[node.id];
    const isSelected = currentFolder === node.id;
    const hasChildren = node.children.length > 0;

    return (
      <div className="select-none">
        <div 
          className={cn(
            "flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors group",
            isSelected 
              ? "bg-white/10 text-white font-medium shadow-[0_0_10px_rgba(255,255,255,0.1)] border border-white/10" 
              : "hover:bg-white/5 text-white/60 hover:text-white"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => handleFolderSelect(node.id, node.name)}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (draggedFile && draggedFile.id !== node.id) {
               setDragOverFolderId(node.id);
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragOverFolderId === node.id) {
               setDragOverFolderId(null);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDrop(e, node);
          }}
        >
          <button 
            onClick={(e) => { e.stopPropagation(); toggleFolderExpand(node.id); }}
            className={cn("p-0.5 rounded hover:bg-white/10 text-white/40 transition-colors", !hasChildren && "invisible")}
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          <Folder size={14} className={cn("shrink-0", isSelected ? "text-indigo-400 fill-indigo-400/20" : "text-white/40 fill-white/5")} />
          <span className="truncate flex-1">{node.name}</span>
        </div>
        
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {node.children.map(child => (
                <FolderTreeItem key={child.id} node={child} depth={depth + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    
    // Mock upload - just create a file entry
    const file = e.target.files[0];
    
    // In a real app, we would upload the file to Supabase Storage here
    // For now, we just create the metadata record
    setTimeout(async () => {
        try {
            await storage.addFile({
                name: file.name,
                type: file.type,
                size: file.size,
                is_folder: 0,
                parent_id: currentFolder
            });
            addToast('Файл загружен', 'success');
            loadFiles();
        } catch (error) {
            console.error('Upload error:', error);
            addToast('Ошибка загрузки файла', 'error');
        } finally {
            setUploading(false);
        }
    }, 1000);
  };

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setUploading(true);
    try {
      await storage.createFolder(newFolderName, currentFolder);
      
      setNewFolderName('');
      setIsCreatingFolder(false);
      loadFiles();
      loadAllFolders(); // Refresh tree
      addToast('Папка создана', 'success');
    } catch (error) {
      console.error('Create folder error:', error);
      addToast('Ошибка создания папки', 'error');
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await storage.deleteFile(itemToDelete.id);
      loadFiles();
      loadAllFolders(); // Refresh tree
      if (previewFile?.id === itemToDelete.id) setPreviewFile(null);
      addToast('Элемент удален', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      addToast('Ошибка удаления', 'error');
    } finally {
      setItemToDelete(null);
    }
  };

  const deleteItem = (file: FileItem) => {
    setItemToDelete(file);
  };

  const moveFile = async (fileId: string, targetParentId: string | null, targetName: string) => {
    try {
      await storage.moveFile(fileId, targetParentId);
      
      addToast(`Перемещено в ${targetName}`, 'success');
      loadFiles();
      loadAllFolders(); // Refresh tree
      setDraggedFile(null);
    } catch (error) {
      console.error('Move error:', error);
      addToast('Ошибка перемещения', 'error');
    }
  };

  const handleDragStart = (e: React.DragEvent, file: FileItem) => {
    setDraggedFile(file);
    e.dataTransfer.setData('text/plain', file.id);
    e.dataTransfer.effectAllowed = 'move';
    
    if (file.path) {
      const fileUrl = `${window.location.origin}/uploads/${file.path}`;
      e.dataTransfer.setData('DownloadURL', `${file.type}:${file.name}:${fileUrl}`);
    }
  };

  const handleDragOver = (e: React.DragEvent, targetFile: FileItem) => {
    e.preventDefault();
    if (!draggedFile) return;
    if (targetFile.id === draggedFile.id) return;
    if (!targetFile.is_folder) return;
    
    e.dataTransfer.dropEffect = 'move';
    if (dragOverFolderId !== targetFile.id) {
        setDragOverFolderId(targetFile.id);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolder: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    
    if (!draggedFile) return;
    if (targetFolder.id === draggedFile.id) return;
    // Allow dropping on folders (is_folder check is implicit if targetFolder comes from tree or list)

    await moveFile(draggedFile.id, targetFolder.id, targetFolder.name);
  };

  const handleBreadcrumbDrop = async (e: React.DragEvent, targetId: string | null, targetName: string) => {
    e.preventDefault();
    if (!draggedFile) return;
    if (draggedFile.id === targetId) return;
    if (currentFolder === targetId) return; 

    await moveFile(draggedFile.id, targetId, targetName);
  };

  const handleBreadcrumbDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedFile) return;
    e.dataTransfer.dropEffect = 'move';
  };

  const handleFileClick = (file: FileItem) => {
    if (file.is_folder) {
      handleFolderSelect(file.id, file.name);
    } else {
      setPreviewFile(file);
    }
  };

  const navigateUp = (index: number) => {
    if (index === -1) {
      handleFolderSelect(null, 'Root');
    } else {
      const target = breadcrumbs[index];
      handleFolderSelect(target.id, target.name);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="h-5 w-5 text-purple-400" />;
    if (type.startsWith('video/')) return <FileVideo className="h-5 w-5 text-rose-400" />;
    if (type.includes('pdf') || type.includes('text')) return <FileText className="h-5 w-5 text-blue-400" />;
    return <File className="h-5 w-5 text-white/40" />;
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] glass-panel rounded-2xl border border-white/10 shadow-sm overflow-hidden transition-all duration-300 relative">
      {/* Sidebar */}
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
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1, width: 260 }}
              exit={{ x: -260, opacity: 0, width: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="fixed md:relative inset-y-0 left-0 z-30 flex-shrink-0 bg-[#0A0A0A] md:bg-white/5 border-r border-white/10 flex flex-col overflow-hidden backdrop-blur-md h-full"
            >
              <div className="p-4 border-b border-white/10 flex flex-col gap-3 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-semibold text-white flex items-center gap-2 text-glow">
                    <Folder className="w-5 h-5 text-white" />
                    Папки
                  </span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsCreatingFolder(true)}
                      className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Plus size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setIsSidebarOpen(false)}
                      className="md:hidden h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <X size={16} />
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
                <div 
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm transition-colors mb-1",
                    currentFolder === null 
                      ? "bg-white/10 text-white font-medium shadow-[0_0_10px_rgba(255,255,255,0.1)] border border-white/10" 
                      : "hover:bg-white/5 text-white/60 hover:text-white"
                  )}
                  onClick={() => handleFolderSelect(null, 'Root')}
                  onDragOver={(e) => {
                     e.preventDefault();
                     if (draggedFile) setDragOverFolderId('root');
                  }}
                  onDragLeave={() => setDragOverFolderId(null)}
                  onDrop={(e) => {
                     e.preventDefault();
                     if (draggedFile) moveFile(draggedFile.id, null, 'Root');
                  }}
                >
                  <Home size={14} className={cn("shrink-0", currentFolder === null ? "text-white shadow-[0_0_5px_white]" : "text-white/40")} />
                  <span className="truncate">Корневая папка</span>
                </div>

                {folderTree.map(node => (
                  <FolderTreeItem key={node.id} node={node} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-transparent min-w-0 relative">
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-white/5 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 text-sm text-white/60 overflow-hidden">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-2 hover:text-white transition-colors md:hidden">
              <Menu size={18} />
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-2 hover:text-white transition-colors hidden md:block">
              <Layout size={18} />
            </button>
            
            <div className="flex items-center overflow-x-auto no-scrollbar">
               <button 
                 onClick={() => navigateUp(-1)}
                 onDragOver={handleBreadcrumbDragOver}
                 onDrop={(e) => handleBreadcrumbDrop(e, null, 'Root')}
                 className="hover:text-white flex items-center px-1.5 py-1 rounded hover:bg-white/10 transition-colors shrink-0"
               >
                 <Home className="h-4 w-4" />
               </button>
               {breadcrumbs.map((crumb, index) => (
                 <div key={crumb.id} className="flex items-center shrink-0">
                   <ChevronRight className="h-4 w-4 mx-0.5 text-white/20" />
                   <button
                     onClick={() => navigateUp(index)}
                     onDragOver={handleBreadcrumbDragOver}
                     onDrop={(e) => handleBreadcrumbDrop(e, crumb.id, crumb.name)}
                     className="hover:text-white font-medium px-1.5 py-1 rounded hover:bg-white/10 transition-colors truncate max-w-[100px] md:max-w-[150px]"
                   >
                     {crumb.name}
                   </button>
                 </div>
               ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleUpload}
                disabled={uploading}
              />
              <Button disabled={uploading} size="sm" className="bg-white text-black hover:bg-white/90">
                <Upload className="mr-2 h-4 w-4" /> <span className="hidden sm:inline">{uploading ? 'Загрузка...' : 'Загрузить'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* File List Area */}
        <div className="flex-1 flex overflow-hidden relative">
          <div className={cn("flex-1 overflow-y-auto custom-scrollbar transition-all", previewFile ? "hidden md:block md:w-2/3 border-r border-white/10" : "w-full")}>
            <div className="min-w-[600px] md:min-w-0">
                <table className="w-full text-sm text-left">
                <thead className="bg-white/5 text-white/40 border-b border-white/10 sticky top-0 z-10">
                    <tr>
                    <th className="px-6 py-3 font-medium uppercase text-xs tracking-wider">Имя</th>
                    <th className="px-6 py-3 font-medium w-32 uppercase text-xs tracking-wider">Размер</th>
                    <th className="px-6 py-3 font-medium w-48 uppercase text-xs tracking-wider">Дата</th>
                    <th className="px-6 py-3 font-medium w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {files.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-white/30 italic">
                        Папка пуста
                        </td>
                    </tr>
                    ) : (
                    files.map((file) => (
                        <ContextMenu key={file.id}>
                        <ContextMenuTrigger asChild>
                            <tr 
                            className={cn(
                                "hover:bg-white/5 group transition-colors cursor-pointer",
                                previewFile?.id === file.id && "bg-white/10",
                                dragOverFolderId === file.id && "bg-indigo-500/20 ring-1 ring-indigo-500/50"
                            )}
                            onClick={() => handleFileClick(file)}
                            draggable
                            onDragStart={(e) => handleDragStart(e, file)}
                            onDragOver={(e) => file.is_folder ? handleDragOver(e, file) : undefined}
                            onDragLeave={(e) => file.is_folder ? handleDragLeave(e) : undefined}
                            onDrop={(e) => file.is_folder ? handleDrop(e, file) : undefined}
                            >
                            <td className="px-6 py-3">
                                <div className="flex items-center gap-3">
                                {file.is_folder ? (
                                    <Folder className="h-8 w-8 text-indigo-400 fill-indigo-400/20" />
                                ) : file.type.startsWith('image/') && file.path ? (
                                    <img 
                                    src={`/uploads/${file.path}`} 
                                    alt={file.name}
                                    className="h-8 w-8 rounded object-cover border border-white/10 bg-white/5"
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                                    {getFileIcon(file.type)}
                                    </div>
                                )}
                                <span className={cn("font-medium truncate max-w-[150px] md:max-w-none", file.is_folder ? "text-white" : "text-white/80")}>
                                    {file.name}
                                </span>
                                </div>
                            </td>
                            <td className="px-6 py-3 text-white/50">
                                {file.is_folder ? '-' : formatSize(file.size)}
                            </td>
                            <td className="px-6 py-3 text-white/50">
                                {format(safeDate(file.updated_at), 'dd.MM.yyyy HH:mm')}
                            </td>
                            <td className="px-6 py-3 text-right">
                                <button
                                onClick={(e) => { e.stopPropagation(); deleteItem(file); }}
                                className="text-white/30 hover:text-red-400 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                >
                                <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                            </tr>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-64 glass-panel border-white/10 bg-[#1a1b2e]/90 text-white">
                            <ContextMenuLabel className="text-white/60">{file.name}</ContextMenuLabel>
                            <ContextMenuSeparator className="bg-white/10" />
                            <ContextMenuItem onSelect={() => handleFileClick(file)} className="focus:bg-white/10 focus:text-white">
                            <File className="mr-2 h-4 w-4" /> Открыть
                            </ContextMenuItem>
                            {!file.is_folder && (
                            <ContextMenuItem onSelect={() => {
                                const link = document.createElement('a');
                                link.href = `/uploads/${file.path}`;
                                link.download = file.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }} className="focus:bg-white/10 focus:text-white">
                                <Download className="mr-2 h-4 w-4" /> Скачать
                            </ContextMenuItem>
                            )}
                            <ContextMenuSeparator className="bg-white/10" />
                            <ContextMenuItem 
                            onSelect={() => deleteItem(file)} 
                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                            >
                            <Trash2 className="mr-2 h-4 w-4" /> Удалить
                            </ContextMenuItem>
                        </ContextMenuContent>
                        </ContextMenu>
                    ))
                    )}
                </tbody>
                </table>
            </div>
          </div>

          {/* Preview Panel */}
          <AnimatePresence>
            {previewFile && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className={cn(
                    "bg-[#0A0A0A] md:bg-white/5 flex flex-col overflow-hidden border-l border-white/10 backdrop-blur-md",
                    "fixed inset-0 z-40 md:static md:w-1/3"
                )}
                style={{ width: undefined }} // Let classes handle width
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 shrink-0">
                  <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setPreviewFile(null)}
                        className="md:hidden p-1 -ml-2 text-white/60 hover:text-white"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h3 className="font-medium text-white truncate pr-4 text-sm max-w-[200px]" title={previewFile.name}>
                        {previewFile.name}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setPreviewFile(null)}
                    className="text-white/40 hover:text-white transition-colors hidden md:block"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                  {previewFile.type.startsWith('image/') ? (
                    <img 
                      src={`/uploads/${previewFile.path}`} 
                      alt={previewFile.name} 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-white/10"
                    />
                  ) : previewFile.type.startsWith('video/') ? (
                    <video 
                      controls 
                      src={`/uploads/${previewFile.path}`} 
                      className="max-w-full max-h-full rounded-lg shadow-sm border border-white/10"
                    />
                  ) : previewFile.content ? (
                    <div className="w-full h-full p-4 bg-white/5 rounded-lg shadow-sm border border-white/10 overflow-auto text-sm font-mono whitespace-pre-wrap text-white/80">
                      {previewFile.content}
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10 shadow-sm">
                        {getFileIcon(previewFile.type)}
                      </div>
                      <p className="text-white/40 text-sm">Предпросмотр недоступен</p>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5 space-y-4 shrink-0">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-white/40 uppercase tracking-wider mb-1 font-medium">Тип</p>
                      <p className="text-white/80 font-medium truncate" title={previewFile.type}>{previewFile.type}</p>
                    </div>
                    <div>
                      <p className="text-white/40 uppercase tracking-wider mb-1 font-medium">Размер</p>
                      <p className="text-white/80 font-medium">{formatSize(previewFile.size)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-white/40 uppercase tracking-wider mb-1 font-medium">Загружено</p>
                      <p className="text-white/80 font-medium">
                        {format(safeDate(previewFile.updated_at), 'dd MMMM yyyy, HH:mm')}
                      </p>
                    </div>
                  </div>

                  <a 
                    href={`/uploads/${previewFile.path}`} 
                    download={previewFile.name}
                    className="flex items-center justify-center w-full gap-2 bg-white text-black hover:bg-white/90 py-2 rounded-md font-medium transition-colors text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Скачать
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Folder Modal */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel rounded-xl shadow-xl animate-in fade-in zoom-in duration-200 border border-white/10">
            <div className="p-6 pb-2">
              <h3 className="text-lg font-bold text-white">Новая папка</h3>
            </div>
            <div className="p-6 pt-2">
              <form onSubmit={createFolder} className="space-y-4">
                <Input
                  autoFocus
                  placeholder="Название папки"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  disabled={uploading}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsCreatingFolder(false)} disabled={uploading} className="text-white/60 hover:text-white hover:bg-white/10">
                    Отмена
                  </Button>
                  <Button type="submit" disabled={!newFolderName.trim() || uploading} className="bg-white text-black hover:bg-white/90">
                    {uploading ? 'Создание...' : 'Создать'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm glass-panel rounded-xl shadow-xl animate-in fade-in zoom-in duration-200 border border-white/10">
            <div className="p-6 pb-2">
              <h3 className="text-lg font-bold text-white">Удалить элемент?</h3>
            </div>
            <div className="p-6 pt-2">
              <p className="text-white/60 mb-4">
                Вы действительно хотите удалить <span className="font-medium text-white">{itemToDelete.name}</span>? Это действие нельзя отменить.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setItemToDelete(null)} className="text-white/60 hover:text-white hover:bg-white/10">
                  Отмена
                </Button>
                <Button variant="danger" onClick={confirmDelete} className="bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30">
                  Удалить
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
