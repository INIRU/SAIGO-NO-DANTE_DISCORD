import { limbus } from './supabase.js';

export async function getEgoByName(name: string) {
  const { data, error } = await limbus()
    .from('ego')
    .select('*, sinners!inner(id, name, name_kr, order_num)')
    .or(`name_kr.ilike.%${name}%,name.ilike.%${name}%`)
    .limit(1)
    .single();

  if (error) throw error;
  return data;
}

export async function searchEgo(query: string, limit = 25) {
  const { data, error } = await limbus()
    .from('ego')
    .select('id, name, name_kr, grade, sinner_id, sin_affinity, sinners!inner(name_kr)')
    .or(`name_kr.ilike.%${query}%,name.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getEgoById(id: string) {
  const { data, error } = await limbus()
    .from('ego')
    .select('*, sinners!inner(id, name, name_kr, order_num)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getEgoBySinner(sinnerId: string) {
  const { data, error } = await limbus()
    .from('ego')
    .select('id, name, name_kr, grade, sin_affinity, game_id')
    .eq('sinner_id', sinnerId)
    .order('grade');

  if (error) throw error;
  return data ?? [];
}
