import {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { SITE_COLORS } from '../constants/colors.js';
import { urls } from '../constants/urls.js';
import { sinnerEmoji, rarityEmoji, gradeEmoji } from '../utils/format.js';


interface SinnerData {
  id: string;
  name: string;
  name_kr: string;
  order_num: number;
  description: string | null;
  literary_source: string | null;
}

interface IdentitySummary {
  id: string;
  name_kr: string;
  rarity: number;
  game_id: string | null;
}

interface EgoSummary {
  id: string;
  name_kr: string | null;
  name: string;
  grade: string;
  sin_affinity: string | null;
}

/** 수감자 오버뷰 */
export function buildSinnerView(
  sinner: SinnerData,
  identities: IdentitySummary[],
  egos: EgoSummary[],
) {
  const container = new ContainerBuilder()
    .setAccentColor(SITE_COLORS.gold);

  // ── 헤더 ──
  const thumbUrl = urls.sinnerIcon(sinner.id);

  const headerText = new TextDisplayBuilder()
    .setContent(
      `${sinnerEmoji(sinner.id)} **${sinner.name_kr}** (${sinner.name})` +
      (sinner.literary_source ? `\n-# 📖 ${sinner.literary_source}` : '')
    );

  const section = new SectionBuilder()
    .addTextDisplayComponents(headerText)
    .setThumbnailAccessory(
      new ThumbnailBuilder({ media: { url: thumbUrl } })
    );

  container.addSectionComponents(section);

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // ── 인격 목록 ──
  if (identities.length > 0) {
    const sorted = [...identities].sort((a, b) => b.rarity - a.rarity);
    const idLines = sorted.slice(0, 15).map(i =>
      `${rarityEmoji(i.rarity)} ${i.name_kr}`
    ).join('\n');
    const overflow = identities.length > 15 ? `\n-# ...외 ${identities.length - 15}개` : '';
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### 인격 (${identities.length})\n${idLines}${overflow}`)
    );

    // 인격 선택 드롭다운
    const idOptions = sorted.slice(0, 25).map(i =>
      new StringSelectMenuOptionBuilder()
        .setLabel(i.name_kr)
        .setDescription(`${i.rarity}성`)
        .setValue(i.id)
    );

    const idSelect = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_identity:${sinner.id}`)
          .setPlaceholder('📋 인격 상세 보기')
          .addOptions(idOptions)
      );

    container.addActionRowComponents(idSelect);
  }

  // ── EGO 목록 ──
  if (egos.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    const gradeOrder = ['ZAYIN', 'TETH', 'HE', 'WAW', 'ALEPH'];
    const sorted = [...egos].sort((a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade));

    const egoLines = sorted.slice(0, 15).map(e =>
      `${gradeEmoji(e.grade)} ${e.name_kr ?? e.name}`
    ).join('\n');
    const overflow = egos.length > 15 ? `\n-# ...외 ${egos.length - 15}개` : '';
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### E.G.O (${egos.length})\n${egoLines}${overflow}`)
    );

    const egoOptions = sorted.slice(0, 25).map(e =>
      new StringSelectMenuOptionBuilder()
        .setLabel(e.name_kr ?? e.name)
        .setDescription(e.grade)
        .setValue(e.id)
    );

    const egoSelect = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_ego:${sinner.id}`)
          .setPlaceholder(`🔮 E.G.O 상세 보기`)
          .addOptions(egoOptions)
      );

    container.addActionRowComponents(egoSelect);
  }

  // ── 푸터 ──
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('-# [saigo-no-dante.com](https://saigo-no-dante.com) | 최애의 관리자')
  );

  return container;
}
