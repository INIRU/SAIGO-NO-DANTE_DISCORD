import { type Client, ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, type MessageActionRowComponentBuilder, MessageFlags, type TextChannel } from 'discord.js';
import { getAllGuildsWithNotifications, getFeedTracker, updateFeedTracker } from '../db/guild-settings.js';


const STEAM_APP_ID = '1973530';
const STEAM_RSS_URL = `https://store.steampowered.com/feeds/news/app/${STEAM_APP_ID}/`;
const POLL_INTERVAL = 5 * 60 * 1000; // 5분

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  image?: string;
}

/** RSS XML 파싱 (간단한 파서) */
function parseRssItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const getTag = (tag: string) => {
      const m = content.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 's'));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };

    // 이미지 추출 (description 내 img 태그)
    const desc = getTag('description');
    const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/);

    items.push({
      title: getTag('title'),
      link: getTag('link'),
      description: desc.replace(/<[^>]+>/g, '').slice(0, 200),
      pubDate: getTag('pubDate'),
      guid: getTag('guid') || getTag('link'),
      image: imgMatch?.[1],
    });
  }

  return items;
}

/** Steam RSS 피드 가져오기 */
async function fetchSteamFeed(): Promise<FeedItem[]> {
  try {
    const res = await fetch(STEAM_RSS_URL);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml);
  } catch (err) {
    console.error('[Feed] Steam RSS 가져오기 실패:', err);
    return [];
  }
}

/** 최신 Steam 글 1개를 가져와서 메시지로 빌드 (테스트용) */
export async function fetchLatestSteamPost() {
  const items = await fetchSteamFeed();
  if (items.length === 0) return null;
  return buildNotificationMessage(items[0], 'steam');
}

/** 알림 메시지 빌드 */
function buildNotificationMessage(item: FeedItem, source: string) {
  const container = new ContainerBuilder()
    .setAccentColor(source === 'steam' ? 0x1b2838 : 0x1da1f2);

  const sourceLabel = source === 'steam' ? '🎮 Steam 공지' : '🐦 X(Twitter)';

  const headerText = new TextDisplayBuilder().setContent(
    `## ${sourceLabel}\n**${item.title}**`
  );

  if (item.image && item.image.startsWith('http')) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(headerText)
      .setThumbnailAccessory(
        new ThumbnailBuilder({ media: { url: item.image } })
      );
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(headerText);
  }

  if (item.description) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`> ${item.description.slice(0, 300)}${item.description.length > 300 ? '...' : ''}`)
    );
  }

  // 날짜
  if (item.pubDate) {
    const date = new Date(item.pubDate);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${date.toLocaleDateString('ko-KR')}`)
    );
  }

  // 원문 보기 버튼
  if (item.link) {
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setLabel('원문 보기')
          .setURL(item.link)
          .setStyle(ButtonStyle.Link)
      );
    container.addActionRowComponents(row);
  }

  return container;
}

/** 새 피드 확인 & 알림 전송 */
async function checkAndNotify(client: Client, source: string, items: FeedItem[]) {
  if (items.length === 0) return;

  const tracker = await getFeedTracker(source);
  const lastId = tracker?.last_id;

  // 새 아이템 찾기
  const newItems = lastId
    ? items.filter(item => item.guid !== lastId).slice(0, 3) // 최대 3개
    : []; // 첫 실행은 트래커만 설정

  // 트래커 업데이트
  await updateFeedTracker(source, items[0].guid);

  if (newItems.length === 0) return;

  console.log(`[Feed] ${source} 새 글 ${newItems.length}개 감지`);

  // 알림 설정된 모든 길드에 전송
  const guilds = await getAllGuildsWithNotifications();
  const sourceField = source === 'steam' ? 'steam_enabled' : 'twitter_enabled';

  for (const guild of guilds) {
    if (guild[sourceField] === false) continue;

    try {
      const channel = await client.channels.fetch(guild.notification_channel_id) as TextChannel | null;
      if (!channel?.isTextBased()) continue;

      for (const item of newItems.reverse()) {
        const container = buildNotificationMessage(item, source);
        await channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (err) {
      console.error(`[Feed] 길드 ${guild.guild_id} 전송 실패:`, err);
    }
  }
}

/** 피드 폴링 시작 */
export function startFeedPoller(client: Client) {
  console.log('[Feed] 피드 폴링 시작 (5분 간격)');

  const poll = async () => {
    try {
      const steamItems = await fetchSteamFeed();
      await checkAndNotify(client, 'steam', steamItems);
    } catch (err) {
      console.error('[Feed] 폴링 에러:', err);
    }
  };

  // 시작 후 30초 대기 후 첫 폴링 (봇 준비 시간)
  setTimeout(() => {
    poll();
    setInterval(poll, POLL_INTERVAL);
  }, 30_000);
}
