import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import db from './src/db';

const app = express();
const PORT = 3000;

// Middleware for JSON parsing
app.use(express.json());

// Ensure uploads directory exists
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

import { seedDatabase } from './src/seed';

// Seed database on startup for demo purposes
try {
  seedDatabase();
} catch (error) {
  console.error('Failed to seed database on startup:', error);
}

app.post('/api/seed', (req, res) => {
  try {
    seedDatabase();
    res.json({ success: true, message: 'Database seeded successfully' });
  } catch (error: any) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: 'Failed to seed database', details: error.message });
  }
});

// Tasks Routes
app.get('/api/tasks', (req, res) => {
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', (req, res) => {
  try {
    const { title, description, status, priority, start_date, due_date, assignee } = req.body;
    const id = uuidv4();
    const stmt = db.prepare('INSERT INTO tasks (id, title, description, status, priority, start_date, due_date, assignee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, title, description, status || 'todo', priority || 'medium', start_date, due_date, assignee);
    res.json({ id, title, description, status, priority, start_date, due_date, assignee });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, start_date, due_date, assignee } = req.body;
    const stmt = db.prepare('UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, start_date = ?, due_date = ?, assignee = ? WHERE id = ?');
    stmt.run(title, description, status, priority, start_date, due_date, assignee, id);
    res.json({ id, title, description, status, priority, start_date, due_date, assignee });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- API Routes ---

// Notes / Knowledge Base
app.get('/api/notes', (req, res) => {
  if (req.query.all === 'true') {
    const stmt = db.prepare('SELECT * FROM notes ORDER BY updated_at DESC');
    const notes = stmt.all();
    return res.json(notes);
  }
  const isGuide = req.query.is_guide === 'true' ? 1 : 0;
  const stmt = db.prepare('SELECT * FROM notes WHERE is_guide = ? ORDER BY updated_at DESC');
  const notes = stmt.all(isGuide);
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const { title, content, tags, is_guide, folder } = req.body;
  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO notes (id, title, content, tags, is_guide, folder) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(id, title, content, tags || '', is_guide ? 1 : 0, folder || '/');
  res.json({ id, title, content, tags, is_guide, folder: folder || '/' });
});

app.put('/api/notes/:id', (req, res) => {
  const { title, content, tags, is_guide, folder } = req.body;
  const { id } = req.params;
  const stmt = db.prepare('UPDATE notes SET title = ?, content = ?, tags = ?, is_guide = ?, folder = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  stmt.run(title, content, tags || '', is_guide ? 1 : 0, folder || '/', id);
  res.json({ id, title, content, tags, is_guide, folder });
});

app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// Files / Cloud
app.get('/api/files', (req, res) => {
  const parentId = req.query.parent_id || null;
  const stmt = db.prepare('SELECT * FROM files WHERE parent_id IS ? ORDER BY is_folder DESC, name ASC');
  const files = stmt.all(parentId);
  res.json(files);
});

app.get('/api/folders/all', (req, res) => {
  const stmt = db.prepare('SELECT * FROM files WHERE is_folder = 1 ORDER BY name ASC');
  const folders = stmt.all();
  res.json(folders);
});

app.post('/api/folders', (req, res) => {
  try {
    const { name, parent_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });
    
    const id = uuidv4();
    const stmt = db.prepare('INSERT INTO files (id, name, is_folder, parent_id) VALUES (?, ?, 1, ?)');
    stmt.run(id, name, parent_id || null);
    res.json({ id, name, is_folder: 1, parent_id });
  } catch (error: any) {
    console.error('Error creating folder:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const { parent_id } = req.body;
  const id = uuidv4();
  
  let content = null;
  // Simple text extraction for text-based files
  if (req.file.mimetype.startsWith('text/') || 
      req.file.mimetype === 'application/json' || 
      req.file.mimetype === 'application/javascript' ||
      req.file.originalname.endsWith('.md') ||
      req.file.originalname.endsWith('.txt') ||
      req.file.originalname.endsWith('.ts') ||
      req.file.originalname.endsWith('.tsx') ||
      req.file.originalname.endsWith('.css') ||
      req.file.originalname.endsWith('.html')
  ) {
    try {
      content = fs.readFileSync(req.file.path, 'utf-8');
      // Limit content size to avoid DB bloat (e.g., 10KB)
      if (content.length > 10000) {
        content = content.substring(0, 10000) + '... (truncated)';
      }
    } catch (err) {
      console.error('Error reading file content:', err);
    }
  }

  const stmt = db.prepare('INSERT INTO files (id, name, path, size, type, is_folder, parent_id, content) VALUES (?, ?, ?, ?, ?, 0, ?, ?)');
  stmt.run(id, req.file.originalname, req.file.filename, req.file.size, req.file.mimetype, parent_id || null, content);
  
  res.json({ id, name: req.file.originalname, size: req.file.size, type: req.file.mimetype, parent_id, content });
});

app.delete('/api/files/:id', (req, res) => {
  const { id } = req.params;

  const getItemStmt = db.prepare('SELECT * FROM files WHERE id = ?');
  const getChildrenStmt = db.prepare('SELECT id FROM files WHERE parent_id = ?');
  const deleteItemStmt = db.prepare('DELETE FROM files WHERE id = ?');

  const deleteRecursive = (itemId: string) => {
    const item = getItemStmt.get(itemId) as any;
    if (!item) return;

    if (item.is_folder) {
      const children = getChildrenStmt.all(itemId) as any[];
      for (const child of children) {
        deleteRecursive(child.id);
      }
    } else {
      if (item.path) {
        const filePath = path.join(uploadDir, item.path);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.error(`Failed to delete file ${filePath}:`, err);
          }
        }
      }
    }

    deleteItemStmt.run(itemId);
  };

  try {
    const transaction = db.transaction(() => {
      deleteRecursive(id);
    });
    transaction();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

app.put('/api/files/:id/move', (req, res) => {
  const { id } = req.params;
  const { parent_id } = req.body;
  
  try {
    const stmt = db.prepare('UPDATE files SET parent_id = ? WHERE id = ?');
    const result = stmt.run(parent_id || null, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json({ success: true, id, parent_id });
  } catch (error: any) {
    console.error('Error moving file:', error);
    res.status(500).json({ error: 'Failed to move file' });
  }
});

// Accounts / Passwords
app.get('/api/accounts', (req, res) => {
  const stmt = db.prepare('SELECT * FROM accounts ORDER BY service ASC');
  const accounts = stmt.all();
  res.json(accounts);
});

app.post('/api/accounts', (req, res) => {
  const { title, service, username, password, url, category } = req.body;
  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO accounts (id, title, service, username, password, url, category) VALUES (?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, title || service, service, username, password, url, category);
  res.json({ id, title: title || service, service, username, password, url, category });
});

app.delete('/api/accounts/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
  stmt.run(id);
  res.json({ success: true });
});

// Finance
app.get('/api/transactions', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM transactions ORDER BY date DESC');
    const transactions = stmt.all();
    res.json(transactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', (req, res) => {
  try {
    const { amount, type, category, model_name, platform, description, date } = req.body;
    const id = uuidv4();
    const stmt = db.prepare('INSERT INTO transactions (id, amount, type, category, model_name, platform, description, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, amount, type, category, model_name || 'General', platform || 'Other', description, date || new Date().toISOString().split('T')[0]);
    res.json({ id, amount, type, category, model_name: model_name || 'General', platform: platform || 'Other', description, date });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.put('/api/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, category, model_name, platform, description, date } = req.body;
    const stmt = db.prepare('UPDATE transactions SET amount = ?, type = ?, category = ?, model_name = ?, platform = ?, description = ?, date = ? WHERE id = ?');
    stmt.run(amount, type, category, model_name, platform, description, date, id);
    res.json({ id, amount, type, category, model_name, platform, description, date });
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

app.delete('/api/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
    stmt.run(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});


// --- Vite Middleware ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production (if built)
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
