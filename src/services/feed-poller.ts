import { type Client, ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MediaGalleryItemBuilder, SeparatorBuilder, SeparatorSpacingSize, ActionRowBuilder, ButtonBuilder, ButtonStyle, type MessageActionRowComponentBuilder, MessageFlags, AttachmentBuilder, type TextChannel } from 'discord.js';
import { generateBanner } from './banner.js';
import sharp from 'sharp';
import { getAllGuildsWithNotifications, getFeedTracker, updateFeedTracker, getGuildSentGuids, markGuildFeedSent, cleanupOldFeedHistory } from '../db/guild-settings.js';
import { summarizeWithGemini } from './gemini.js';


const STEAM_APP_ID = '1973530';
const STEAM_RSS_URL = `https://store.steampowered.com/feeds/news/app/${STEAM_APP_ID}/?l=koreana`;
const POLL_INTERVAL = 5 * 60 * 1000; // 5분 (Steam)
const TWITTER_POLL_INTERVAL = 5 * 60 * 1000; // 5분 (Twitter)

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

const NITTER_URL = 'https://nitter.net/LimbusCompany_B/rss';

/** HTTP fetch with User-Agent (논블로킹) */
async function fetchWithUA(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LimbusBot/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

/** Twitter(Nitter) RSS 피드 가져오기 */
async function fetchTwitterFeed(): Promise<FeedItem[]> {
  try {
    const xml = await fetchWithUA(NITTER_URL);
    if (!xml || !xml.includes('<item>')) {
      console.warn('[Feed] Nitter RSS 비어있음');
      return [];
    }

    const items = parseRssItems(xml);
    // Steam 링크가 있는 트윗은 Steam 내용으로 보강
    const enrichedItems: FeedItem[] = [];
    for (const item of items) {
      enrichedItems.push(await enrichTwitterItem(item));
    }

    return enrichedItems.map(item => {
      // Nitter 프록시 이미지 → 원본 URL 변환
      const fixImg = (url: string): string => {
        if (!url) return '';
        if (url.includes('/pic/')) {
          try {
            const decoded = decodeURIComponent(url.split('/pic/')[1]);
            if (decoded.startsWith('http')) return decoded;
            // pbs.twimg.com 이미지 (card_img, media, profile_images 등)
            return 'https://pbs.twimg.com/' + decoded;
          } catch { return ''; }
        }
        return url;
      };

      const images = item.contentImages.map(fixImg).filter(u => u.startsWith('https://'));

      return {
        ...item,
        contentImages: images,
        image: item.image ? fixImg(item.image) || undefined : undefined,
        link: item.link.replace('https://nitter.net', 'https://x.com').replace('#m', ''),
      };
    });
  } catch (err) {
    console.error('[Feed] Nitter 실패:', err);
    return [];
  }
}

/** 이미지 다운로드 후 밝기 올리기 (어두운 티저용) */
async function brightenImage(imageUrl: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LimbusBot/1.0)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength === 0) return null;

    return await sharp(Buffer.from(arrayBuf))
      .modulate({ brightness: 6 })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (err) {
    console.error('[Feed] 이미지 밝기 처리 실패:', err);
    return null;
  }
}

/** 태그만 있는 트윗인지 판별 (티저 이미지 트윗) */
function isTeaserTweet(item: FeedItem): boolean {
  // RT(리트윗)는 티저가 아님
  if (item.title.includes('RT') || item.description.includes('RT')) return false;
  // URL이 포함되어 있으면 티저가 아님 (Steam 링크 등)
  if (item.title.includes('http') || item.description.includes('http')) return false;
  // 태그+이모지 제거 후 텍스트가 거의 없으면 티저
  const textOnly = item.title
    .replace(/#\S+/g, '')        // 해시태그 제거
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '') // 이모지 제거
    .replace(/\s+/g, '')
    .trim();
  return textOnly.length < 5 && item.contentImages.length > 0;
}

/** Steam 공지 페이지에서 본문 가져오기 (curl) */
async function fetchSteamNewsContent(url: string): Promise<string | null> {
  try {
    // Steam RSS에서 해당 글 찾기
    const items = await fetchSteamFeed();
    // URL에서 view ID 추출
    const viewId = url.match(/\/view\/(\d+)/)?.[1];
    if (!viewId) return null;

    const matched = items.find(item => item.guid.includes(viewId) || item.link.includes(viewId));
    if (matched) return matched.description;

    return null;
  } catch {
    return null;
  }
}

/** 트위터 글에 Steam 링크가 있으면 Steam 내용으로 보강 */
async function enrichTwitterItem(item: FeedItem): Promise<FeedItem> {
  // title과 description 모두에서 Steam URL 검색
  const fullText = `${item.title} ${item.description}`;
  const steamUrlMatch = fullText.match(/https?:\/\/store\.steampowered\.com\/news\/app\/\d+\/view\/\d+/);
  if (!steamUrlMatch) return item;

  const steamContent = await fetchSteamNewsContent(steamUrlMatch[0]);
  if (steamContent && steamContent.length > item.description.length) {
    return {
      ...item,
      description: steamContent,
      // link는 원래 트위터 링크 유지
    };
  }
  return item;
}

/** 최신 Steam 글 1개를 가져와서 메시지로 빌드 (테스트용) */
export async function fetchLatestSteamPost() {
  const items = await fetchSteamFeed();
  if (items.length === 0) return null;
  return buildNotificationWithSummary(items[0], 'steam');
}

/** 최근 N개 글을 가져와서 메시지로 빌드 */
export async function fetchRecentPosts(source: 'steam' | 'twitter', count = 3) {
  const items = source === 'steam' ? await fetchSteamFeed() : await fetchTwitterFeed();
  const results = [];
  for (const item of items.slice(0, count)) {
    results.push(await buildNotificationWithSummary(item, source));
  }
  return results;
}

/** AI로 요약 후 메시지 빌드 */
async function buildNotificationWithSummary(item: FeedItem, source: string) {
  // 티저 트윗(태그+이미지만)이거나 본문이 짧으면 AI 요약 스킵
  if (isTeaserTweet(item)) {
    return await buildNotificationMessage(item, source);
  }

  // 본문이 충분히 길고 의미있는 텍스트가 있을 때만 요약
  const textWithoutTags = (item.description ?? '').replace(/#\S+/g, '').replace(/https?:\/\/\S+/g, '').trim();
  if (textWithoutTags.length > 100) {
    const summary = await summarizeWithGemini(item.description);
    if (summary) {
      return await buildNotificationMessage(
        { ...item, description: summary.text, contentImages: item.contentImages },
        source,
        summary.model,
      );
    }
  }
  return await buildNotificationMessage(item, source);
}

/** 알림 메시지 빌드 (배너 이미지 포함) */
async function buildNotificationMessage(item: FeedItem, source: string, aiModel?: string) {
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

  // 소스 라벨 + 제목 (태그 분리)
  const sourceLabel = source === 'steam' ? '🎮 [Steam] Limbus Company 소식' : '🐦 [X] Limbus Company 소식';
  const tags = item.title.match(/#\S+/g) ?? [];
  const urls = item.title.match(/https?:\/\/\S+/g) ?? [];
  const titleWithoutExtras = item.title
    .replace(/#\S+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const titleDisplay = titleWithoutExtras || item.title;

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## ${sourceLabel}\n# ${titleDisplay}`)
  );

  // 태그 + URL을 작은 글씨로
  const subInfo = [...(tags.length > 0 ? [tags.join(' ')] : []), ...urls.map(u => `[링크](${u})`)];
  if (subInfo.length > 0) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# ${subInfo.join(' · ')}`)
    );
  }

  // 본문
  if (item.description) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(item.description.slice(0, 500) + (item.description.length > 500 ? '\n...' : ''))
    );
  }

  // 티저 트윗이면 밝기 올린 이미지를 스포일러로 첨부
  const extraFiles: AttachmentBuilder[] = [];
  const isTeaser = isTeaserTweet(item);

  if (isTeaser && item.contentImages.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    // 원본 이미지 (스포일러 X)
    const originalGallery = new MediaGalleryBuilder()
      .addItems(...item.contentImages.map(url =>
        new MediaGalleryItemBuilder().setURL(url)
      ));
    container.addMediaGalleryComponents(originalGallery);

    // 밝기 6배 이미지 (스포일러 O)
    for (let i = 0; i < item.contentImages.length; i++) {
      const brightened = await brightenImage(item.contentImages[i]);
      if (brightened) {
        extraFiles.push(new AttachmentBuilder(brightened, { name: `SPOILER_bright_${i}.jpg` }));
      }
    }
    if (extraFiles.length > 0) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# 🔍 밝기 보정 (스포일러 주의)')
      );
      const brightGallery = new MediaGalleryBuilder()
        .addItems(...extraFiles.map((_, i) =>
          new MediaGalleryItemBuilder().setURL(`attachment://SPOILER_bright_${i}.jpg`).setSpoiler(true)
        ));
      container.addMediaGalleryComponents(brightGallery);
    }
  }

  // 본문 내 이미지 (MediaGallery) — 유효한 URL만 (티저가 아닐 때만)
  const validImages = (item.contentImages ?? []).filter(url =>
    url.startsWith('https://') && !url.includes('placeholder')
  );
  if (!isTeaser && validImages.length > 0) {
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
  const footerParts = [dateStr, aiModel ? `${aiModel}로 요약됨` : '', '[saigo-no-dante.com](https://saigo-no-dante.com)'];
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${footerParts.filter(Boolean).join(' · ')}`)
  );

  // 버튼
  const buttons = new ActionRowBuilder<MessageActionRowComponentBuilder>();
  if (item.link) {
    buttons.addComponents(
      new ButtonBuilder()
        .setLabel('원문 보기')
        .setURL(item.link)
        .setStyle(ButtonStyle.Link)
    );
  }
  if (buttons.components.length > 0) {
    container.addActionRowComponents(buttons);
  }

  const allFiles = [bannerFile, ...extraFiles].filter(Boolean) as AttachmentBuilder[];
  return { container, bannerFile, extraFiles: allFiles };
}

type BuiltMessage = { container: ContainerBuilder; bannerFile: AttachmentBuilder | null; extraFiles: AttachmentBuilder[] };

// 서버 주인 DM 스팸 방지: 길드별 마지막 DM 전송 시각
const ownerDmCooldown = new Map<string, number>();
const DM_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24시간

/** 서버 주인에게 알림 전송 실패 DM */
async function notifyOwner(
  client: Client,
  guildId: string,
  channelId: string,
  reason: string,
): Promise<void> {
  const lastDm = ownerDmCooldown.get(guildId) ?? 0;
  if (Date.now() - lastDm < DM_COOLDOWN_MS) return;

  try {
    const guild = await client.guilds.fetch(guildId);
    const owner = await guild.fetchOwner();

    await owner.send(
      `⚠️ **알림 전송 실패**\n` +
      `서버 **${guild.name}**의 알림 채널 <#${channelId}>에 메시지를 보낼 수 없습니다.\n` +
      `사유: ${reason}\n\n` +
      `봇에게 권한을 부여하거나, \`/알림설정 채널\`로 다른 채널을 지정해주세요.`
    );

    ownerDmCooldown.set(guildId, Date.now());
    console.log(`[Feed] 길드 ${guildId} 서버 주인에게 DM 전송 완료`);
  } catch (dmErr) {
    console.warn(`[Feed] 길드 ${guildId} 서버 주인 DM 실패 (차단?):`, dmErr);
  }
}

/** 길드에 메시지 전송 (권한 체크 + 서버 주인 DM) */
async function sendToGuild(
  client: Client,
  guildId: string,
  channelId: string,
  messages: BuiltMessage[],
): Promise<boolean> {
  try {
    const channel = await client.channels.fetch(channelId) as TextChannel | null;
    if (!channel?.isTextBased()) {
      await notifyOwner(client, guildId, channelId, '채널을 찾을 수 없습니다.');
      return false;
    }

    // 권한 체크
    const me = channel.guild.members.me;
    if (!me) return false;

    const permissions = channel.permissionsFor(me);
    if (!permissions?.has('SendMessages') || !permissions?.has('ViewChannel')) {
      await notifyOwner(client, guildId, channelId,
        '봇에게 해당 채널의 **메시지 보내기** 및 **채널 보기** 권한이 없습니다.');
      return false;
    }

    for (const msg of messages) {
      await channel.send({
        components: [msg.container],
        files: [
          ...(msg.bannerFile ? [new AttachmentBuilder(msg.bannerFile.attachment as Buffer, { name: 'banner.png' })] : []),
          ...msg.extraFiles.map((f, i) => new AttachmentBuilder(f.attachment as Buffer, { name: `SPOILER_bright_${i}.jpg` })),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
    return true;
  } catch (err) {
    console.error(`[Feed] 길드 ${guildId} 전송 실패:`, err);
    await notifyOwner(client, guildId, channelId, '메시지 전송 중 오류가 발생했습니다.');
    return false;
  }
}

/** 새 피드 확인 & 길드별 알림 전송 */
async function checkAndNotify(client: Client, source: string, items: FeedItem[]) {
  if (items.length === 0) return;

  // 1. 글로벌 기준으로 후보 새 글 필터링
  const tracker = await getFeedTracker(source);
  let candidateItems: FeedItem[] = [];

  if (tracker?.last_pub_date) {
    // 시간 기반: last_pub_date 이후 글만
    const lastDate = new Date(tracker.last_pub_date).getTime();
    candidateItems = items.filter(item => {
      const itemDate = new Date(item.pubDate).getTime();
      return !isNaN(itemDate) && itemDate > lastDate;
    });
  } else if (tracker?.last_id) {
    // fallback: guid 위치 기반 (기존 로직)
    const lastIndex = items.findIndex(item => item.guid === tracker.last_id);
    if (lastIndex > 0) {
      candidateItems = items.slice(0, lastIndex);
    }
    // lastId를 못 찾으면 새 글 없음으로 처리 (안전)
  } else {
    // 첫 폴링: tracker 초기화만 하고 발송하지 않음
    await updateFeedTracker(source, items[0].guid, items[0].pubDate);
    return;
  }

  // 최대 5개 제한 (비정상 대량 감지 방지)
  candidateItems = candidateItems.slice(0, 5);

  if (candidateItems.length === 0) return;

  console.log(`[Feed] ${source} 새 글 ${candidateItems.length}개 감지`);

  // 2. 메시지 빌드 (한번만)
  const builtMessages: Array<{ item: FeedItem; msg: BuiltMessage }> = [];
  for (const item of [...candidateItems].reverse()) {
    const msg = await buildNotificationWithSummary(item, source);
    builtMessages.push({ item, msg });
  }

  // 3. 길드별 전송
  const guilds = await getAllGuildsWithNotifications();
  const sourceField = source === 'steam' ? 'steam_enabled' : 'twitter_enabled';

  for (const guild of guilds) {
    if (guild[sourceField] === false) continue;

    // 이미 발송된 guid 제외
    const allGuids = builtMessages.map(b => b.item.guid);
    const sentGuids = await getGuildSentGuids(guild.guild_id, source, allGuids);
    const unsent = builtMessages.filter(b => !sentGuids.has(b.item.guid));

    if (unsent.length === 0) continue;

    const success = await sendToGuild(
      client, guild.guild_id, guild.notification_channel_id,
      unsent.map(u => u.msg),
    );

    // 전송 성공한 항목 기록
    if (success) {
      for (const { item } of unsent) {
        await markGuildFeedSent(guild.guild_id, source, item.guid, item.pubDate);
      }
    }
  }

  // 4. 글로벌 tracker 갱신 (가장 최신 글 기준)
  const newest = candidateItems[0];
  await updateFeedTracker(source, newest.guid, newest.pubDate);
}

/** 피드 폴링 시작 */
export function startFeedPoller(client: Client) {
  console.log('[Feed] Steam 폴링 5분 / Twitter 폴링 5분 간격');

  const pollSteam = async () => {
    try {
      const steamItems = await fetchSteamFeed();
      await checkAndNotify(client, 'steam', steamItems);
    } catch (err) {
      console.error('[Feed] Steam 폴링 에러:', err);
    }
  };

  const pollTwitter = async () => {
    try {
      const twitterItems = await fetchTwitterFeed();
      if (twitterItems.length > 0) {
        await checkAndNotify(client, 'twitter', twitterItems);
      }
    } catch (err) {
      console.error('[Feed] Twitter 폴링 에러:', err);
    }
  };

  // 시작 후 30초 대기 후 첫 폴링
  setTimeout(() => {
    pollSteam();
    setInterval(pollSteam, POLL_INTERVAL);

    pollTwitter();
    setInterval(pollTwitter, TWITTER_POLL_INTERVAL);
  }, 30_000);

  // 24시간마다 오래된 이력 정리
  setInterval(async () => {
    try {
      const deleted = await cleanupOldFeedHistory(30);
      if (deleted > 0) console.log(`[Feed] 오래된 이력 ${deleted}건 삭제`);
    } catch (err) {
      console.error('[Feed] 이력 정리 실패:', err);
    }
  }, 24 * 60 * 60 * 1000);
}
