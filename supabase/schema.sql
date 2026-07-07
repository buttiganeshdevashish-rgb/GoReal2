-- GoalReal · Postgres schema for Supabase
-- Run this in the Supabase SQL Editor.

create table if not exists users (
  id bigint generated always as identity primary key,
  email text not null unique,
  password_hash text not null,
  name text not null,
  username text not null unique,
  avatar_hue integer not null default 260,
  bio text default '',
  goal text default '',
  goal_category text default 'Custom',
  created_at timestamptz not null default now()
);

create table if not exists communities (
  id bigint generated always as identity primary key,
  name text not null,
  slug text not null unique,
  description text default '',
  category text default 'Custom',
  banner_hue integer not null default 260,
  is_private boolean not null default false,
  created_by bigint not null references users(id),
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id) on delete cascade,
  community_id bigint not null references communities(id) on delete cascade,
  role text not null default 'member',            -- member | admin
  status text not null default 'active',          -- active | pending
  joined_at timestamptz not null default now(),
  unique (user_id, community_id)
);

create table if not exists posts (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id) on delete cascade,
  community_id bigint references communities(id) on delete set null,
  image_url text default '',
  caption text not null,
  progress_note text default '',
  post_date date not null,
  flagged boolean not null default false,
  flag_reason text default '',
  created_at timestamptz not null default now(),
  unique (user_id, post_date)                     -- one proof per day, enforced by the DB
);

create table if not exists likes (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references posts(id) on delete cascade,
  user_id bigint not null references users(id) on delete cascade,
  body text not null,
  flagged boolean not null default false,
  flag_reason text default '',
  created_at timestamptz not null default now()
);

create table if not exists follows (
  follower_id bigint not null references users(id) on delete cascade,
  following_id bigint not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id bigint not null references users(id) on delete cascade,
  actor_id bigint references users(id) on delete set null,
  type text not null,                             -- like | comment | milestone | reminder | join
  post_id bigint references posts(id) on delete cascade,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists challenges (
  id bigint generated always as identity primary key,
  community_id bigint not null references communities(id) on delete cascade,
  title text not null,
  description text default '',
  week_start date not null,
  generated_by text not null default 'ai',
  created_at timestamptz not null default now(),
  unique (community_id, week_start)
);

create table if not exists ai_insights (
  id bigint generated always as identity primary key,
  scope text not null,                            -- user | community
  user_id bigint references users(id) on delete cascade,
  community_id bigint references communities(id) on delete cascade,
  week_start date not null,
  content jsonb not null,
  source text not null default 'engine',          -- openai | engine
  created_at timestamptz not null default now()
);

create index if not exists idx_posts_user on posts (user_id, post_date);
create index if not exists idx_posts_community on posts (community_id, post_date);
create index if not exists idx_notifications_user on notifications (user_id, read);
create index if not exists idx_memberships_community on memberships (community_id, status);
