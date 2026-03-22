import { Client, GatewayIntentBits, AttachmentBuilder, type TextChannel } from 'discord.js';
import { config } from '../src/config.js';
import sharp from 'sharp';

const RULES_CHANNEL_ID = '1485342153583624302';

// SVG 배너 생성
function createBanner(title: string, subtitle: string, color: string): Buffer {
  const svg = `<svg width="800" height="160" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0d0b08"/>
        <stop offset="100%" stop-color="#1a1510"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${color}" stop-opacity="0"/>
        <stop offset="50%" stop-color="${color}" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect width="800" height="160" fill="url(#bg)"/>
    <rect x="0" y="155" width="800" height="5" fill="url(#accent)"/>
    <rect x="0" y="0" width="800" height="2" fill="url(#accent)"/>
    <line x1="60" y1="40" x2="60" y2="120" stroke="${color}" stroke-opacity="0.4" stroke-width="3"/>
    <text x="85" y="85" font-family="sans-serif" font-size="38" font-weight="bold" fill="#e8dcc8">${title}</text>
    <text x="85" y="115" font-family="sans-serif" font-size="16" fill="#8a6010">${subtitle}</text>
  </svg>`;
  return Buffer.from(svg);
}

async function main() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(config.discord.token);
  console.log(`Logged in as ${client.user?.tag}`);

  const channel = await client.channels.fetch(RULES_CHANNEL_ID) as TextChannel;
  if (!channel?.isTextBased()) {
    console.error('Channel not found');
    process.exit(1);
  }

  // 기존 메시지 전부 삭제
  const oldMessages = await channel.messages.fetch({ limit: 20 });
  if (oldMessages.size > 0) {
    for (const msg of oldMessages.values()) {
      await msg.delete().catch(() => {});
    }
    console.log(`Deleted ${oldMessages.size} old messages`);
  }

  // 배너 이미지 생성
  const rulesBanner = await sharp(createBanner('SERVER RULES', 'SAIGO NO DANTE  |  Community Rules', '#c8900a')).png().toBuffer();
  const channelBanner = await sharp(createBanner('CHANNEL GUIDE', 'SAIGO NO DANTE  |  Channel Guide', '#4898b0')).png().toBuffer();
  const warningBanner = await sharp(createBanner('WARNING POLICY', 'SAIGO NO DANTE  |  Sanctions', '#c83030')).png().toBuffer();

  // ── 1. 규칙 배너 + 규칙 ──
  await channel.send({
    files: [new AttachmentBuilder(rulesBanner, { name: 'rules-banner.png' })],
  });

  await channel.send(
`> *"규칙을 어기면 카론이 강으로 던져버릴 거야."*

### 1️⃣ ・ 상호 존중
- 다른 멤버를 존중하고 예의를 지켜주세요
- 욕설, 비하, 차별적 발언은 금지합니다
- 다른 사람의 플레이 스타일을 비난하지 마세요

### 2️⃣ ・ 채널 용도 준수
- 각 채널의 목적에 맞게 사용해주세요
- 봇 명령어는 <#1485342203785117970> 에서 사용해주세요
- 이미지/스크린샷은 <#1477908544090144987> 을 이용해주세요

### 3️⃣ ・ 스포일러 주의
- 스토리 스포일러는 반드시 ||스포일러|| 태그로 감싸주세요
- 최신 업데이트 스포일러는 **48시간** 동안 태그 필수

### 4️⃣ ・ 홍보 및 스팸 금지
- 무단 서버 홍보, 링크 스팸은 금지합니다
- 반복적인 메시지 도배를 하지 마세요

### 5️⃣ ・ 부적절한 콘텐츠 금지
- NSFW, 혐오, 폭력적인 콘텐츠는 금지합니다
- Discord ToS를 준수해주세요`
  );
  console.log('Rules sent');

  // ── 2. 제재 배너 + 제재 기준 ──
  await channel.send({
    files: [new AttachmentBuilder(warningBanner, { name: 'warning-banner.png' })],
  });

  await channel.send(
`> **1차** 경고 → **2차** 1일 타임아웃 → **3차** 7일 타임아웃 → **4차** 영구 추방

-# 심각한 위반(도배, 혐오 발언 등)은 즉시 추방될 수 있습니다
-# 경고는 \`/경고 목록\` 명령어로 확인할 수 있습니다`
  );
  console.log('Sanctions sent');

  // ── 3. 채널 안내 배너 + 채널 목록 ──
  await channel.send({
    files: [new AttachmentBuilder(channelBanner, { name: 'channel-banner.png' })],
  });

  await channel.send(
`### 📋 안내
> <#1477908544090144982> — 서버 공지사항
> <#1482488365382242355> — 림버스 컴퍼니 공식 소식

### 💬 커뮤니티
> <#1477908544090144985> — 자유 대화
> <#1477908544090144987> — 인게임 캡처, 팬아트
> <#1485342203785117970> — 봇 명령어 (\`/인격\` \`/에고\` \`/키워드\`)
> <#1485342892997214418> — 게임 관련 질문 (포럼)
> <#1485342894423543869> — 거울 던전, 인격 운영법 (포럼)
> <#1485342896205987851> — 내 덱 공유 & 피드백 (포럼)

### 🔧 운영
> <#1478082270127456356> — 서버 개선 아이디어

━━━━━━━━━━━━━━━━━━━━━━━━━━━
-# 🌐 [saigo-no-dante.com](https://saigo-no-dante.com) | 최애의 관리자`
  );
  console.log('Channel guide sent');

  console.log('All done!');
  client.destroy();
}

main().catch(console.error);
