/**
 * AI 요약 서비스 (iniru.net API - GPT-5.4)
 * Gemini fallback 포함
 */

const API_URL = 'https://api.iniru.net/v1/chat/completions';
const API_KEY = 'sk-ZAlsN1boKEjWANntgEisGes8L01mr15NymrCgDqHO0qML';
const MODEL = 'gpt-5.4';

const SYSTEM_PROMPT = `림버스 컴퍼니 공지사항을 Discord용으로 짧게 요약해.

규칙:
- 3~5줄 이내로 핵심만
- 없는 정보는 절대 추측하지 마. 본문에 없으면 안 써
- 보상 있으면 정확히 (내역, 대상, 기간)
- 날짜는 Discord 타임스탬프: <t:유닉스타임:F> (KST→UTC 변환)
- 이모지 소제목 1~2개만
- 수평선(---) 사용 금지
- 한국어`;

/**
 * AI로 텍스트 요약
 */
export interface SummaryResult {
  text: string;
  model: string; // 'GPT-5.4' | 'Gemini' 등
}

export async function summarizeWithGemini(text: string): Promise<SummaryResult | null> {
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
      if (content) return { text: content.trim(), model: 'GPT-5.4' };
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
      if (content) return { text: content.trim(), model: 'Gemini' };
    }
  } catch (err) {
    console.error('[AI] Gemini fallback 실패:', err);
  }

  return null;
}
