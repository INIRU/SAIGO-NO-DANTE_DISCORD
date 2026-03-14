# 스킬 시스템 & 이모지 매핑

> 림버스 컴퍼니 스킬 구조와 Discord 이모지 연동 가이드

---

## 스킬 구조

### DB 스킬 필드 (`limbus.skills`)

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | UUID | 스킬 고유 ID |
| `identity_id` | UUID | 소속 인격 ID |
| `name` | TEXT | 스킬명 (한글) |
| `skill_type` | TEXT | 공격 타입: `slash`, `pierce`, `blunt`, `evade`, `defense`, `counter` |
| `sin_affinity` | TEXT | 죄악 속성: `wrath`, `lust`, `sloth`, `gluttony`, `gloom`, `pride`, `envy` |
| `coins` | INT | 코인 수 |
| `base_power` | INT | 기본 위력 |
| `coin_power` | INT | 코인 위력 |
| `skill_order` | INT | 스킬 슬롯 번호 (아래 참조) |
| `uptie_level` | INT | 동기화 단계 (`3` = 기본, `4` = 강화) |
| `variant_order` | INT | 같은 skill_order 내 변형 순서 |
| `offense_level` | INT | 공격 레벨 |
| `atk_weight` | INT | 공격 가중치 |
| `quantity` | INT | 사용 횟수 |
| `description` | TEXT | 스킬 효과 설명 |

### skill_order (스킬 슬롯)

| skill_order | 의미 | 이미지 인덱스 | 이모지명 패턴 |
|---|---|---|---|
| 1 | S1 (스킬 1) | `01` | `skill_{game_id}_s1` |
| 2 | S2 (스킬 2) | `02` | `skill_{game_id}_s2` |
| 3 | S3 (스킬 3) | `03` | `skill_{game_id}_s3` |
| 4 | 수비 스킬 (회피/수비/반격) | `04` | `skill_{game_id}_s4` |
| 5+ | S3 변형 (S3-2, S3-3 등) | `05`, `06`... | `skill_{game_id}_s5` |

> **주의**: DB에서 `skill_order`로 정렬하면 S3(3)과 수비(4)가 연속되고 S3-2(5+)가 뒤에 옴.
> 이미지 파일에서는 S1→S2→S3→수비→S3-2 순서이므로, `computeSkillImageIndices()`로 별도 계산 필요.

---

## 일반 스킬 vs 강화 스킬

### uptie_level (동기화 단계)

림버스 컴퍼니에서 인격은 **동기화(uptie)** 단계에 따라 스킬 스펙이 변경된다:

| uptie_level | 이름 | 설명 |
|---|---|---|
| `3` | **3동기화 (기본)** | 기본 스킬. `uptie_level`이 NULL인 경우도 3으로 취급 |
| `4` | **4동기화 (강화)** | 강화 스킬. 위력/효과가 변경됨 |

### 구분 로직

```js
/**
 * 스킬이 강화 스킬인지 판별
 * uptie_level이 없으면 기본(3)으로 취급
 */
function isEnhancedSkill(skill) {
  return (skill.uptie_level ?? 3) === 4;
}

/**
 * 특정 동기화 단계의 스킬만 필터링
 * 해당 단계 데이터가 없으면 3동기화(기본)로 폴백
 *
 * @param {Array} skills - 전체 스킬 목록
 * @param {number} uptieLevel - 원하는 동기화 단계 (3 또는 4)
 * @returns {Array} 필터링된 스킬 목록
 */
function filterSkillsByUptie(skills, uptieLevel) {
  const filtered = skills.filter(s => (s.uptie_level ?? 3) === uptieLevel);
  // 해당 단계 데이터가 없으면 기본(3)으로 폴백
  if (filtered.length === 0) {
    return skills.filter(s => (s.uptie_level ?? 3) === 3);
  }
  return filtered;
}

/**
 * 인격에 4동기화 데이터가 존재하는지 확인
 */
function hasEnhancedData(skills, passives) {
  return skills.some(s => (s.uptie_level ?? 3) === 4)
      || passives.some(p => (p.uptie_level ?? 3) === 4);
}
```

### 같은 슬롯, 다른 동기화 단계 예시

```
인격: R사 4과 뫼르소

┌─────────┬───────────────┬───────────────┐
│ 슬롯     │ 3동기화 (기본)  │ 4동기화 (강화)  │
├─────────┼───────────────┼───────────────┤
│ S1      │ 위력 4, 코인 +4 │ 위력 5, 코인 +5 │
│ S2      │ 위력 4, 코인 +6 │ 위력 5, 코인 +6 │
│ S3      │ 위력 4, 코인 +5 │ 위력 5, 코인 +5 │
│ 수비     │ (동일)         │ (동일)         │
└─────────┴───────────────┴───────────────┘
```

> 스킬 **아이콘은 동기화 단계와 무관**하다.
> 같은 슬롯이면 3동기화든 4동기화든 같은 이모지를 사용.

---

## 변형 스킬 (S3-2, S3-3)

일부 인격은 S3 슬롯에 여러 변형 스킬이 존재한다.

### 변형 스킬 판별

```js
/**
 * 변형 스킬 그룹 생성
 * 같은 skill_order(또는 base order)를 가진 스킬이 2개 이상이면 변형 스킬
 *
 * @param {Array} skills - 필터링된 스킬 목록 (특정 uptie_level)
 * @returns {Object} { [skillId]: { baseOrder, idx, total } }
 */
function buildVariantMap(skills) {
  const groups = {};  // baseOrder → [skillId, ...]

  for (const s of skills) {
    // skill_order 5 이상은 S3 변형으로 취급
    const base = s.skill_order >= 5 ? 3 : s.skill_order;
    if (!groups[base]) groups[base] = [];
    groups[base].push(s.id);
  }

  const map = {};
  for (const [base, ids] of Object.entries(groups)) {
    ids.forEach((id, i) => {
      map[id] = {
        baseOrder: Number(base),
        idx: i + 1,     // 1-based 변형 번호
        total: ids.length // 해당 슬롯의 총 변형 수
      };
    });
  }
  return map;
}

// 사용 예:
// total > 1 이면 변형 스킬 존재
// idx === 1 → S3 (기본), idx === 2 → S3-2
```

---

## 스킬 이미지 인덱스 계산

스킬 아이콘 파일은 `{game_id}01.webp` ~ `{game_id}05.webp` 형태로 저장.
DB의 `skill_order`와 이미지 인덱스가 1:1 대응되지 않으므로 별도 계산 필요.

```js
/**
 * 스킬 목록에서 이미지 인덱스 맵 계산
 * S1→01, S2→02, S3→03, 수비→04, S3변형→05, 06...
 *
 * @param {Array} skills - { id, skill_order }[]
 * @returns {Object} { [skillId]: imageIndex }
 */
function computeSkillImageIndices(skills) {
  const seenOrder = new Set();
  const result = {};
  const variants = [];

  for (const s of skills) {
    const base = s.skill_order >= 5 ? 3 : s.skill_order;
    if (!seenOrder.has(base)) {
      seenOrder.add(base);
      result[s.id] = base;  // 1, 2, 3, 4
    } else {
      variants.push(s);     // S3 변형 스킬
    }
  }

  // 변형 스킬은 05부터 순차 부여
  variants.forEach((s, i) => {
    result[s.id] = 5 + i;
  });

  return result;
}
```

---

## Discord 이모지로 스킬 표시

### 스킬 이모지 가져오기

```js
// EMOJIS.md의 SKILL_EMOJI_IDS 참조
const SKILL_EMOJI_IDS = require('./EMOJIS.md 참조');

/**
 * 스킬의 Discord 이모지 문자열 생성
 *
 * @param {string} gameId - 인격 game_id (예: "10101")
 * @param {number} imageIndex - computeSkillImageIndices()에서 얻은 인덱스
 * @returns {string} Discord 이모지 마크다운 또는 빈 문자열
 */
function getSkillEmoji(gameId, imageIndex) {
  const name = `skill_${gameId}_s${imageIndex}`;
  const id = SKILL_EMOJI_IDS[name];
  return id ? `<:${name}:${id}>` : '';
}
```

### 전체 흐름 예시: 인격 스킬을 Discord 메시지로 출력

```js
// 1. DB에서 인격과 스킬 조회
const identity = await getIdentity(identityId);       // { game_id: "10101", ... }
const allSkills = await getSkillsByIdentity(identityId); // uptie 3 + 4 모두 포함

// 2. 동기화 단계 필터링 (기본: 4동기화, 없으면 3으로 폴백)
const skills = filterSkillsByUptie(allSkills, 4);

// 3. 이미지 인덱스 계산
const imgIdx = computeSkillImageIndices(skills);

// 4. 변형 스킬 맵
const variants = buildVariantMap(skills);

// 5. Discord 메시지 생성
const lines = [];
for (const skill of skills) {
  const emoji = getSkillEmoji(identity.game_id, imgIdx[skill.id]);
  const v = variants[skill.id];
  const slotLabel = v.total > 1
    ? `S${v.baseOrder}-${v.idx}`  // "S3-1", "S3-2"
    : v.baseOrder === 4
      ? '수비'
      : `S${v.baseOrder}`;       // "S1", "S2", "S3"

  const enhanced = isEnhancedSkill(skill) ? ' (강화)' : '';

  lines.push(
    `${emoji} **${slotLabel}${enhanced}** ${skill.name} ` +
    `[${skill.base_power}+${skill.coin_power}×${skill.coins}] ` +
    `${keywordToEmoji(skill.sin_affinity)}`  // 죄악 이모지
  );
}

// 결과 예:
// <:skill_10101_s1:123> **S1** 시선에 베인 상처 [4+4×1] <:sin_sloth:456>
// <:skill_10101_s2:124> **S2** 단정한 일격 [4+6×2] <:sin_pride:457>
// <:skill_10101_s3:125> **S3** 일섬 [4+5×3] <:sin_wrath:458>
// <:skill_10101_s4:126> **수비** 회피 [10+0×0]
```

### 공격 타입 이모지 조합

```js
// 스킬 타입 한글 매핑
const SKILL_TYPE_KR = {
  slash: '참격', pierce: '관통', blunt: '타격',
  evade: '회피', defense: '수비', counter: '반격',
};

// ATK_TYPE_EMOJI (EMOJIS.md 참조)
// 'slash' → '<:atk_slash:...>'

function formatSkillLine(skill, emoji) {
  const typeEmoji = ATK_TYPE_EMOJI[skill.skill_type] ?? '';
  const sinEmoji = SIN_EMOJI[skill.sin_affinity] ?? '';
  return `${emoji} ${typeEmoji}${sinEmoji} **${skill.name}** [${skill.base_power}+${skill.coin_power}×${skill.coins}]`;
}
```

---

## Supabase 쿼리 예시

### 특정 인격의 스킬 조회 (동기화 단계별)

```js
const { data: skills } = await supabase
  .schema('limbus')
  .from('skills')
  .select('*')
  .eq('identity_id', identityId)
  .order('skill_order')
  .order('uptie_level')
  .order('variant_order')
  .order('id');

// 3동기화 스킬만
const base = skills.filter(s => (s.uptie_level ?? 3) === 3);

// 4동기화 스킬 (없으면 3으로 폴백)
const enhanced = filterSkillsByUptie(skills, 4);
```

### 특정 인격의 game_id 조회

```js
const { data: identity } = await supabase
  .schema('limbus')
  .from('identities')
  .select('game_id, sinner_id, name')
  .eq('id', identityId)
  .single();

// game_id 예: "10101" (이상 LCB 수감자)
// 이모지명: skill_10101_s1 ~ skill_10101_s4
```

---

## 요약

| 개념 | 판별 기준 | 비고 |
|---|---|---|
| 일반 스킬 | `uptie_level` = 3 또는 NULL | 기본 스펙 |
| 강화 스킬 | `uptie_level` = 4 | 4동기화 스펙, 없으면 3으로 폴백 |
| 변형 스킬 | 같은 `skill_order`(또는 base 3)에 2개 이상 | S3-2, S3-3 등 |
| 수비 스킬 | `skill_order` = 4 | evade/defense/counter |
| 스킬 아이콘 | `skill_{game_id}_s{imageIndex}` | 동기화 단계와 무관, 슬롯 기준 |
