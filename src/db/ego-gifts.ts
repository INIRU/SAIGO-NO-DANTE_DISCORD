import { limbus } from './supabase.js';

export async function searchEgoGifts(query: string, limit = 25) {
  const { data, error } = await limbus()
    .from('ego_gifts')
    .select('id, name, keyword, grade, tier')
    .or(`name.ilike.%${query}%,keyword.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getEgoGiftById(id: string) {
  const { data, error } = await limbus()
    .from('ego_gifts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getEgoGiftsByKeyword(keyword: string) {
  const { data, error } = await limbus()
    .from('ego_gifts')
    .select('id, name, keyword, grade, tier, effect_base')
    .eq('keyword', keyword)
    .order('grade');

  if (error) throw error;
  return data ?? [];
}
