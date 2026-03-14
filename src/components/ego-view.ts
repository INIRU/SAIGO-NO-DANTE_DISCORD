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
import { GRADE_COLORS } from '../constants/colors.js';
import { sinnerEmoji, formatSinCost, formatSinResistance, replaceKeywordsWithEmoji, atkLabel, gradeEmoji, statEmoji } from '../utils/format.js';

interface EgoData {
  id: string;
  sinner_id: string;
  name: string;
  name_kr: string | null;
  grade: string;
  sin_affinity: string | null;
  resistance: string[] | null;
  cost: number[] | null;
  keywords: string[] | null;
  ego_skills: EgoSkillData[] | null;
  ego_cor_skills: EgoSkillData[] | null;
  passive_name: string | null;
  passive_content: string | null;
  folder_name: string | null;
  game_id: string | null;
  image_url: string | null;
  cor_image_url: string | null;
  sinners: { id: string; name: string; name_kr: string; order_num: number };
}

interface EgoSkillData {
  name: string;
  power: string;
  atkType: string;
  skillPower: number;
  coinPower: number;
  coinNum: number;
  atkWeight: number;
  construeLevel: number;
  normalEffect: string;
  coin1Effect: string;
  coin2Effect: string;
  coin3Effect: string;
  coin4Effect: string;
  coin5Effect: string;
}

/** EGO 메인 뷰 */
export function buildEgoView(ego: EgoData, showCorrosion = false, construeLevel = 4) {
  const container = new ContainerBuilder()
    .setAccentColor(GRADE_COLORS[ego.grade] ?? 0xc8900a);

  // 헤더 + CG 이미지 썸네일
  const displayName = ego.name_kr ?? ego.name;
  const headerText = new TextDisplayBuilder().setContent(
    `# ${gradeEmoji(ego.grade)} ${displayName}\n${sinnerEmoji(ego.sinner_id)} ${ego.sinners.name_kr}`
  );

  const imageUrl = ego.image_url;
  if (imageUrl && imageUrl.startsWith('http')) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(headerText)
      .setThumbnailAccessory(
        new ThumbnailBuilder({ media: { url: imageUrl } })
      );
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(headerText);
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // 죄악 코스트 & 내성
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `> **코스트** ${formatSinCost(ego.cost)}\n> **내성** ${formatSinResistance(ego.resistance)}`
    )
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // 스킬 정보 (construeLevel로 필터)
  const skillSet = showCorrosion ? ego.ego_cor_skills : ego.ego_skills;
  const skillLabel = showCorrosion ? '침식 스킬' : '일반 스킬';

  if (skillSet && skillSet.length > 0) {
    // construeLevel로 필터 (없으면 첫번째)
    const filtered = skillSet.filter(s => s.construeLevel === construeLevel);
    const skill = filtered.length > 0 ? filtered[0] : skillSet[0];

    const sign = skill.coinPower >= 0 ? '+' : '';
    const skillLines = [
      `## ${skillLabel} — ${skill.name}`,
      `> ${atkLabel(skill.atkType.toLowerCase())} · 위력 \`${skill.power}\``,
      `> 코인 위력 \`${sign}${skill.coinPower}\` · 코인 \`${skill.coinNum}\` · 가중치 \`${skill.atkWeight}\``,
      skill.normalEffect ? `\n${replaceKeywordsWithEmoji(skill.normalEffect)}` : null,
      ...([skill.coin1Effect, skill.coin2Effect, skill.coin3Effect, skill.coin4Effect, skill.coin5Effect]
        .filter(Boolean)
        .map((e, i) => {
          const coinIcon = e.includes('파괴 불가') ? statEmoji('unbreakable_coin') : statEmoji('coin');
          return `${coinIcon} 코인 ${i + 1}: ${replaceKeywordsWithEmoji(e)}`;
        })
      ),
    ].filter(Boolean).join('\n');

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(skillLines)
    );
  }

  // 사이트 홍보
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('-# [saigo-no-dante.com](https://saigo-no-dante.com) | 최애의 관리자')
  );

  // 버튼
  const nextConstrue = construeLevel === 4 ? 3 : 4;
  const buttons = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`ego_toggle:${ego.id}:${showCorrosion ? 'normal' : 'corrosion'}:${construeLevel}`)
        .setLabel(showCorrosion ? '일반 스킬 보기' : '침식 스킬 보기')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!ego.ego_cor_skills || ego.ego_cor_skills.length === 0),
      new ButtonBuilder()
        .setCustomId(`ego_construe:${ego.id}:${showCorrosion ? 'corrosion' : 'normal'}:${nextConstrue}`)
        .setLabel(`${nextConstrue}해석 보기`)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`ego_passive:${ego.id}`)
        .setLabel('패시브')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!ego.passive_name),
    );

  container.addActionRowComponents(buttons);

  return container;
}

/** EGO 패시브 뷰 */
export function buildEgoPassiveView(ego: EgoData) {
  const container = new ContainerBuilder()
    .setAccentColor(GRADE_COLORS[ego.grade] ?? 0xc8900a);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `# ${ego.grade} ${ego.name_kr ?? ego.name} — 패시브`
    )
  );

  if (ego.passive_name && ego.passive_content) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );
    const desc = ego.passive_content.length > 800
      ? ego.passive_content
      : replaceKeywordsWithEmoji(ego.passive_content);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${ego.passive_name}**\n${desc}`)
    );
  }

  const backBtn = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`back_ego:${ego.id}`)
        .setLabel('돌아가기')
        .setStyle(ButtonStyle.Danger),
    );

  container.addActionRowComponents(backBtn);

  return container;
}
