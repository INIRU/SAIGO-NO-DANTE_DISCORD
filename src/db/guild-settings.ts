import { limbus } from './supabase.js';

export async function getGuildSettings(guildId: string) {
  const { data, error } = await limbus()
    .from('guild_settings')
    .select('*')
    .eq('guild_id', guildId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function setNotificationChannel(guildId: string, channelId: string) {
  const { error } = await limbus()
    .from('guild_settings')
    .upsert({
      guild_id: guildId,
      notification_channel_id: channelId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guild_id' });

  if (error) throw error;
}

export async function toggleSource(guildId: string, source: 'steam' | 'twitter', enabled: boolean) {
  const field = source === 'steam' ? 'steam_enabled' : 'twitter_enabled';
  const { error } = await limbus()
    .from('guild_settings')
    .upsert({
      guild_id: guildId,
      [field]: enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'guild_id' });

  if (error) throw error;
}

export async function getAllGuildsWithNotifications() {
  const { data, error } = await limbus()
    .from('guild_settings')
    .select('*')
    .not('notification_channel_id', 'is', null);

  if (error) throw error;
  return data ?? [];
}

export async function getFeedTracker(source: string) {
  const { data, error } = await limbus()
    .from('feed_tracker')
    .select('*')
    .eq('source', source)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function updateFeedTracker(source: string, lastId: string) {
  const { error } = await limbus()
    .from('feed_tracker')
    .upsert({
      source,
      last_id: lastId,
      last_checked_at: new Date().toISOString(),
    }, { onConflict: 'source' });

  if (error) throw error;
}
