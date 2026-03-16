/**
 * AI 요약 서비스 (iniru.net API - GPT-5.4)
 * Gemini fallback 포함
 */

const API_URL = 'https://api.iniru.net/v1/chat/completions';
const API_KEY = 'sk-ZAlsN1boKEjWANntgEisGes8L01mr15NymrCgDqHO0qML';
const MODEL = 'gpt-5.4';

const SYSTEM_PROMPT = `당신은 림버스 컴퍼니(Limbus Company) 게임 공지사항을 Discord용으로 요약하는 전문가입니다.

규칙:
- Discord 마크다운 포맷 사용 (**, >, -, \`\` 등)
- 핵심 내용을 상세히 요약 (중요한 내용 빠짐없이)
- 문단 사이에 빈 줄을 넣어 가독성 확보
- 주제가 바뀔 때마다 줄바꿈 + 이모지 소제목 사용
- 보상 관련 내용은 반드시 별도 문단으로 정확하게 작성 (보상 내역, 지급 대상, 수령 기간 등)
- 날짜/시간은 Discord 타임스탬프 형식 사용: <t:유닉스타임:F> (전체 날짜), <t:유닉스타임:R> (상대 시간)
  - KST 시간을 유닉스 타임스탬프로 변환하여 사용
  - 예: 2026년 3월 19일 10:00 KST → <t:1774058400:F>
- 이모지를 적절히 사용하여 가독성 향상
- 유지보수/점검 일정이 있으면 강조
- 한국어로 작성

출력 예시:
🔧 **업데이트 요약**
내용 설명...

🎁 **보상 안내**
- 보상: 광기 x500
- 대상: 모든 유저
- 기간: <t:1774058400:F> ~ <t:1774663200:F>

📅 **일정**
- 핫픽스: <t:1774058400:F>`;

/**
 * AI로 텍스트 요약
 */
export async function summarizeWithGemini(text: string): Promise<string | null> {
  // 1차: iniru.net API (GPT-5.4)
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `다음 공지사항을 요약해주세요:\n\n${text.slice(0, 3000)}` },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (res.ok) {
      const data = await res.json() as any;
      const content = data?.choices?.[0]?.message?.content;
      if (content) return content.trim();
    } else {
      console.warn(`[AI] iniru.net API 에러: ${res.status}`);
    }
  } catch (err) {
    console.error('[AI] iniru.net API 실패:', err);
  }

  // 2차: Gemini fallback
  try {
    const { config } = await import('../config.js');
    const keys = config.gemini.apiKeys;
    if (keys.length === 0) return null;

    const key = keys[0];
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n다음 공지사항을 요약해주세요:\n\n${text.slice(0, 3000)}` }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
        }),
      },
    );

    if (geminiRes.ok) {
      const data = await geminiRes.json() as any;
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) return content.trim();
    }
  } catch (err) {
    console.error('[AI] Gemini fallback 실패:', err);
  }

  return null;
}
