import { SIN_EMOJI, ATK_TYPE_EMOJI, RARITY_EMOJI, SINNER_EMOJI, STAT_EMOJI, GRADE_EMOJI, getSkillEmoji, KEYWORD_EMOJI_MAP } from '../constants/emojis.js';
import { sinnerIdToEmojiKey, skillOrderLabel } from '../constants/sinners.js';

/** 영문 → 한글 죄악 매핑 */
const SIN_KR: Record<string, string> = {
  wrath: '분노', lust: '색욕', sloth: '나태', gluttony: '탐식',
  gloom: '우울', pride: '오만', envy: '질투',
};

/** 한글 → 영문 죄악 역매핑 */
const SIN_KR_REVERSE: Record<string, string> = Object.fromEntries(
  Object.entries(SIN_KR).map(([en, kr]) => [kr, en])
);

/** 영문 → 한글 공격타입 매핑 */
const ATK_KR: Record<string, string> = {
  slash: '참격', pierce: '관통', blunt: '타격',
  evade: '회피', defense: '수비', counter: '반격',
};

/** 죄악 이모지 + 한글 */
export function sinEmoji(sin: string): string {
  return SIN_EMOJI[sin] ?? sin;
}
export function sinLabel(sin: string): string {
  return `${SIN_EMOJI[sin] ?? ''} ${SIN_KR[sin] ?? sin}`.trim();
}

/** 한글 죄악명(쉼표 구분 가능)을 이모지로 변환 */
export function sinAffinityEmojis(sinAffinity: string | null): string {
  if (!sinAffinity) return '';
  return sinAffinity.split(',').map(s => {
    const trimmed = s.trim();
    const en = SIN_KR_REVERSE[trimmed];
    return en ? sinEmoji(en) : trimmed;
  }).join(' ');
}

/** 공격 타입 이모지 + 한글 */
export function atkEmoji(type: string): string {
  return ATK_TYPE_EMOJI[type] ?? type;
}
export function atkLabel(type: string): string {
  return `${ATK_TYPE_EMOJI[type] ?? ''} ${ATK_KR[type] ?? type}`.trim();
}

/** 스탯 이모지 */
export function statEmoji(stat: string): string {
  return STAT_EMOJI[stat] ?? stat;
}

/** 등급 이모지 */
export function rarityEmoji(rarity: number): string {
  return RARITY_EMOJI[`${rarity}star`] ?? `${rarity}성`;
}

/** EGO 등급 이모지 */
export function gradeEmoji(grade: string): string {
  return GRADE_EMOJI[grade] ?? grade;
}

/** 수감자 이모지 */
export function sinnerEmoji(sinnerId: string): string {
  const key = sinnerIdToEmojiKey(sinnerId);
  return SINNER_EMOJI[key] ?? sinnerId;
}

/** 스킬 이모지 (이미지 인덱스 기반) */
export function skillEmoji(gameId: string, imageIndex: number): string {
  return getSkillEmoji(gameId, imageIndex);
}

/**
 * 스킬 목록에서 이미지 인덱스 & 변형 정보 계산
 * 같은 skill_order 내 첫 번째 = primary, 나머지 = variant
 * S1→1, S2→2, S3→3, 수비→4, 변형들→5, 6, 7...
 */
export interface SkillMeta {
  imageIndex: number;
  isVariant: boolean;
  variantNum: number; // 그룹 내 순서 (1 = primary)
}

export function computeSkillMeta(skills: { id: string; skill_order: number; variant_order?: number | null }[]): Map<string, SkillMeta> {
  const result = new Map<string, SkillMeta>();
  const groups = new Map<number, string[]>(); // skill_order → [id, ...]

  // 그룹핑 (입력 순서 유지)
  for (const s of skills) {
    const group = groups.get(s.skill_order) ?? [];
    group.push(s.id);
    groups.set(s.skill_order, group);
  }

  const variants: string[] = [];

  for (const [order, ids] of groups) {
    // 첫 번째 = primary → image index = skill_order
    result.set(ids[0], { imageIndex: order, isVariant: false, variantNum: 1 });
    // 나머지 = variant → 나중에 5부터 순차
    for (let i = 1; i < ids.length; i++) {
      variants.push(ids[i]);
      result.set(ids[i], { imageIndex: 0, isVariant: true, variantNum: i + 1 }); // imageIndex는 아래에서 설정
    }
  }

  // 변형 스킬 이미지 인덱스: 5부터 순차
  let nextIdx = 5;
  for (const id of variants) {
    const meta = result.get(id)!;
    meta.imageIndex = nextIdx++;
  }

  return result;
}

/** 공격 레벨 포맷: 64(+4) */
export function formatOffenseLevel(current: number | null | undefined, base?: number | null): string {
  if (!current) return '';
  if (base && current !== base) {
    const diff = current - base;
    return `${current}(${diff >= 0 ? '+' : ''}${diff})`;
  }
  return `${current}`;
}

/** 스킬 요약 한 줄 */
export function formatSkillLine(skill: {
  name: string;
  skill_type: string;
  sin_affinity: string;
  base_power: number;
  coin_power: number;
  coins: number;
  offense_level?: number | null;
  skill_order: number;
  variant_order?: number | null;
}, gameId: string, baseOffenseLevel?: number | null, meta?: SkillMeta): string {
  const variantNum = meta?.isVariant ? meta.variantNum : undefined;
  const label = skillOrderLabel(skill.skill_order, variantNum ? variantNum : undefined);
  const icon = skillEmoji(gameId, meta?.imageIndex ?? skill.skill_order);
  const sin = sinEmoji(skill.sin_affinity);
  const atk = atkEmoji(skill.skill_type);
  const sign = skill.coin_power >= 0 ? '+' : '';
  const olv = skill.offense_level ? ` / 공레 ${formatOffenseLevel(skill.offense_level, baseOffenseLevel)}` : '';

  return `${icon} **${label} ${skill.name}**\n${sin}${atk} 기본 ${skill.base_power} / 코인 ${sign}${skill.coin_power} / ×${skill.coins}${olv}`;
}

/** 내성 텍스트 포맷 */
export function formatResistance(value: string | null): string {
  if (!value) return '-';
  switch (value) {
    case 'weak': return '**약점**';
    case 'normal': return '보통';
    case 'resist': case 'endure': return '내성';
    case 'fatal': return '***치명***';
    case 'ineffective': return '무효';
    default: return value;
  }
}

/** 한글 판별 */
function isHangul(ch: string | undefined): boolean {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return (code >= 0xac00 && code <= 0xd7a3) || (code >= 0x3131 && code <= 0x318e);
}

const PARTICLES = new Set([
  '이', '가', '을', '를', '의', '에', '은', '는',
  '과', '와', '도', '로', '만', '야', '라', '며',
  '든', '인', '및', '나', '란',
]);

/** 텍스트 내 한글 키워드 앞에 이모지를 삽입 (원본 텍스트 유지, 볼드 처리) */
export function replaceKeywordsWithEmoji(text: string): string {
  const allKeywords = Object.keys(KEYWORD_EMOJI_MAP)
    .sort((a, b) => b.length - a.length);

  let result = '';
  let prevChar = '';

  while (text.length > 0) {
    let foundKeyword = false;

    for (const kw of allKeywords) {
      if (!text.startsWith(kw)) continue;

      if (kw.length <= 2) {
        if (isHangul(prevChar)) continue;
        const nextCh = text[kw.length];
        if (isHangul(nextCh) && !PARTICLES.has(nextCh)) continue;
      }

      // 이모지 + 원본 텍스트 볼드
      result += `${KEYWORD_EMOJI_MAP[kw]} **${kw}**`;
      prevChar = kw[kw.length - 1];
      text = text.slice(kw.length);
      foundKeyword = true;
      break;
    }

    if (!foundKeyword) {
      result += text[0];
      prevChar = text[0];
      text = text.slice(1);
    }
  }

  return result;
}

/** 죄악 코스트 표시 (EGO용) */
export function formatSinCost(costs: number[] | null): string {
  if (!costs || costs.length < 7) return '-';
  const sins = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
  return sins
    .map((sin, i) => costs[i] > 0 ? `${sinEmoji(sin)}\`${costs[i]}\`` : null)
    .filter(Boolean)
    .join(' ') || '없음';
}

/** 죄악 내성 표시 (EGO용) */
export function formatSinResistance(resistances: string[] | null): string {
  if (!resistances || resistances.length < 7) return '-';
  const sins = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
  return sins
    .map((sin, i) => `${sinEmoji(sin)}${formatResistance(resistances[i])}`)
    .join(' ');
}
