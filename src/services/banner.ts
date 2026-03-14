import sharp from 'sharp';

const BANNER_WIDTH = 800;
const BANNER_HEIGHT = 160;

/**
 * 공지 배너 이미지 생성
 * SAIGO NO DANTE 브랜딩 + 소스 표시만
 */
export async function generateBanner(opts: {
  source: 'steam' | 'twitter';
}): Promise<Buffer> {
  const { source } = opts;

  const sourceText = source === 'steam' ? 'STEAM' : 'TWITTER';
  const accentColor = source === 'steam' ? '#1b2838' : '#1da1f2';

  const svg = `
    <svg width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stop-color="#0d0b08"/>
          <stop offset="60%" stop-color="#141010"/>
          <stop offset="100%" stop-color="#1a1510"/>
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#8a6010"/>
          <stop offset="50%" stop-color="#e8b030"/>
          <stop offset="100%" stop-color="#c8900a"/>
        </linearGradient>
        <linearGradient id="goldFade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#c8900a" stop-opacity="0.8"/>
          <stop offset="100%" stop-color="#c8900a" stop-opacity="0"/>
        </linearGradient>
        <clipPath id="rounded">
          <rect width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" rx="12" ry="12"/>
        </clipPath>
      </defs>

      <g clip-path="url(#rounded)">
        <!-- 배경 -->
        <rect width="${BANNER_WIDTH}" height="${BANNER_HEIGHT}" fill="url(#bg)"/>

        <!-- 장식 -->
        <line x1="550" y1="0" x2="${BANNER_WIDTH}" y2="80" stroke="#c8900a" stroke-opacity="0.06" stroke-width="1"/>
        <line x1="600" y1="0" x2="${BANNER_WIDTH}" y2="60" stroke="#c8900a" stroke-opacity="0.04" stroke-width="1"/>
        <circle cx="720" cy="30" r="100" fill="#c8900a" opacity="0.015"/>

        <!-- 좌측 골드 바 -->
        <rect x="0" y="0" width="4" height="${BANNER_HEIGHT}" fill="url(#gold)"/>

        <!-- 상단 골드 라인 -->
        <rect x="4" y="0" width="350" height="1.5" fill="url(#goldFade)"/>

        <!-- SAIGO NO DANTE -->
        <text x="40" y="62" font-family="'Georgia', 'Times New Roman', serif" font-size="36" font-weight="700" fill="url(#gold)" letter-spacing="10">SAIGO NO DANTE</text>

        <!-- 최애의 관리자 -->
        <text x="40" y="88" font-family="'Segoe UI', 'Noto Sans KR', sans-serif" font-size="13" fill="#8a7a60" letter-spacing="4">최 애 의 관 리 자</text>

        <!-- 구분선 -->
        <rect x="40" y="105" width="720" height="1" fill="#c8900a" opacity="0.2"/>

        <!-- 소스 라벨 -->
        <rect x="40" y="118" width="${sourceText.length * 12 + 30}" height="28" rx="5" fill="${accentColor}"/>
        <text x="${40 + (sourceText.length * 12 + 30) / 2}" y="137" font-family="'Segoe UI', sans-serif" font-size="13" font-weight="bold" fill="white" text-anchor="middle" letter-spacing="2">${sourceText}</text>

        <!-- 우하단 URL -->
        <text x="${BANNER_WIDTH - 30}" y="${BANNER_HEIGHT - 18}" font-family="'Georgia', serif" font-size="11" fill="#4a3a20" text-anchor="end" letter-spacing="1">saigo-no-dante.com</text>

        <!-- 하단 골드 라인 -->
        <rect x="4" y="${BANNER_HEIGHT - 1.5}" width="350" height="1.5" fill="url(#goldFade)"/>
      </g>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}
