import { supabase } from '../lib/supabase';

// Types
export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  platform: string;
  model_name?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string;
  folder: string;
  is_guide: number;
  updated_at: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee?: string;
  start_date?: string;
  due_date?: string;
  created_at: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  is_folder: number;
  updated_at: string;
  path?: string;
  parent_id?: string | null;
  content?: string | null;
}

export interface Account {
  id: string;
  title?: string;
  service: string;
  username: string;
  password: string;
  url: string;
  category: string;
}

// Service
class StorageService {
  // Helper to get current user
  private async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user;
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
    const user = await this.getUser();
    const { data, error } = await supabase
      .from('transactions')
      .insert([{ ...transaction, user_id: user.id }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async deleteTransaction(id: string): Promise<void> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  // Notes
  async getNotes(): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  }

  async addNote(note: Omit<Note, 'id' | 'created_at' | 'updated_at'>): Promise<Note> {
    const user = await this.getUser();
    const { data, error } = await supabase
      .from('notes')
      .insert([{ ...note, user_id: user.id }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async updateNote(id: string, updates: Partial<Note>): Promise<Note> {
    const { data, error } = await supabase
      .from('notes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async deleteNote(id: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  // Tasks
  async getTasks(): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  }

  async addTask(task: Omit<Task, 'id' | 'created_at'>): Promise<Task> {
    const user = await this.getUser();
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ ...task, user_id: user.id }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async deleteTask(id: string): Promise<void> {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  // Files
  async getFiles(parentId: string | null = null): Promise<FileItem[]> {
    let query = supabase
      .from('files')
      .select('*')
      .order('is_folder', { ascending: false })
      .order('name', { ascending: true });

    if (parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', parentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getAllFiles(): Promise<FileItem[]> {
    const { data, error } = await supabase
      .from('files')
      .select('*');
      
    if (error) throw error;
    return data || [];
  }

  async addFile(file: Omit<FileItem, 'id' | 'updated_at'>): Promise<FileItem> {
    const user = await this.getUser();
    const { data, error } = await supabase
      .from('files')
      .insert([{ ...file, user_id: user.id }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async createFolder(name: string, parentId: string | null): Promise<FileItem> {
    return this.addFile({
      name,
      type: 'folder',
      size: 0,
      is_folder: 1,
      parent_id: parentId
    });
  }

  async deleteFile(id: string): Promise<void> {
    // Note: Supabase cascade delete handles children if configured in SQL
    // But we can also do it recursively if needed. 
    // Since we set ON DELETE CASCADE in SQL, just deleting the parent is enough.
    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  async moveFile(id: string, newParentId: string | null): Promise<void> {
    const { error } = await supabase
      .from('files')
      .update({ parent_id: newParentId, updated_at: new Date().toISOString() })
      .eq('id', id);
      
    if (error) throw error;
  }

  // Accounts
  async getAccounts(): Promise<Account[]> {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  }

  async addAccount(account: Omit<Account, 'id'>): Promise<Account> {
    const user = await this.getUser();
    const { data, error } = await supabase
      .from('accounts')
      .insert([{ ...account, user_id: user.id }])
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }

  async deleteAccount(id: string): Promise<void> {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
}

export const storage = new StorageService();
