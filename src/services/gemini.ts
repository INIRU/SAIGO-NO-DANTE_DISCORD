import { config } from '../config.js';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

let currentKeyIndex = 0;

function getNextKey(): string | null {
  const keys = config.gemini.apiKeys;
  if (keys.length === 0) return null;
  const key = keys[currentKeyIndex % keys.length];
  currentKeyIndex++;
  return key;
}

/**
 * Gemini API로 텍스트 요약 (fallback 키 순환)
 * @param text 원본 텍스트
 * @returns 요약된 텍스트 또는 null
 */
export async function summarizeWithGemini(text: string): Promise<string | null> {
  const keys = config.gemini.apiKeys;
  if (keys.length === 0) return null;

  const prompt = `다음은 림버스 컴퍼니(Limbus Company) 게임의 공지사항입니다. 한국어로 3-4줄로 핵심 내용만 요약해주세요. 이모지를 적절히 사용해주세요. 마크다운 포맷으로 작성해주세요.\n\n${text.slice(0, 2000)}`;

  for (let attempt = 0; attempt < keys.length; attempt++) {
    const key = getNextKey();
    if (!key) return null;

    try {
      const res = await fetch(`${GEMINI_API_BASE}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.3,
          },
        }),
      });

      if (res.status === 429 || res.status === 403) {
        console.warn(`[Gemini] 키 ${attempt + 1} 실패 (${res.status}), 다음 키로 시도...`);
        continue;
      }

      if (!res.ok) {
        console.error(`[Gemini] API 에러: ${res.status}`);
        continue;
      }

      const data = await res.json() as any;
      const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (summary) {
        return summary.trim();
      }
    } catch (err) {
      console.error(`[Gemini] 요청 실패:`, err);
      continue;
    }
  }

  console.warn('[Gemini] 모든 키 소진, 요약 실패');
  return null;
}
