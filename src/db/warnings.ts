import { limbus } from './supabase.js';

export async function addWarning(guildId: string, userId: string, moderatorId: string, reason: string) {
  const { data, error } = await limbus().from('warnings').insert({ guild_id: guildId, user_id: userId, moderator_id: moderatorId, reason }).select().single();
  if (error) throw error;
  return data;
}

export async function getWarnings(guildId: string, userId: string) {
  const { data, error } = await limbus().from('warnings').select('*').eq('guild_id', guildId).eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function removeWarning(id: number) {
  const { error } = await limbus().from('warnings').delete().eq('id', id);
  if (error) throw error;
}

export async function getWarningCount(guildId: string, userId: string) {
  const { count, error } = await limbus().from('warnings').select('*', { count: 'exact', head: true }).eq('guild_id', guildId).eq('user_id', userId);
  if (error) throw error;
  return count ?? 0;
}
