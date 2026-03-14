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
import { sinnerEmoji, rarityEmoji } from '../utils/format.js';


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

  // 헤더
  const thumbUrl = urls.sinnerIcon(sinner.id);

  const headerText = new TextDisplayBuilder()
    .setContent(
      `${sinnerEmoji(sinner.id)} **${sinner.name_kr}** (${sinner.name})` +
      (sinner.literary_source ? `\n📖 ${sinner.literary_source}` : '')
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

  // 인격 목록
  if (identities.length > 0) {
    const idLines = identities.slice(0, 15).map(i =>
      `${rarityEmoji(i.rarity)} ${i.name_kr}`
    ).join('\n');
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**인격 (${identities.length}개)**\n${idLines}`)
    );

    // 인격 선택 드롭다운
    const idOptions = identities.slice(0, 25).map(i =>
      new StringSelectMenuOptionBuilder()
        .setLabel(i.name_kr)
        .setDescription(`${i.rarity}성`)
        .setValue(i.id)
    );

    const idSelect = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_identity:${sinner.id}`)
          .setPlaceholder('인격 상세 보기')
          .addOptions(idOptions)
      );

    container.addActionRowComponents(idSelect);
  }

  // 사이트 홍보
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('-# [saigo-no-dante.com](https://saigo-no-dante.com) | 최애의 관리자')
  );

  // EGO 선택 드롭다운
  if (egos.length > 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    const egoOptions = egos.slice(0, 25).map(e =>
      new StringSelectMenuOptionBuilder()
        .setLabel(e.name_kr ?? e.name)
        .setDescription(e.grade)
        .setValue(e.id)
    );

    const egoSelect = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`select_ego:${sinner.id}`)
          .setPlaceholder(`E.G.O 상세 보기 (${egos.length}개)`)
          .addOptions(egoOptions)
      );

    container.addActionRowComponents(egoSelect);
  }

  return container;
}
