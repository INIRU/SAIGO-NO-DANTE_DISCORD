import { limbus } from './supabase.js';

export async function searchIdentities(query: string, limit = 25) {
  const { data, error } = await limbus()
    .from('identities')
    .select('id, name, name_kr, rarity, sinner_id, game_id, sinners!inner(name_kr)')
    .or(`name_kr.ilike.%${query}%,name.ilike.%${query}%`)
    .order('rarity', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function getIdentityById(id: string) {
  const { data, error } = await limbus()
    .from('identities')
    .select('*, sinners!inner(id, name, name_kr, order_num)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getIdentitiesBySinner(sinnerId: string) {
  const { data, error } = await limbus()
    .from('identities')
    .select('id, name, name_kr, rarity, game_id, folder_name')
    .eq('sinner_id', sinnerId)
    .order('rarity', { ascending: false })
    .order('name_kr');

  if (error) throw error;
  return data ?? [];
}

export async function getSkillsByIdentity(identityId: string, uptieLevel = 4) {
  const { data, error } = await limbus()
    .from('skills')
    .select('*')
    .eq('identity_id', identityId)
    .eq('uptie_level', uptieLevel)
    .order('skill_order')
    .order('variant_order');

  if (error) throw error;
  return data ?? [];
}

export async function getPassivesByIdentity(identityId: string, uptieLevel = 4) {
  const { data, error } = await limbus()
    .from('passives')
    .select('*')
    .eq('identity_id', identityId)
    .eq('uptie_level', uptieLevel)
    .order('passive_order');

  if (error) throw error;
  return data ?? [];
}
