-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES (Optional, but recommended for SaaS to store user metadata)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
create policy "Public profiles are viewable by everyone." on public.profiles
  for select using (true);

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. TRANSACTIONS (Finance)
create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  amount numeric not null,
  type text check (type in ('income', 'expense')) not null,
  category text not null,
  description text not null,
  platform text not null,
  model_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transactions enable row level security;

drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions" on public.transactions
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions" on public.transactions
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions" on public.transactions
  for delete using (auth.uid() = user_id);

-- 3. NOTES (Knowledge Base & Notes)
create table if not exists public.notes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  content text,
  tags text,
  folder text default '/',
  is_guide integer default 0, -- 0 or 1
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.notes enable row level security;

drop policy if exists "Users can view own notes" on public.notes;
create policy "Users can view own notes" on public.notes
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes" on public.notes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes" on public.notes
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes" on public.notes
  for delete using (auth.uid() = user_id);

-- 4. TASKS (Projects)
create table if not exists public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  description text,
  status text check (status in ('todo', 'in_progress', 'done')) default 'todo',
  priority text check (priority in ('low', 'medium', 'high')) default 'medium',
  assignee text,
  start_date date,
  due_date date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tasks enable row level security;

drop policy if exists "Users can view own tasks" on public.tasks;
create policy "Users can view own tasks" on public.tasks
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own tasks" on public.tasks;
create policy "Users can insert own tasks" on public.tasks
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks" on public.tasks
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks" on public.tasks
  for delete using (auth.uid() = user_id);

-- 5. ACCOUNTS (Password Manager)
create table if not exists public.accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text,
  service text not null,
  username text not null,
  password text not null, -- Note: In a real production app, consider encrypting this on the client side or using Supabase Vault
  url text,
  category text default 'Other',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.accounts enable row level security;

drop policy if exists "Users can view own accounts" on public.accounts;
create policy "Users can view own accounts" on public.accounts
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own accounts" on public.accounts;
create policy "Users can insert own accounts" on public.accounts
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own accounts" on public.accounts;
create policy "Users can update own accounts" on public.accounts
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own accounts" on public.accounts;
create policy "Users can delete own accounts" on public.accounts
  for delete using (auth.uid() = user_id);

-- 6. FILES (Cloud Drive Metadata)
-- This stores the structure (folders/files) but not the binary content, as requested.
create table if not exists public.files (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text not null,
  size bigint default 0,
  is_folder integer default 0, -- 0 or 1
  path text, -- Path to storage bucket if applicable, or virtual path
  parent_id uuid references public.files(id) on delete cascade, -- Recursive relationship for folders
  content text, -- For small text files or previews if needed
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.files enable row level security;

drop policy if exists "Users can view own files" on public.files;
create policy "Users can view own files" on public.files
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own files" on public.files;
create policy "Users can insert own files" on public.files
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own files" on public.files;
create policy "Users can update own files" on public.files
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own files" on public.files;
create policy "Users can delete own files" on public.files
  for delete using (auth.uid() = user_id);

-- Function to handle new user signup (automatically create profile)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
