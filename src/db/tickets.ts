import { limbus } from './supabase.js';

export async function createTicket(guildId: string, userId: string, channelId: string) {
  const { data, error } = await limbus().from('tickets').insert({ guild_id: guildId, user_id: userId, channel_id: channelId, status: 'open' }).select().single();
  if (error) throw error;
  return data;
}

export async function getTicketByChannel(channelId: string) {
  const { data, error } = await limbus().from('tickets').select('*').eq('channel_id', channelId).single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function closeTicket(channelId: string, closedBy: string, transcriptUrl?: string) {
  const { error } = await limbus().from('tickets').update({ status: 'closed', closed_at: new Date().toISOString(), closed_by: closedBy, transcript_url: transcriptUrl }).eq('channel_id', channelId);
  if (error) throw error;
}

export async function getOpenTicketByUser(guildId: string, userId: string) {
  const { data, error } = await limbus().from('tickets').select('*').eq('guild_id', guildId).eq('user_id', userId).eq('status', 'open').single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
