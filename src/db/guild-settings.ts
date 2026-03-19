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

export async function updateFeedTracker(source: string, lastId: string, lastPubDate?: string) {
  const row: Record<string, string> = {
    source,
    last_id: lastId,
    last_checked_at: new Date().toISOString(),
  };
  if (lastPubDate) {
    const parsed = new Date(lastPubDate);
    if (!isNaN(parsed.getTime())) row.last_pub_date = parsed.toISOString();
  }

  const { error } = await limbus()
    .from('feed_tracker')
    .upsert(row, { onConflict: 'source' });

  if (error) throw error;
}

/** 해당 길드가 이미 받은 feed guid 목록 반환 */
export async function getGuildSentGuids(
  guildId: string,
  source: string,
  guids: string[],
): Promise<Set<string>> {
  if (guids.length === 0) return new Set();
  const { data, error } = await limbus()
    .from('guild_feed_history')
    .select('feed_guid')
    .eq('guild_id', guildId)
    .eq('source', source)
    .in('feed_guid', guids);

  if (error) throw error;
  return new Set((data ?? []).map(r => r.feed_guid));
}

/** 길드에 피드 발송 완료 기록 */
export async function markGuildFeedSent(
  guildId: string,
  source: string,
  feedGuid: string,
  pubDate?: string,
): Promise<void> {
  const { error } = await limbus()
    .from('guild_feed_history')
    .upsert({
      guild_id: guildId,
      source,
      feed_guid: feedGuid,
      pub_date: pubDate ? new Date(pubDate).toISOString() : null,
      sent_at: new Date().toISOString(),
    }, { onConflict: 'guild_id,source,feed_guid' });

  if (error) throw error;
}

/** 오래된 발송 이력 삭제 */
export async function cleanupOldFeedHistory(daysToKeep = 30): Promise<number> {
  const cutoff = new Date(Date.now() - daysToKeep * 86400000).toISOString();
  const { data, error } = await limbus()
    .from('guild_feed_history')
    .delete()
    .lt('sent_at', cutoff)
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}
