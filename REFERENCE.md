# Limbus Company Discord Bot — Reference

SAIGO NO DANTE(최애의 관리자) 웹사이트 데이터를 기반으로 한 디스코드 봇 개발 참조 문서.

## Supabase 접속 정보

- **Project ID**: `lpgqcleszdlldneiwgep`
- **DB Schema**: `limbus` (모든 테이블은 `.schema('limbus').from(...)`)
- **Storage Base**: `https://lpgqcleszdlldneiwgep.supabase.co/storage/v1/object/public/limbus-assets`

---

## 색상 시스템

### 사이트 기본 색상

| 용도 | HEX |
|------|-----|
| 배경 | `#0d0b08` |
| 카드 배경 | `#1a1510` |
| 골드 (주요 강조) | `#c8900a` |
| 밝은 골드 | `#e8b030` |
| 어두운 골드 | `#8a6010` |

### 7대 죄악 색상 (SIN_COLORS)

| 죄악 | 영문 | HEX | Discord Embed용 Decimal |
|------|------|-----|------------------------|
| 분노 | wrath | `#c83030` | 13119536 |
| 색욕 | lust | `#d06030` | 13656112 |
| 나태 | sloth | `#d4b830` | 13940784 |
| 탐식 | gluttony | `#88b028` | 8957992 |
| 우울 | gloom | `#4898b0` | 4757680 |
| 오만 | pride | `#3870b0` | 3698864 |
| 질투 | envy | `#8058a8` | 8407208 |

### EGO 등급 색상 (GRADE_COLORS)

| 등급 | HEX | Decimal |
|------|-----|---------|
| ZAYIN | `#667788` | 6715272 |
| TETH | `#4898b0` | 4757680 |
| HE | `#88a830` | 8955952 |
| WAW | `#c8900a` | 13144074 |
| ALEPH | `#c83040` | 13119552 |

### 인격 등급 색상 (RARITY_COLORS)

| 등급 | 테두리 | 글로우 |
|------|--------|--------|
| 1성 | `#556677` | `rgba(85,102,119,0.3)` |
| 2성 | `#5588bb` | `rgba(85,136,187,0.3)` |
| 3성 | `#c8900a` | `rgba(200,144,10,0.4)` |

### 한글 ↔ 영문 매핑

```
분노=wrath  색욕=lust  나태=sloth  탐식=gluttony
우울=gloom  오만=pride  질투=envy
참격=slash  관통=pierce  타격=blunt
회피=evade  수비=defense  반격=counter
```

---

## 이미지 URL 패턴

**STORAGE_BASE** = `https://lpgqcleszdlldneiwgep.supabase.co/storage/v1/object/public/limbus-assets`

### 수감자

| 패턴 | 설명 |
|------|------|
| `icons/Sinners/{sinnerId}.webp` | 수감자 로고 아이콘 |
| `sinners/{sinnerId}/identities/LCB%20Sinner/{lcbId}_normal.webp` | LCB 기본 프로필 |

### 인격

| 패턴 | 설명 |
|------|------|
| `sinners/{sinnerId}/identities/{folder}/{gameId}_normal.webp` | 일러스트 (기본) |
| `sinners/{sinnerId}/identities/{folder}/{gameId}_gacksung.webp` | 일러스트 (각성) |
| `sinners/{sinnerId}/identities/{folder}/{gameId}_normal_info.webp` | 카드 이미지 (기본) |
| `sinners/{sinnerId}/identities/{folder}/{gameId}_gacksung_info.webp` | 카드 이미지 (각성) |

### 스킬 / 아이콘

| 패턴 | 설명 |
|------|------|
| `icons/skills/{sinnerId}/{gameId}{NN}.webp` | 스킬 아이콘 (NN=01~05) |
| `icons/Sins/transparent/{Wrath,Lust,...}.webp` | 죄악 아이콘 (투명 배경) |
| `icons/Rarity/{1star,2star,3star}.webp` | 등급 별 아이콘 |
| `icons/Rarity/{0,00,000}_frame.webp` | 등급별 카드 프레임 |
| `icons/stats/{slash,pierce,blunt}.webp` | 공격 타입 아이콘 |
| `icons/keywords/{iconSlug}.webp` | 키워드 아이콘 (200+개) |
| `icons/grade/{ZAYIN,TETH,HE,WAW}.webp` | EGO 등급 아이콘 |

### EGO

| 패턴 | 설명 |
|------|------|
| `sinners/{sinnerId}/ego/{folder}/` | EGO 이미지 폴더 |

### LCB ID 매핑 (수감자별 기본 인격 game_id)

```
yi-sang=10101  faust=10201  don-quixote=10301  ryoshu=10401
meursault=10501  hong-lu=10601  heathcliff=10701  ishmael=10801
rodion=10901  sinclair=11001  outis=11101  gregor=11201
```

---

## DB 스키마 (limbus)

### sinners — 수감자 (12명)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | text (PK) | 슬러그 (`yi-sang`, `faust`, ...) |
| name | text | 영문명 |
| name_kr | text | 한글명 |
| order_num | integer | 정렬 순서 (1~12) |
| description | text | 설명 |
| literary_source | text | 원전 작품 |

### identities — 인격

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| sinner_id | text (FK→sinners) | |
| name / name_kr | text | 영문/한글명 |
| rarity | integer | 1/2/3성 |
| hp | integer | 체력 |
| speed_min / speed_max | integer | 속도 범위 |
| def_level | integer | 방어 레벨 |
| keywords | text[] | 키워드 배열 |
| slash_res / pierce_res / blunt_res | text | 참격/관통/타격 내성 |
| panic_type | text | 패닉 유형 |
| sanity_increase / sanity_decrease | text | 정신력 증감 |
| panic_description | text | 패닉 설명 |
| affiliation | text | 소속 |
| quote | text | 대사 |
| game_id | text | 게임 내 ID |
| folder_name | text | 이미지 폴더명 |
| release_date | text | 출시일 |
| acquisition | text | 획득 경로 |
| acquisition_info | jsonb | 구조화된 획득 정보 |

### skills — 스킬

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| identity_id | uuid (FK→identities) | |
| name | text | 스킬명 |
| skill_type | text | `slash`/`pierce`/`blunt`/`evade`/`defense`/`counter` |
| sin_affinity | text | 죄악 속성 |
| coins | integer | 코인 수 |
| base_power | integer | 기본 위력 |
| coin_power | integer | 코인 위력 |
| offense_level | integer | 공격 레벨 |
| defense_level | integer | 방어 레벨 |
| atk_weight | integer | 공격 가중치 |
| skill_order | integer | 순서 (1=S1, 2=S2, 3=S3, 4=수비, 5+=S3-2) |
| quantity | integer | 사용 횟수 |
| description | text | 설명 (코인 효과 포함) |
| variant_order | integer | 변형 순서 |
| uptie_level | integer | 동기화 레벨 (기본 3) |

### passives — 패시브

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| identity_id | uuid (FK→identities) | |
| passive_type | text | `battle` / `support` |
| name | text | 패시브명 |
| sin_affinity | text | 공명 죄악 |
| sin_count | integer | 필요 죄악 수 |
| active_cond | text | 발동 조건 |
| description | text | 효과 설명 |
| passive_order | integer | 순서 |
| uptie_level | integer | 동기화 레벨 |

### ego — E.G.O

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| sinner_id | text (FK→sinners) | |
| name / name_kr | text | 영문/한글명 |
| grade | text | `ZAYIN`/`TETH`/`HE`/`WAW`/`ALEPH` |
| sin_affinity | text | 주요 죄악 |
| resistance | text[] | 7죄악 내성 (순서: wrath→envy) |
| cost | integer[] | 7죄악 코스트 |
| keywords | text[] | 키워드 |
| ego_skills | jsonb | 일반 스킬 |
| ego_cor_skills | jsonb | 침식 스킬 |
| passive_name / passive_content | text | 패시브 |
| folder_name | text | 이미지 폴더명 |
| game_id | text | 게임 내 ID |
| obtaining_method | text | 입수 방법 |

### keyword_meta — 키워드 메타

| 컬럼 | 타입 | 설명 |
|------|------|------|
| name | text (PK) | 키워드명 (한글) |
| description | text | 설명 |
| max_stack | integer | 최대 스택 |
| icon_slug | text | 아이콘 (`icons/keywords/{icon_slug}.webp`) |
| sin_affinity | text | 연관 죄악 |

### ego_gifts — EGO 기프트

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| name | text | 기프트명 |
| keyword | text | 키워드 |
| grade | text | 등급 |
| tier | text | 티어 |
| price / sell_price | integer | 가격 |
| effect_base / effect_plus / effect_plusplus | text | 효과 (기본/+/++) |
| activation_condition | jsonb | 발동 조건 |
| image_url | text | 이미지 |
| is_synthesis | boolean | 합성 여부 |

### ego_gift_recipes — EGO 기프트 레시피

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| result_name | text | 결과물 |
| keyword | text | 키워드 |
| ingredients | text[] | 재료 |
| final_result | text | 최종 결과 |

### decks — 덱

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| user_id | uuid (FK→profiles) | |
| title | text | 덱 제목 |
| description | text | 설명 |
| tags | text[] | 태그 |
| vote_count / view_count / comment_count | integer | 통계 |
| deck_code | text | 편성 코드 |
| content_type | varchar | 컨텐츠 유형 |

### deck_identities — 덱 인격 슬롯

| 컬럼 | 타입 | 설명 |
|------|------|------|
| deck_id | uuid (FK→decks) | |
| identity_id | uuid (FK→identities) | |
| slot_order | integer | 슬롯 순서 |
| gacksung | boolean | 각성 여부 |
| s1_count / s2_count / s3_count | integer | 스킬 배분 |

### deck_egos — 덱 EGO 슬롯

| 컬럼 | 타입 | 설명 |
|------|------|------|
| deck_id | uuid (FK→decks) | |
| ego_id | uuid (FK→ego) | |
| grade | text | 등급 |

### deck_votes / deck_bookmarks / deck_comments

| 테이블 | PK | 설명 |
|--------|-----|------|
| deck_votes | (deck_id, user_id) | 추천 |
| deck_bookmarks | (deck_id, user_id) | 북마크 |
| deck_comments | id (uuid) | 댓글 (parent_id로 답글) |

### profiles — 사용자 프로필

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | |
| username | text | 닉네임 |
| avatar_url | text | 아바타 |
| role | text | `user` / `admin` |
| collection_code | text | 보유 현황 코드 |
| suspended | boolean | 정지 여부 |

### 기타 테이블

| 테이블 | 설명 |
|--------|------|
| announcements | 공지사항 (id, title, content, pinned) |
| identity_reviews | 인격 리뷰 (identity_id, user_id, is_positive, content) |
| identity_guides | 인격 가이드 (identity_id, author_id, title, content) |
| tier_list | 티어표 (identity_id, tier, sort_order) |
| site_maintenance | 점검 모드 (path, is_active, reason, ends_at) |
| audit_logs | 감사 로그 (actor_id, action, target_type, details) |
| legal_docs | 법률문서 (type, title, sections jsonb) |
| app_config | 앱 설정 (key, value jsonb) |

---

## TypeScript 타입

```typescript
type SinType = 'wrath' | 'lust' | 'sloth' | 'gluttony' | 'gloom' | 'pride' | 'envy'

type Sinner = {
  id: string; name: string; name_kr: string; order_num: number
  description: string; literary_source: string
}

type Identity = {
  id: string; sinner_id: string; name: string; name_kr: string
  rarity: number; hp: number; speed_min: number; speed_max: number
  def_level: number; keywords: string[]; affiliation?: string
  quote?: string; slash_res?: string; pierce_res?: string; blunt_res?: string
  game_id?: string | null; folder_name?: string | null
  panic_type?: string; panic_description?: string
  sanity_increase?: string; sanity_decrease?: string
  acquisition_info?: {
    type: 'default' | 'standard' | 'event' | 'walpurgis' | 'attendance'
    release_season: number; fragment_cost: number | null
    gacha: 'always' | 'seasonal' | 'walpurgis' | 'none'
  } | null
}

type Skill = {
  id: string; identity_id: string; name: string
  skill_type: string; sin_affinity: SinType
  coins: number; base_power: number; coin_power: number
  offense_level?: number; atk_weight?: number
  skill_order: number; description: string
  quantity?: number; variant_order?: number
}

type Passive = {
  id: string; identity_id: string; passive_type: string
  name: string; sin_affinity: string | null
  sin_count: number | null; description: string
}

type EGO = {
  id: string; sinner_id: string; name: string; name_kr: string | null
  grade: string; sin_affinity: SinType | null
  resistance: string[] | null; cost: number[] | null
  keywords: string[] | null; ego_skills: EGOSkill[] | null
  ego_cor_skills: EGOSkill[] | null
  folder_name: string | null; game_id: string | null
  obtaining_method: string | null
}

type EGOSkill = {
  name: string; power: string; atkType: string
  skillPower: number; coinPower: number; coinNum: number
  atkWeight: number; construeLevel: number
  normalEffect: string; coin1Effect: string; coin2Effect: string
  coin3Effect: string; coin4Effect: string; coin5Effect: string
}

type ActivationCondition = {
  type: 'keyword' | 'multi_keyword' | 'affiliation' | 'skill'
  keyword?: string; keywords?: string[]
  affiliation?: string; affiliations?: string[]
  count: number
}
```

---

## 수감자 목록 (정렬 순서)

| # | id | 한글 | 영문 |
|---|-----|------|------|
| 1 | yi-sang | 이상 | Yi Sang |
| 2 | faust | 파우스트 | Faust |
| 3 | don-quixote | 돈키호테 | Don Quixote |
| 4 | ryoshu | 료슈 | Ryōshū |
| 5 | meursault | 뫼르소 | Meursault |
| 6 | hong-lu | 홍루 | Hong Lu |
| 7 | heathcliff | 히스클리프 | Heathcliff |
| 8 | ishmael | 이스마엘 | Ishmael |
| 9 | rodion | 로쟈 | Rodion |
| 10 | sinclair | 싱클레어 | Sinclair |
| 11 | outis | 오티스 | Outis |
| 12 | gregor | 그레고르 | Gregor |

---

## 스킬 이미지 인덱스 규칙

스킬 이미지 파일은 `{game_id}01.webp` ~ `{game_id}NN.webp` 순서:

1. S1 (skill_order=1)
2. S2 (skill_order=2)
3. S3 (skill_order=3, 첫 번째)
4. 수비스킬 (skill_order=4: evade/defense/counter)
5. S3-2 변형 (skill_order=3, 두 번째 이상)

### 스킬 순서 라벨

```
skill_order=1 → S1
skill_order=2 → S2
skill_order=3 → S3
skill_order=4 또는 수비타입 → 수비
skill_order≥5 → S3-{skill_order-3}
```

---

## 유용한 쿼리 예시

### 수감자별 인격 목록
```sql
SELECT i.*, s.name_kr as sinner_name
FROM limbus.identities i
JOIN limbus.sinners s ON i.sinner_id = s.id
WHERE s.id = 'yi-sang'
ORDER BY i.rarity DESC, i.name_kr
```

### 인격 + 스킬 + 패시브 전체
```sql
SELECT i.name_kr, sk.name as skill_name, sk.skill_type, sk.sin_affinity,
       sk.base_power, sk.coin_power, sk.coins, sk.skill_order
FROM limbus.identities i
JOIN limbus.skills sk ON sk.identity_id = i.id
WHERE i.id = '{identity_uuid}'
ORDER BY sk.skill_order, sk.variant_order
```

### 키워드로 인격 검색
```sql
SELECT i.name_kr, s.name_kr as sinner, i.rarity
FROM limbus.identities i
JOIN limbus.sinners s ON i.sinner_id = s.id
WHERE '출혈' = ANY(i.keywords)
ORDER BY i.rarity DESC
```

### EGO 기프트 키워드 검색
```sql
SELECT name, keyword, grade, effect_base
FROM limbus.ego_gifts
WHERE keyword = '출혈'
ORDER BY grade
```
