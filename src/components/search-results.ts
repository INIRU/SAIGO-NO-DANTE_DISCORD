import {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { SIN_COLORS } from '../constants/colors.js';
import { urls } from '../constants/urls.js';
import { sinnerEmoji, rarityEmoji, replaceKeywordsWithEmoji } from '../utils/format.js';
import { KEYWORD_EMOJI_MAP } from '../constants/emojis.js';

const PAGE_SIZE = 10;

interface KeywordMeta {
  name: string;
  description: string | null;
  max_stack: number | null;
  icon_slug: string | null;
  sin_affinity: string | null;
}

interface IdentitySummary {
  id: string;
  name_kr: string;
  rarity: number;
  sinner_id: string;
}

/** 키워드 검색 결과 뷰 */
export function buildKeywordView(
  keyword: KeywordMeta,
  identities: IdentitySummary[],
  page = 0,
) {
  const accentColor = keyword.sin_affinity ? (SIN_COLORS[keyword.sin_affinity] ?? 0xc8900a) : 0xc8900a;
  const container = new ContainerBuilder().setAccentColor(accentColor);

  // 키워드 정보 (썸네일로 아이콘 크게 표시)
  const kwEmoji = KEYWORD_EMOJI_MAP[keyword.name] ?? '';
  const headerLines = [
    `${kwEmoji} **${keyword.name}**`,
    keyword.description ? keyword.description : null,
    keyword.max_stack ? `최대 스택: ${keyword.max_stack}` : null,
  ].filter(Boolean).join('\n');

  if (keyword.icon_slug) {
    const thumbUrl = urls.keywordIcon(keyword.icon_slug);
    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(headerLines)
      )
      .setThumbnailAccessory(
        new ThumbnailBuilder({ media: { url: thumbUrl } })
      );
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(headerLines)
    );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // 인격 목록 (페이지네이션)
  const totalPages = Math.max(1, Math.ceil(identities.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;
  const pageItems = identities.slice(start, start + PAGE_SIZE);

  if (pageItems.length > 0) {
    const lines = pageItems.map(i =>
      `${rarityEmoji(i.rarity)}${sinnerEmoji(i.sinner_id)} ${i.name_kr}`
    ).join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**보유 인격 (${identities.length}개)**\n${lines}`)
    );
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('해당 키워드를 가진 인격이 없습니다.')
    );
  }

  // 페이지네이션 버튼
  if (totalPages > 1) {
    const nav = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`kw_page:${keyword.name}:${currentPage - 1}`)
          .setLabel('◀')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage <= 0),
        new ButtonBuilder()
          .setCustomId(`kw_page_info`)
          .setLabel(`${currentPage + 1}/${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`kw_page:${keyword.name}:${currentPage + 1}`)
          .setLabel('▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage >= totalPages - 1),
      );

    container.addActionRowComponents(nav);
  }

  return container;
}

const TIER_ROMAN: Record<string, string> = {
  '1': 'Ⅰ', '2': 'Ⅱ', '3': 'Ⅲ', '4': 'Ⅳ', '5': 'Ⅴ',
};

type GiftData = {
  id: string;
  name: string;
  keyword: string | null;
  grade: string | null;
  tier: string | null;
  price: number | null;
  sell_price: number | null;
  effect_base: string | null;
  effect_plus: string | null;
  effect_plusplus: string | null;
  image_url: string | null;
};

const EFFECT_TABS = ['base', 'plus', 'plusplus'] as const;
const EFFECT_LABELS: Record<string, string> = { base: '기본', plus: '+', plusplus: '++' };

/** EGO 기프트 뷰 (탭 전환) */
export function buildEgoGiftView(gift: GiftData, tab: string = 'base') {
  const container = new ContainerBuilder().setAccentColor(0xc8900a);

  const tierDisplay = gift.tier ? (TIER_ROMAN[gift.tier] ?? gift.tier) : (gift.grade ? (TIER_ROMAN[gift.grade] ?? gift.grade) : '');
  const headerLines = [
    `# ${gift.name}`,
    tierDisplay ? `> ${tierDisplay}` : null,
    gift.keyword ? `> 🔑 ${replaceKeywordsWithEmoji(gift.keyword)}${gift.price ? ` · 💰 ${gift.price}` : ''}` : null,
  ].filter(Boolean).join('\n');

  if (gift.image_url && gift.image_url.startsWith('http')) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(headerLines)
      )
      .setThumbnailAccessory(
        new ThumbnailBuilder({ media: { url: gift.image_url } })
      );
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(headerLines)
    );
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // 현재 탭의 효과 표시
  const effects: Record<string, string | null> = {
    base: gift.effect_base,
    plus: gift.effect_plus,
    plusplus: gift.effect_plusplus,
  };

  const currentEffect = effects[tab] ?? gift.effect_base;
  if (currentEffect) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `## ${EFFECT_LABELS[tab] ?? '기본'} 효과\n${replaceKeywordsWithEmoji(currentEffect)}`
      )
    );
  }

  // 탭 버튼 (효과가 있는 것만 표시)
  const availableTabs = EFFECT_TABS.filter(t => effects[t]);
  if (availableTabs.length > 1) {
    const tabButtons = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(
        ...availableTabs.map(t =>
          new ButtonBuilder()
            .setCustomId(`gift_tab:${gift.id}:${t}`)
            .setLabel(EFFECT_LABELS[t])
            .setStyle(t === tab ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(t === tab)
        )
      );
    container.addActionRowComponents(tabButtons);
  }

  // 사이트 홍보
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('-# [saigo-no-dante.com](https://saigo-no-dante.com) | 최애의 관리자')
  );

  return container;
}
