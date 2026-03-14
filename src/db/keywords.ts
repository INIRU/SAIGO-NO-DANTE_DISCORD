import { limbus } from './supabase.js';

export async function getKeywordMeta(keyword: string) {
  const { data, error } = await limbus()
    .from('keyword_meta')
    .select('*')
    .eq('name', keyword)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function searchKeywords(query: string, limit = 25) {
  const { data, error } = await limbus()
    .from('keyword_meta')
    .select('name, icon_slug, sin_affinity')
    .ilike('name', `%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getIdentitiesByKeyword(keyword: string) {
  const { data, error } = await limbus()
    .from('identities')
    .select('id, name, name_kr, rarity, sinner_id, game_id')
    .contains('keywords', [keyword])
    .order('rarity', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
