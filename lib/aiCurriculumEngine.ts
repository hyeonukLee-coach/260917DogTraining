import { z } from "zod";

import { generateId } from "@/lib/dataStore";
import { CurriculumDay, DogProfile } from "@/types/curriculum";

/**
 * Gemini 기반 AI 커리큘럼 생성기.
 * generateCurriculum(lib/curriculumEngine.ts)과 동일하게
 * DogProfile을 입력받아 CurriculumDay[]를 반환하는 계약을 그대로 따른다.
 * API 키는 사용자가 직접 입력하며, 브라우저에서 Google Gemini API로 곧장 요청한다
 * (우리 서버는 거치지 않는다).
 */

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 45_000;

export class AICurriculumError extends Error {}

const PURPOSE_TAG_VALUES = [
  "관절관리",
  "체중관리",
  "근력강화",
  "행동교육",
  "정서안정",
  "활동량증가",
  "사회화",
  "집중력향상",
] as const;

const DIFFICULTY_VALUES = ["초급", "중급", "고급"] as const;
const ITEM_TYPE_VALUES = ["운동", "교육"] as const;

const aiItemSchema = z.object({
  type: z.enum(ITEM_TYPE_VALUES),
  name: z.string().trim().min(1),
  difficulty: z.enum(DIFFICULTY_VALUES),
  purposeTags: z.array(z.enum(PURPOSE_TAG_VALUES)).min(1).max(3),
  description: z.string().trim().min(1),
  method: z.string().trim().min(1),
  caution: z.string().trim().min(1),
});

const aiDaySchema = z.object({
  day: z.number().int().min(1).max(7),
  items: z.array(aiItemSchema).min(1).max(3),
});

const aiResponseSchema = z.array(aiDaySchema).length(7);

/** Gemini structured output에 전달하는 JSON 스키마 (OpenAPI 서브셋, 대문자 타입) */
const GEMINI_RESPONSE_SCHEMA = {
  type: "ARRAY",
  minItems: 7,
  maxItems: 7,
  items: {
    type: "OBJECT",
    properties: {
      day: { type: "INTEGER" },
      items: {
        type: "ARRAY",
        minItems: 1,
        maxItems: 3,
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ITEM_TYPE_VALUES },
            name: { type: "STRING" },
            difficulty: { type: "STRING", enum: DIFFICULTY_VALUES },
            purposeTags: {
              type: "ARRAY",
              items: { type: "STRING", enum: PURPOSE_TAG_VALUES },
            },
            description: { type: "STRING" },
            method: { type: "STRING" },
            caution: { type: "STRING" },
          },
          required: ["type", "name", "difficulty", "purposeTags", "description", "method", "caution"],
          propertyOrdering: [
            "type",
            "name",
            "difficulty",
            "purposeTags",
            "description",
            "method",
            "caution",
          ],
        },
      },
    },
    required: ["day", "items"],
    propertyOrdering: ["day", "items"],
  },
} as const;

const SYSTEM_INSTRUCTION = `당신은 10년 경력의 반려견 피트니스·행동 교육 전문가의 노하우를 바탕으로 만들어진 AI 웰니스 코치입니다.
보호자가 입력한 반려견 정보를 참고해 7일치 맞춤 커리큘럼을 만드세요.

규칙:
- 반드시 한국어로 작성하세요.
- day는 1부터 7까지 정확히 7개를 만드세요.
- 각 day의 items는 1~3개로 구성하세요. curriculumType이 "운동"이면 모든 항목의 type을 "운동"으로, "교육"이면 "교육"으로, "둘다"이면 매일 "운동" 1개 이상과 "교육" 1개 이상을 포함하세요.
- 반려견의 나이, 활동량, 행동 고민, 신체 걱정 부분을 반영해 난이도와 목적 태그를 조정하세요.
- 절대로 질병을 진단하거나 치료법을 처방하는 듯한 표현을 쓰지 마세요. 신체적으로 걱정되는 부분이 입력된 경우, method나 caution에서 무리한 동작을 피하도록 안내하고 필요하다면 전문가·수의사와 상담하라는 취지를 자연스럽게 포함하세요.
- purposeTags는 주어진 목록 중에서만 1~3개를 고르세요.
- 같은 항목을 일주일 내내 반복하지 말고 다양하게 구성하세요.
- name, description, method, caution은 모두 한두 문장 내외로 간결하게 작성하세요.`;

function buildProfileSummary(profile: DogProfile): string {
  const lines: string[] = [];
  lines.push(`이름: ${profile.name}`);
  if (profile.birthDate) lines.push(`생년월일: ${profile.birthDate}`);
  if (profile.ageYears !== undefined) lines.push(`나이: 약 ${profile.ageYears}세`);
  lines.push(`견종: ${profile.breed}`);
  if (profile.gender) lines.push(`성별: ${profile.gender}`);
  if (profile.weightKg !== undefined) lines.push(`몸무게: ${profile.weightKg}kg`);
  if (profile.neutered !== undefined) lines.push(`중성화 여부: ${profile.neutered ? "완료" : "안 함"}`);
  if (profile.activityLevel) lines.push(`평소 활동량: ${profile.activityLevel}`);
  if (profile.dailyWalkMinutes !== undefined) {
    lines.push(`하루 평균 산책 시간: ${profile.dailyWalkMinutes}분`);
  }
  if (profile.behaviorConcerns) lines.push(`행동 고민: ${profile.behaviorConcerns}`);
  if (profile.physicalConcerns) lines.push(`신체적으로 걱정되는 부분: ${profile.physicalConcerns}`);
  lines.push(`원하는 커리큘럼 유형: ${profile.curriculumType}`);
  return lines.join("\n");
}

function friendlyErrorFromBody(status: number, body: unknown): string {
  const reason =
    body && typeof body === "object" && "error" in body
      ? (body as { error?: { details?: Array<{ reason?: string }>; message?: string } }).error
      : undefined;
  const errorReason = reason?.details?.[0]?.reason;

  if (status === 400 && errorReason === "API_KEY_INVALID") {
    return "API 키가 올바르지 않습니다. Google AI Studio에서 발급받은 키를 다시 확인해주세요.";
  }
  if (status === 403) {
    return "이 API 키로는 요청이 거부되었습니다. 키 권한이나 프로젝트 설정을 확인해주세요.";
  }
  if (status === 429) {
    return "무료 사용량을 초과했어요. 잠시 후 다시 시도해주세요.";
  }
  if (reason?.message) {
    return `AI 요청이 실패했습니다: ${reason.message}`;
  }
  return `AI 요청이 실패했습니다. (오류 코드: ${status})`;
}

export async function generateCurriculumWithAI(
  profile: DogProfile,
  apiKey: string
): Promise<CurriculumDay[]> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new AICurriculumError("Gemini API 키를 입력해주세요.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": trimmedKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `다음 반려견 정보를 참고해 7일 커리큘럼을 만들어주세요.\n\n${buildProfileSummary(profile)}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: GEMINI_RESPONSE_SCHEMA,
          temperature: 0.6,
        },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new AICurriculumError(
        "AI 응답이 너무 오래 걸려 요청을 중단했어요. 잠시 후 다시 시도해주세요."
      );
    }
    throw new AICurriculumError("네트워크 오류로 AI 서버에 연결하지 못했어요. 인터넷 연결을 확인해주세요.");
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      // 응답 바디 파싱 실패 시 기본 메시지를 사용한다.
    }
    throw new AICurriculumError(friendlyErrorFromBody(response.status, body));
  }

  const data = await response.json();

  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new AICurriculumError(
      "안전 정책으로 인해 AI가 응답을 생성하지 못했어요. 입력 내용을 조금 수정해서 다시 시도해주세요."
    );
  }

  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new AICurriculumError("AI가 빈 응답을 반환했어요. 다시 시도해주세요.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new AICurriculumError("AI 응답을 해석하지 못했어요. 다시 시도해주세요.");
  }

  const parsed = aiResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new AICurriculumError("AI가 만든 커리큘럼 형식이 올바르지 않아요. 다시 시도해주세요.");
  }

  const days: CurriculumDay[] = [...parsed.data]
    .sort((a, b) => a.day - b.day)
    .map((day) => ({
      day: day.day,
      items: day.items.map((item) => ({
        id: `ai-${generateId()}`,
        type: item.type,
        name: item.name,
        difficulty: item.difficulty,
        purposeTags: item.purposeTags,
        description: item.description,
        method: item.method,
        caution: item.caution,
      })),
    }));

  return days;
}
