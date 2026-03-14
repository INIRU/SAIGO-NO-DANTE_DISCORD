/** 7대 죄악 색상 */
export const SIN_COLORS: Record<string, number> = {
  wrath: 0xc83030,
  lust: 0xd06030,
  sloth: 0xd4b830,
  gluttony: 0x88b028,
  gloom: 0x4898b0,
  pride: 0x3870b0,
  envy: 0x8058a8,
};

/** EGO 등급 색상 */
export const GRADE_COLORS: Record<string, number> = {
  ZAYIN: 0x667788,
  TETH: 0x4898b0,
  HE: 0x88a830,
  WAW: 0xc8900a,
  ALEPH: 0xc83040,
};

/** 인격 등급 색상 */
export const RARITY_COLORS: Record<number, number> = {
  1: 0x556677,
  2: 0x5588bb,
  3: 0xc8900a,
};

/** 사이트 기본 색상 */
export const SITE_COLORS = {
  background: 0x0d0b08,
  cardBackground: 0x1a1510,
  gold: 0xc8900a,
  brightGold: 0xe8b030,
  darkGold: 0x8a6010,
} as const;
