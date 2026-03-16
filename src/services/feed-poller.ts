import { type Client, ContainerBuilder, TextDisplayBuilder, FileBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, type MessageActionRowComponentBuilder, MessageFlags, AttachmentBuilder, type TextChannel } from 'discord.js';
import { generateBanner } from './banner.js';
import { getAllGuildsWithNotifications, getFeedTracker, updateFeedTracker } from '../db/guild-settings.js';
import { summarizeWithGemini } from './gemini.js';


const STEAM_APP_ID = '1973530';
const STEAM_RSS_URL = `https://store.steampowered.com/feeds/news/app/${STEAM_APP_ID}/?l=koreana`;
const POLL_INTERVAL = 5 * 60 * 1000; // 5분

interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
  image?: string;
  contentImages: string[]; // 본문 내 이미지 URLs
}

/** HTML 엔티티 디코딩 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** HTML → 깔끔한 텍스트 (줄바꿈 보존) */
function htmlToCleanText(html: string): string {
  return decodeHtmlEntities(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** RSS XML 파싱 */
function parseRssItems(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const getTag = (tag: string) => {
      const m = content.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
      return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
    };

    // enclosure 태그에서 대표 이미지
    const enclosureMatch = content.match(/<enclosure\s+url="([^"]+)"/);
    const rawDesc = getTag('description');
    const decodedDesc = decodeHtmlEntities(rawDesc);

    // 본문 내 모든 이미지 추출
    const allImgs: string[] = [];
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    let imgM;
    while ((imgM = imgRegex.exec(decodedDesc)) !== null) {
      if (imgM[1].startsWith('http')) allImgs.push(imgM[1]);
    }

    // 유튜브 썸네일 추출
    const ytMatch = decodedDesc.match(/youtube[^"]*\/embed\/([^?"]+)/);
    if (ytMatch) {
      allImgs.push(`https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`);
    }

    const cleanDesc = htmlToCleanText(rawDesc);

    items.push({
      title: decodeHtmlEntities(getTag('title')),
      link: getTag('link'),
      description: cleanDesc.slice(0, 2000),
      pubDate: getTag('pubDate'),
      guid: getTag('guid') || getTag('link'),
      image: enclosureMatch?.[1] || allImgs[0],
      contentImages: allImgs.slice(0, 4), // 최대 4장
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
  return buildNotificationWithSummary(items[0], 'steam');
}

/** Gemini로 요약 후 메시지 빌드 */
async function buildNotificationWithSummary(item: FeedItem, source: string) {
  // 요약 시도
  if (item.description && item.description.length > 50) {
    const summary = await summarizeWithGemini(item.description);
    if (summary) {
      return await buildNotificationMessage({ ...item, description: summary, contentImages: item.contentImages }, source);
    }
  }
  // 요약 실패 시 원본 사용
  return await buildNotificationMessage(item, source);
}

/** 알림 메시지 빌드 (배너 이미지 포함) */
async function buildNotificationMessage(item: FeedItem, source: string) {
  const container = new ContainerBuilder()
    .setAccentColor(source === 'steam' ? 0x1b2838 : 0x1da1f2);

  // 배너 이미지 생성
  const dateStr = item.pubDate
    ? new Date(item.pubDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
    : '';

  let bannerFile: AttachmentBuilder | null = null;
  try {
    const bannerBuf = await generateBanner({
      source: source as 'steam' | 'twitter',
    });
    bannerFile = new AttachmentBuilder(bannerBuf, { name: 'banner.png' });
    const bannerGallery = new MediaGalleryBuilder()
      .addItems(new MediaGalleryItemBuilder().setURL('attachment://banner.png'));
    container.addMediaGalleryComponents(bannerGallery);
  } catch (err) {
    console.error('[Banner] 배너 생성 실패:', err);
  }

  // 소스 라벨 + 제목 (텍스트로도 표시)
  const sourceLabel = source === 'steam' ? '🎮 [Steam] Limbus Company 소식' : '🐦 [X] Limbus Company 소식';
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${sourceLabel}\n# ${item.title}`)
  );

  // 본문
  if (item.description) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(item.description.slice(0, 500) + (item.description.length > 500 ? '\n...' : ''))
    );
  }

  // 본문 내 이미지 (MediaGallery) — 유효한 URL만
  const validImages = (item.contentImages ?? []).filter(url =>
    url.startsWith('https://') && !url.includes('placeholder')
  );
  if (validImages.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    const gallery = new MediaGalleryBuilder()
      .addItems(...validImages.map(url =>
        new MediaGalleryItemBuilder().setURL(url)
      ));
    container.addMediaGalleryComponents(gallery);
  }

  // 푸터
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${dateStr} · [saigo-no-dante.com](https://saigo-no-dante.com)`)
  );

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

  return { container, bannerFile };
}

// 실패한 길드 재시도 큐: { guildId → FeedItem[] }
const retryQueue = new Map<string, { items: FeedItem[]; source: string }>();

/** 새 피드 확인 & 알림 전송 */
async function checkAndNotify(client: Client, source: string, items: FeedItem[]) {
  if (items.length === 0) return;

  const tracker = await getFeedTracker(source);
  const lastId = tracker?.last_id;

  // 새 아이템 찾기 (lastId보다 앞에 있는 것만 = 더 새로운 것)
  let newItems: FeedItem[] = [];
  if (lastId) {
    const lastIndex = items.findIndex(item => item.guid === lastId);
    if (lastIndex > 0) {
      newItems = items.slice(0, lastIndex).slice(0, 3);
    }
  }

  // 트래커 업데이트
  await updateFeedTracker(source, items[0].guid);

  // 재시도 큐 처리
  await processRetryQueue(client);

  if (newItems.length === 0) return;

  console.log(`[Feed] ${source} 새 글 ${newItems.length}개 감지`);

  // 알림 설정된 모든 길드에 전송
  const guilds = await getAllGuildsWithNotifications();
  const sourceField = source === 'steam' ? 'steam_enabled' : 'twitter_enabled';

  for (const guild of guilds) {
    if (guild[sourceField] === false) continue;
    await sendToGuild(client, guild.guild_id, guild.notification_channel_id, newItems, source);
  }
}

/** 단일 길드에 전송 (실패 시 재시도 큐에 추가) */
async function sendToGuild(client: Client, guildId: string, channelId: string, items: FeedItem[], source: string) {
  try {
    const channel = await client.channels.fetch(channelId) as TextChannel | null;
    if (!channel?.isTextBased()) return;

    for (const item of [...items].reverse()) {
      const result = await buildNotificationWithSummary(item, source);
      await channel.send({
        components: [result.container],
        files: result.bannerFile ? [result.bannerFile] : [],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // 성공 시 재시도 큐에서 제거
    retryQueue.delete(guildId);
  } catch (err) {
    console.error(`[Feed] 길드 ${guildId} 전송 실패, 재시도 큐에 추가:`, err);
    retryQueue.set(guildId, { items, source });
  }
}

/** 재시도 큐 처리 */
async function processRetryQueue(client: Client) {
  if (retryQueue.size === 0) return;

  console.log(`[Feed] 재시도 큐: ${retryQueue.size}개 길드`);

  const guilds = await getAllGuildsWithNotifications();
  const guildMap = new Map(guilds.map(g => [g.guild_id, g.notification_channel_id]));

  for (const [guildId, { items, source }] of retryQueue) {
    const channelId = guildMap.get(guildId);
    if (!channelId) {
      retryQueue.delete(guildId);
      continue;
    }
    await sendToGuild(client, guildId, channelId, items, source);
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
