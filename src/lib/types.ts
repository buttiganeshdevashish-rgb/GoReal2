export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  username: string;
  avatar_hue: number;
  bio: string;
  goal: string;
  goal_category: string;
  created_at: string;
}

export interface Community {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  banner_hue: number;
  is_private: number;
  created_by: number;
  created_at: string;
  member_count?: number;
}

export interface Post {
  id: number;
  user_id: number;
  community_id: number | null;
  image_url: string;
  caption: string;
  progress_note: string;
  post_date: string;
  flagged: number;
  flag_reason: string;
  created_at: string;
  // joined fields
  name?: string;
  username?: string;
  avatar_hue?: number;
  goal_category?: string;
  community_name?: string;
  community_slug?: string;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: number;
}

export interface CommentRow {
  id: number;
  post_id: number;
  user_id: number;
  body: string;
  flagged: number;
  created_at: string;
  name?: string;
  username?: string;
  avatar_hue?: number;
}

export interface Streaks {
  current: number;
  longest: number;
  totalPosts: number;
  activeDays30: number;
  consistency30: number; // 0-100
}

export interface HeatmapDay {
  date: string;
  count: number;
}

export interface LeaderboardRow {
  user: User;
  currentStreak: number;
  consistency: number;
  totalPosts: number;
  score: number;
}

export interface InsightPayload {
  headline: string;
  stats: { label: string; value: string }[];
  observations: string[];
  suggestion: string;
}
