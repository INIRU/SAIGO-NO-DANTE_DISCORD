import { config } from '../config.js';

const BASE = config.storageBase;

export const urls = {
  /** 수감자 로고 아이콘 */
  sinnerIcon: (sinnerId: string) =>
    `${BASE}/icons/Sinners/${sinnerId}.webp`,

  /** LCB 기본 프로필 */
  sinnerLcbProfile: (sinnerId: string, lcbGameId: string) =>
    `${BASE}/sinners/${sinnerId}/identities/LCB%20Sinner/${lcbGameId}_normal.webp`,

  /** 인격 일러스트 */
  identityArt: (sinnerId: string, folder: string, gameId: string, variant: 'normal' | 'gacksung' = 'normal') =>
    `${BASE}/sinners/${sinnerId}/identities/${encodeURIComponent(folder)}/${gameId}_${variant}.webp`,

  /** 인격 카드 이미지 */
  identityCard: (sinnerId: string, folder: string, gameId: string, variant: 'normal' | 'gacksung' = 'normal') =>
    `${BASE}/sinners/${sinnerId}/identities/${encodeURIComponent(folder)}/${gameId}_${variant}_info.webp`,

  /** 스킬 아이콘 (이미지 URL — 이모지 대비 폴백용) */
  skillIcon: (sinnerId: string, gameId: string, index: number) =>
    `${BASE}/icons/skills/${sinnerId}/${gameId}${String(index).padStart(2, '0')}.webp`,

  /** 죄악 아이콘 */
  sinIcon: (sinName: string) =>
    `${BASE}/icons/Sins/transparent/${sinName.charAt(0).toUpperCase() + sinName.slice(1)}.webp`,

  /** 키워드 아이콘 */
  keywordIcon: (iconSlug: string) =>
    `${BASE}/icons/keywords/${iconSlug}.webp`,

  /** EGO 등급 아이콘 */
  gradeIcon: (grade: string) =>
    `${BASE}/icons/grade/${grade}.webp`,
} as const;
