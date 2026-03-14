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
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  type MessageActionRowComponentBuilder,
} from 'discord.js';
import { RARITY_COLORS, SIN_COLORS } from '../constants/colors.js';
import { urls } from '../constants/urls.js';
import { formatSkillLine, formatOffenseLevel, sinnerEmoji, rarityEmoji, atkEmoji, atkLabel, sinLabel, formatResistance, replaceKeywordsWithEmoji, statEmoji, sinAffinityEmojis, computeSkillMeta, skillEmoji, type SkillMeta } from '../utils/format.js';
import { skillOrderLabel } from '../constants/sinners.js';


interface IdentityData {
  id: string;
  sinner_id: string;
  name: string;
  name_kr: string;
  rarity: number;
  hp: number;
  speed_min: number;
  speed_max: number;
  def_level: number;
  slash_res: string | null;
  pierce_res: string | null;
  blunt_res: string | null;
  keywords: string[] | null;
  game_id: string | null;
  folder_name: string | null;
  affiliation: string | null;
  sinners: { id: string; name: string; name_kr: string; order_num: number };
}

interface SkillData {
  id: string;
  name: string;
  skill_type: string;
  sin_affinity: string;
  base_power: number;
  coin_power: number;
  coins: number;
  offense_level: number | null;
  skill_order: number;
  description: string | null;
  atk_weight: number | null;
  quantity: number | null;
}

interface PassiveData {
  id: string;
  name: string;
  passive_type: string;
  sin_affinity: string | null;
  sin_count: number | null;
  description: string;
}

/** 인격 상세 뷰 (메인) */
export function buildIdentityView(
  identity: IdentityData,
  skills: SkillData[],
  siblingIdentities?: { id: string; name_kr: string; rarity: number }[],
  uptie = 4,
  baseSkills?: SkillData[],
) {
  const container = new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[identity.rarity] ?? 0xc8900a);

  // 헤더 섹션: 이름 + 썸네일
  const headerText = new TextDisplayBuilder()
    .setContent(
      `${rarityEmoji(identity.rarity)} **${identity.name_kr}**\n` +
      `${sinnerEmoji(identity.sinner_id)} ${identity.sinners.name_kr}` +
      (identity.affiliation ? ` · ${identity.affiliation}` : '')
    );

  if (identity.game_id && identity.folder_name) {
    const thumbUrl = urls.identityCard(identity.sinner_id, identity.folder_name, identity.game_id);
    const section = new SectionBuilder()
      .addTextDisplayComponents(headerText)
      .setThumbnailAccessory(
        new ThumbnailBuilder({ media: { url: thumbUrl } })
      );
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(headerText);
  }

  // 구분선
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // 기본 스탯
  const statsLines = [
    `${statEmoji('health')} \`${identity.hp}\`　${statEmoji('speed')} \`${identity.speed_min}-${identity.speed_max}\`　${statEmoji('defense')} \`${identity.def_level}\``,
    `${atkEmoji('slash')}${formatResistance(identity.slash_res)}　${atkEmoji('pierce')}${formatResistance(identity.pierce_res)}　${atkEmoji('blunt')}${formatResistance(identity.blunt_res)}`,
  ];
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(statsLines.join('\n'))
  );

  // 구분선
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // 스킬 요약
  const attackSkills = skills.filter(s =>
    s.skill_type === 'slash' || s.skill_type === 'pierce' || s.skill_type === 'blunt'
  );
  if (attackSkills.length > 0 && identity.game_id) {
    const baseMap = new Map(baseSkills?.map(s => [s.skill_order, s.offense_level]) ?? []);
    const metaMap = computeSkillMeta(skills);
    const skillLines = attackSkills.map(s =>
      formatSkillLine(s, identity.game_id!, baseMap.get(s.skill_order), metaMap.get(s.id))
    ).join('\n');
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(skillLines)
    );
  }

  // 버튼 ActionRow
  const nextUptie = uptie === 4 ? 3 : 4;
  const buttons = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`skill_detail:${identity.id}:${uptie}`)
        .setLabel('스킬 상세')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`passive:${identity.id}:${uptie}`)
        .setLabel('패시브')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`uptie_toggle:${identity.id}:${nextUptie}`)
        .setLabel(`${nextUptie}동기화 보기`)
        .setStyle(ButtonStyle.Secondary),
    );

  // 수비 스킬이 있으면 버튼 추가
  const defSkill = skills.find(s =>
    s.skill_type === 'evade' || s.skill_type === 'defense' || s.skill_type === 'counter'
  );
  if (defSkill) {
    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`def_skill:${identity.id}:${uptie}`)
        .setLabel(`수비 (${defSkill.skill_type === 'evade' ? '회피' : defSkill.skill_type === 'defense' ? '수비' : '반격'})`)
        .setStyle(ButtonStyle.Secondary),
    );
  }

  container.addActionRowComponents(buttons);

  // 사이트 홍보
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('-# [saigo-no-dante.com](https://saigo-no-dante.com) | 최애의 관리자')
  );

  // 같은 수감자 인격 드롭다운
  if (siblingIdentities && siblingIdentities.length > 1) {
    const options = siblingIdentities.slice(0, 25).map(si =>
      new StringSelectMenuOptionBuilder()
        .setLabel(si.name_kr)
        .setDescription(`${si.rarity}성`)
        .setValue(si.id)
        .setDefault(si.id === identity.id)
    );

    const selectRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`switch_identity:${identity.sinner_id}`)
          .setPlaceholder('다른 인격 보기')
          .addOptions(options)
      );

    container.addActionRowComponents(selectRow);
  }

  return container;
}

/** 스킬 상세 뷰 */
export function buildSkillDetailView(
  identity: IdentityData,
  skill: SkillData,
  totalSkills: number,
  currentIndex: number,
  uptie = 4,
  baseOffenseLevel?: number | null,
  meta?: SkillMeta,
) {
  const sinColor = SIN_COLORS[skill.sin_affinity] ?? 0xc8900a;
  const container = new ContainerBuilder().setAccentColor(sinColor);

  const variantNum = meta?.isVariant ? meta.variantNum : undefined;
  const label = skillOrderLabel(skill.skill_order, variantNum);
  const icon = identity.game_id ? skillEmoji(identity.game_id, meta?.imageIndex ?? skill.skill_order) : '';
  const olvStr = formatOffenseLevel(skill.offense_level, baseOffenseLevel);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${icon} ${label} ${skill.name}`)
  );

  const infoLines = [
    `> ${atkLabel(skill.skill_type)} · ${sinLabel(skill.sin_affinity)}`,
    `> 기본 위력 \`${skill.base_power}\` · 코인 위력 \`${skill.coin_power >= 0 ? '+' : ''}${skill.coin_power}\` · 코인 수 \`${skill.coins}\``,
    olvStr ? `> 공격 레벨 \`${olvStr}\`${skill.atk_weight ? ` · 가중치 \`${skill.atk_weight}\`` : ''}` : null,
    skill.quantity ? `> 사용 횟수 \`${skill.quantity}\`` : null,
  ].filter(Boolean).join('\n');

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(infoLines)
  );

  // 스킬 설명 (코인 효과)
  if (skill.description) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(replaceKeywordsWithEmoji(skill.description))
    );
  }

  // 네비게이션 버튼
  const nav = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`skill_nav:${identity.id}:${currentIndex - 1}:${uptie}`)
        .setLabel('◀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentIndex <= 0),
      new ButtonBuilder()
        .setCustomId(`skill_nav_info:${identity.id}`)
        .setLabel(`${currentIndex + 1}/${totalSkills}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`skill_nav:${identity.id}:${currentIndex + 1}:${uptie}`)
        .setLabel('▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentIndex >= totalSkills - 1),
      new ButtonBuilder()
        .setCustomId(`back_identity:${identity.id}:${uptie}`)
        .setLabel('돌아가기')
        .setStyle(ButtonStyle.Danger),
    );

  container.addActionRowComponents(nav);

  return container;
}

/** 패시브 뷰 (페이지네이션) */
export function buildPassiveView(
  identity: IdentityData,
  passives: PassiveData[],
  uptie = 4,
  page = 0,
) {
  const container = new ContainerBuilder()
    .setAccentColor(RARITY_COLORS[identity.rarity] ?? 0xc8900a);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `${sinnerEmoji(identity.sinner_id)} **${identity.name_kr}** — 패시브`
    )
  );

  if (passives.length === 0) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('패시브 정보가 없습니다.')
    );
  } else {
    const currentPage = Math.min(page, passives.length - 1);
    const passive = passives[currentPage];

    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    const typeLabel = passive.passive_type === 'battle' ? '⚔️ 전투' : '🤝 서포트';
    const sinReq = passive.sin_affinity && passive.sin_count
      ? ` (${sinAffinityEmojis(passive.sin_affinity)} ×${passive.sin_count})`
      : '';

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${typeLabel} — ${passive.name}${sinReq}`)
    );

    // 설명이 길면 이모지 치환 없이 표시
    const desc = passive.description.length > 800
      ? passive.description
      : replaceKeywordsWithEmoji(passive.description);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(desc)
    );

    // 페이지네이션
    if (passives.length > 1) {
      const nav = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`passive_nav:${identity.id}:${uptie}:${currentPage - 1}`)
            .setLabel('◀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage <= 0),
          new ButtonBuilder()
            .setCustomId(`passive_nav_info`)
            .setLabel(`${currentPage + 1}/${passives.length}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`passive_nav:${identity.id}:${uptie}:${currentPage + 1}`)
            .setLabel('▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(currentPage >= passives.length - 1),
          new ButtonBuilder()
            .setCustomId(`back_identity:${identity.id}:${uptie}`)
            .setLabel('돌아가기')
            .setStyle(ButtonStyle.Danger),
        );
      container.addActionRowComponents(nav);
    } else {
      const backBtn = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`back_identity:${identity.id}:${uptie}`)
            .setLabel('돌아가기')
            .setStyle(ButtonStyle.Danger),
        );
      container.addActionRowComponents(backBtn);
    }
  }

  return container;
}
