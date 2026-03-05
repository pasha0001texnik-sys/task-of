import db from './db';
import { v4 as uuidv4 } from 'uuid';
import { subDays, format, addDays } from 'date-fns';

export const seedDatabase = () => {
  console.log('Seeding database with OFM Agency Data...');

  // Clear existing data
  db.exec('DELETE FROM notes');
  db.exec('DELETE FROM files');
  db.exec('DELETE FROM accounts');
  db.exec('DELETE FROM transactions');
  db.exec('DELETE FROM messages');
  db.exec('DELETE FROM tasks');

  // --- 1. Seed Notes & Library ---
  const notes = [
    {
      id: uuidv4(),
      title: 'Chatter Script - "The Girlfriend Experience"',
      content: '# GFE Script Strategy\n\n1. **Morning Routine**: Send a "Good morning" voice note.\n2. **Mid-day check-in**: Ask about their lunch/work.\n3. **Evening**: Tease a new set or PPV.\n\n**Key Phrases**:\n- "I was thinking about you..."\n- "Wish you were here..."\n\n**Upsell Flow**:\nFree Chat -> Nude Preview -> PPV Video ($25+)',
      tags: 'script,sales,training',
      folder: 'Scripts',
      is_guide: 1,
      updated_at: subDays(new Date(), 5).toISOString()
    },
    {
      id: uuidv4(),
      title: 'Model Onboarding Checklist',
      content: '# New Model Onboarding\n\n1. **Access**: Get login credentials for OF, IG, TikTok.\n2. **Content Audit**: Review existing vault.\n3. **Pricing**: Set subscription price and PPV tiers.\n4. **Bio Optimization**: Update links (Linktree/Beacons).\n5. **Welcome Post**: Schedule introduction post.',
      tags: 'onboarding,admin,process',
      folder: 'Operations',
      is_guide: 1,
      updated_at: subDays(new Date(), 10).toISOString()
    },
    {
      id: uuidv4(),
      title: 'Bella Rose - Brand Deal Strategy',
      content: '# Bella Rose x LingerieBrand\n\n**Deliverables**:\n- 1 IG Reel\n- 1 TikTok\n- 3 Story sets\n\n**Timeline**:\n- Draft approval: Friday\n- Posting: Monday\n\n**Commission**: 20% agency fee on the $5k deal.',
      tags: 'brand,bella,strategy',
      folder: 'Models/Bella',
      is_guide: 0,
      updated_at: subDays(new Date(), 2).toISOString()
    },
    {
      id: uuidv4(),
      title: 'Daily Traffic Routine',
      content: '# Traffic Sources\n\n- **Reddit**: Post in r/gonewild, r/fitgirls (3x daily).\n- **TikTok**: Trend hopping (2x daily).\n- **Twitter**: Reply baiting under viral tweets.\n- **Dating Apps**: Tinder funnel to IG.',
      tags: 'marketing,traffic,guide',
      folder: 'Marketing',
      is_guide: 1,
      updated_at: subDays(new Date(), 15).toISOString()
    },
    {
      id: uuidv4(),
      title: 'Weekly Performance Review',
      content: '# Weekly Review\n\n**Top Performer**: Chloe Star (+15% revenue)\n**Needs Improvement**: Traffic for New Model X\n\n**Action Items**:\n- Hire 2 new chatters for night shift.\n- Update PPV pricing for older content.',
      tags: 'meeting,internal,review',
      folder: 'Meetings',
      is_guide: 0,
      updated_at: subDays(new Date(), 1).toISOString()
    }
  ];

  const insertNote = db.prepare('INSERT INTO notes (id, title, content, tags, folder, is_guide, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  notes.forEach(note => insertNote.run(note.id, note.title, note.content, note.tags, note.folder, note.is_guide, note.updated_at));

  // --- 2. Seed Files (Virtual) ---
  const modelsFolderId = uuidv4();
  const contractsFolderId = uuidv4();
  const contentFolderId = uuidv4();

  const files = [
    {
      id: modelsFolderId,
      name: 'Models',
      path: '',
      size: 0,
      type: 'folder',
      parent_id: null,
      is_folder: 1
    },
    {
      id: contractsFolderId,
      name: 'Contracts',
      path: '',
      size: 0,
      type: 'folder',
      parent_id: null,
      is_folder: 1
    },
    {
      id: contentFolderId,
      name: 'Content Vault',
      path: '',
      size: 0,
      type: 'folder',
      parent_id: modelsFolderId,
      is_folder: 1
    },
    {
      id: uuidv4(),
      name: 'Agency_Agreement_Template.pdf',
      path: 'agreement_template.pdf',
      size: 1024 * 500,
      type: 'application/pdf',
      parent_id: contractsFolderId,
      is_folder: 0,
      content: 'Standard OFM Agency Agreement...'
    },
    {
      id: uuidv4(),
      name: 'Bella_Rose_Photoshoot_May.zip',
      path: 'bella_photos.zip',
      size: 1024 * 50000, // 50MB
      type: 'application/zip',
      parent_id: contentFolderId,
      is_folder: 0,
      content: null
    },
    {
      id: uuidv4(),
      name: 'Chloe_Star_TikToks.mp4',
      path: 'chloe_tiktoks.mp4',
      size: 1024 * 15000,
      type: 'video/mp4',
      parent_id: contentFolderId,
      is_folder: 0,
      content: null
    },
    {
      id: uuidv4(),
      name: 'Chatter_Training_Manual.pdf',
      path: 'chatter_manual.pdf',
      size: 1024 * 2000,
      type: 'application/pdf',
      parent_id: null,
      is_folder: 0,
      content: 'How to sell PPV effectively...'
    }
  ];

  const insertFile = db.prepare('INSERT INTO files (id, name, path, size, type, parent_id, is_folder, content) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  files.forEach(file => insertFile.run(file.id, file.name, file.path, file.size, file.type, file.parent_id, file.is_folder, file.content));

  // --- 3. Seed Accounts ---
  const accounts = [
    {
      id: uuidv4(),
      title: 'OnlyFans - Bella Rose',
      service: 'OnlyFans',
      username: 'bellarose_vip',
      password: 'secure_password',
      url: 'https://onlyfans.com',
      category: 'Models'
    },
    {
      id: uuidv4(),
      title: 'Fanvue - Chloe Star',
      service: 'Fanvue',
      username: 'chloestar',
      password: 'secure_password',
      url: 'https://fanvue.com',
      category: 'Models'
    },
    {
      id: uuidv4(),
      title: 'Instagram - Agency Main',
      service: 'Instagram',
      username: 'agency_official',
      password: 'secure_password',
      url: 'https://instagram.com',
      category: 'Social'
    },
    {
      id: uuidv4(),
      title: 'Proxy Service',
      service: 'BrightData',
      username: 'admin@agency.com',
      password: 'secure_password',
      url: 'https://brightdata.com',
      category: 'Services'
    },
    {
      id: uuidv4(),
      title: 'Anti-Detect Browser',
      service: 'Dolphin Anty',
      username: 'admin',
      password: 'secure_password',
      url: 'https://dolphin-anty.com',
      category: 'Software'
    }
  ];

  const insertAccount = db.prepare('INSERT INTO accounts (id, title, service, username, password, url, category) VALUES (?, ?, ?, ?, ?, ?, ?)');
  accounts.forEach(acc => insertAccount.run(acc.id, acc.title, acc.service, acc.username, acc.password, acc.url, acc.category));

  // --- 4. Seed Finance Transactions ---
  const models = ['Bella Rose', 'Chloe Star', 'New Face', 'General'];
  const platforms = ['OnlyFans', 'Fanvue', 'Brand Deal', 'Affiliate'];
  
  const insertTransaction = db.prepare('INSERT INTO transactions (id, amount, type, category, model_name, platform, description, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

  // Generate 60 transactions
  for (let i = 0; i < 60; i++) {
    const isIncome = Math.random() > 0.4; // 60% income
    const type = isIncome ? 'income' : 'expense';
    const model = models[Math.floor(Math.random() * (models.length - 1))]; // Exclude General for most
    
    let category = '';
    let platform = '';
    let description = '';
    let amount = 0;

    if (isIncome) {
      const rand = Math.random();
      if (rand > 0.8) {
        category = 'Brand Deal';
        platform = 'Brand';
        description = 'Lingerie Promo';
        amount = Math.floor(Math.random() * 3000) + 1000;
      } else if (rand > 0.5) {
        category = 'Subscriptions';
        platform = Math.random() > 0.3 ? 'OnlyFans' : 'Fanvue';
        description = 'Daily Subs';
        amount = Math.floor(Math.random() * 500) + 50;
      } else if (rand > 0.2) {
        category = 'PPV';
        platform = 'OnlyFans';
        description = 'Sexting Session';
        amount = Math.floor(Math.random() * 200) + 20;
      } else {
        category = 'Tips';
        platform = 'OnlyFans';
        description = 'Post Tip';
        amount = Math.floor(Math.random() * 100) + 5;
      }
    } else {
      const rand = Math.random();
      if (rand > 0.7) {
        category = 'Model Payout';
        platform = 'Bank Transfer';
        description = `Payout for ${model}`;
        amount = Math.floor(Math.random() * 2000) + 500;
      } else if (rand > 0.4) {
        category = 'Chatter Salary';
        platform = 'Crypto';
        description = 'Weekly Shift';
        amount = Math.floor(Math.random() * 500) + 100;
      } else {
        category = 'Traffic';
        platform = 'Ads';
        description = 'Dating App Ads';
        amount = Math.floor(Math.random() * 300) + 50;
      }
    }
    
    const date = subDays(new Date(), Math.floor(Math.random() * 45));

    insertTransaction.run(
      uuidv4(),
      amount,
      type,
      category,
      model,
      platform,
      description,
      format(date, 'yyyy-MM-dd HH:mm:ss')
    );
  }

  // --- 5. Seed Tasks ---
  const tasks = [
    {
      id: uuidv4(),
      title: 'Schedule Weekend Posts for Bella',
      description: 'Queue 3 posts per day on OF and 1 on IG.',
      status: 'todo',
      priority: 'high',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      assignee: 'Content Manager',
    },
    {
      id: uuidv4(),
      title: 'Audit Night Shift Chatters',
      description: 'Review logs from last night. Conversion rate was low.',
      status: 'in_progress',
      priority: 'medium',
      start_date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
      due_date: format(new Date(), 'yyyy-MM-dd'),
      assignee: 'Team Lead',
    },
    {
      id: uuidv4(),
      title: 'Onboard New Model "Vicky"',
      description: 'Setup accounts, vault, and welcome message.',
      status: 'todo',
      priority: 'high',
      start_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
      due_date: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
      assignee: 'Admin',
    },
    {
      id: uuidv4(),
      title: 'Payout Calculation - May',
      description: 'Calculate net revenue and send payouts to all models.',
      status: 'done',
      priority: 'high',
      start_date: format(subDays(new Date(), 5), 'yyyy-MM-dd'),
      due_date: format(subDays(new Date(), 2), 'yyyy-MM-dd'),
      assignee: 'Finance',
    },
    {
      id: uuidv4(),
      title: 'Setup Fanvue for Chloe',
      description: 'Mirror content from OF to Fanvue.',
      status: 'done',
      priority: 'medium',
      start_date: format(subDays(new Date(), 10), 'yyyy-MM-dd'),
      due_date: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
      assignee: 'Content Manager',
    },
  ];

  const insertTask = db.prepare('INSERT INTO tasks (id, title, description, status, priority, start_date, due_date, assignee) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  tasks.forEach(task => {
    insertTask.run(task.id, task.title, task.description, task.status, task.priority, task.start_date, task.due_date, task.assignee);
  });

  console.log('Database seeded successfully!');
};
