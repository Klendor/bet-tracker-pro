// Database utilities for Express.js application
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// User management functions
export const getUserById = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

export const getUserByGoogleId = async (googleId) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

export const createUser = async (userData) => {
  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateUser = async (userId, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// Bet management functions
export const createBet = async (betData) => {
  const { data, error } = await supabase
    .from('bets')
    .insert([betData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const getBetHistory = async (userId, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  
  const { data, error, count } = await supabase
    .from('bets')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('processed_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  
  return {
    bets: data,
    total: count,
    page,
    limit,
    pages: Math.ceil(count / limit)
  };
};

// Usage limit functions
export const checkUsageLimit = (user) => {
  const limits = { free: 30, pro: 1000, proplus: 10000 };
  const limit = limits[user.plan] || limits.free;
  return user.usage_count < limit;
};

export const resetUsageIfNeeded = (user) => {
  const now = new Date();
  const resetDate = new Date(user.usage_reset_date);
  
  if (now > resetDate) {
    return {
      ...user,
      usage_count: 0,
      usage_reset_date: new Date(now.setMonth(now.getMonth() + 1))
    };
  }
  
  return user;
};