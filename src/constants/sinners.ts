export interface SinnerInfo {
  id: string;
  name: string;
  nameKr: string;
  order: number;
  lcbGameId: string;
}

export const SINNERS: SinnerInfo[] = [
  { id: 'yi-sang', name: 'Yi Sang', nameKr: '이상', order: 1, lcbGameId: '10101' },
  { id: 'faust', name: 'Faust', nameKr: '파우스트', order: 2, lcbGameId: '10201' },
  { id: 'don-quixote', name: 'Don Quixote', nameKr: '돈키호테', order: 3, lcbGameId: '10301' },
  { id: 'ryoshu', name: 'Ryōshū', nameKr: '료슈', order: 4, lcbGameId: '10401' },
  { id: 'meursault', name: 'Meursault', nameKr: '뫼르소', order: 5, lcbGameId: '10501' },
  { id: 'hong-lu', name: 'Hong Lu', nameKr: '홍루', order: 6, lcbGameId: '10601' },
  { id: 'heathcliff', name: 'Heathcliff', nameKr: '히스클리프', order: 7, lcbGameId: '10701' },
  { id: 'ishmael', name: 'Ishmael', nameKr: '이스마엘', order: 8, lcbGameId: '10801' },
  { id: 'rodion', name: 'Rodion', nameKr: '로쟈', order: 9, lcbGameId: '10901' },
  { id: 'sinclair', name: 'Sinclair', nameKr: '싱클레어', order: 10, lcbGameId: '11001' },
  { id: 'outis', name: 'Outis', nameKr: '오티스', order: 11, lcbGameId: '11101' },
  { id: 'gregor', name: 'Gregor', nameKr: '그레고르', order: 12, lcbGameId: '11201' },
];

/** sinner_id(slug) → 이모지 키(언더스코어) 변환 */
export function sinnerIdToEmojiKey(sinnerId: string): string {
  return sinnerId.replace(/-/g, '_');
}

/** 한글 → 영문 죄악 매핑 */
export const SIN_KR_TO_EN: Record<string, string> = {
  '분노': 'wrath', '색욕': 'lust', '나태': 'sloth', '탐식': 'gluttony',
  '우울': 'gloom', '오만': 'pride', '질투': 'envy',
};

/** 한글 → 영문 공격타입 매핑 */
export const ATK_KR_TO_EN: Record<string, string> = {
  '참격': 'slash', '관통': 'pierce', '타격': 'blunt',
  '회피': 'evade', '수비': 'defense', '반격': 'counter',
};

/** 스킬 순서 → 라벨 */
export function skillOrderLabel(skillOrder: number, variantOrder?: number | null): string {
  if (skillOrder === 4) return variantOrder && variantOrder > 1 ? `수비-${variantOrder}` : '수비';
  if (skillOrder <= 3) {
    if (variantOrder && variantOrder > 1) return `S${skillOrder}-${variantOrder}`;
    return `S${skillOrder}`;
  }
  return `S3-${skillOrder - 3}`;
}
