import { z } from "zod";

import { generateId } from "@/lib/dataStore";
import {
  Dog,
  Mission,
  MissionCategory,
  RecommendedCourse,
  WellnessAssessment,
  WellnessGoal,
  WellnessPlan,
  WELLNESS_GOALS,
} from "@/types/wellness";

/**
 * Gemini 기반 AI 웰니스 분석기.
 * analyzeDog(lib/recommendation/engine.ts)과 동일하게 Dog를 입력받아
 * WellnessPlan을 반환하는 계약을 그대로 따른다.
 * API 키는 사용자가 직접 입력하며, 브라우저에서 Google Gemini API로 곧장 요청한다
 * (우리 서버는 거치지 않는다).
 */

const GEMINI_MODEL = "gemini-3.5-flash-lite";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 45_000;
const COURSE_LENGTH_DAYS = 7;

export class AIAnalysisError extends Error {}

const CATEGORY_VALUES = ["교육", "운동", "생활관리"] as const;
const DIFFICULTY_VALUES = ["초급", "중급", "고급"] as const;
const PURPOSE_TAG_VALUES = [...WELLNESS_GOALS, "사회화", "집중력향상"] as const;

const aiMissionSchema = z.object({
  day: z.number().int().min(1).max(COURSE_LENGTH_DAYS),
  name: z.string().trim().min(1),
  difficulty: z.enum(DIFFICULTY_VALUES),
  purposeTags: z.array(z.enum(PURPOSE_TAG_VALUES)).min(1).max(3),
  why: z.string().trim().min(1),
  how: z.string().trim().min(1),
  caution: z.string().trim().min(1),
  emoji: z.string().trim().max(4).optional(),
});

const aiCourseSchema = z.object({
  category: z.enum(CATEGORY_VALUES),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  matchedGoals: z.array(z.enum(WELLNESS_GOALS)).min(1).max(3),
  missions: z.array(aiMissionSchema).length(COURSE_LENGTH_DAYS),
});

const aiPlanSchema = z.object({
  currentStateSummary: z.string().trim().min(1),
  priorityAreas: z
    .array(z.enum(WELLNESS_GOALS))
    .min(1),
  recommendedEducationSummary: z.string().trim().min(1),
  recommendedExerciseSummary: z.string().trim().min(1),
  recommendedLifestyleSummary: z.string().trim().min(1),
  courses: z.array(aiCourseSchema).length(3),
});

const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    currentStateSummary: { type: "STRING" },
    priorityAreas: { type: "ARRAY", items: { type: "STRING", enum: WELLNESS_GOALS } },
    recommendedEducationSummary: { type: "STRING" },
    recommendedExerciseSummary: { type: "STRING" },
    recommendedLifestyleSummary: { type: "STRING" },
    courses: {
      type: "ARRAY",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING", enum: CATEGORY_VALUES },
          title: { type: "STRING" },
          description: { type: "STRING" },
          matchedGoals: { type: "ARRAY", items: { type: "STRING", enum: WELLNESS_GOALS } },
          missions: {
            type: "ARRAY",
            minItems: COURSE_LENGTH_DAYS,
            maxItems: COURSE_LENGTH_DAYS,
            items: {
              type: "OBJECT",
              properties: {
                day: { type: "INTEGER" },
                name: { type: "STRING" },
                difficulty: { type: "STRING", enum: DIFFICULTY_VALUES },
                purposeTags: { type: "ARRAY", items: { type: "STRING", enum: PURPOSE_TAG_VALUES } },
                why: { type: "STRING" },
                how: { type: "STRING" },
                caution: { type: "STRING" },
                emoji: { type: "STRING" },
              },
              required: ["day", "name", "difficulty", "purposeTags", "why", "how", "caution"],
              propertyOrdering: [
                "day",
                "name",
                "difficulty",
                "purposeTags",
                "why",
                "how",
                "caution",
                "emoji",
              ],
            },
          },
        },
        required: ["category", "title", "description", "matchedGoals", "missions"],
        propertyOrdering: ["category", "title", "description", "matchedGoals", "missions"],
      },
    },
  },
  required: [
    "currentStateSummary",
    "priorityAreas",
    "recommendedEducationSummary",
    "recommendedExerciseSummary",
    "recommendedLifestyleSummary",
    "courses",
  ],
  propertyOrdering: [
    "currentStateSummary",
    "priorityAreas",
    "recommendedEducationSummary",
    "recommendedExerciseSummary",
    "recommendedLifestyleSummary",
    "courses",
  ],
} as const;

const SYSTEM_INSTRUCTION = `당신은 10년 경력의 반려견 교육·피트니스 전문가의 노하우를 바탕으로 만들어진 AI 웰니스 코치입니다.
보호자가 입력한 반려견 정보를 참고해 웰니스 분석과 7일치 맞춤 코스 3개(교육/운동/생활관리)를 만드세요.

규칙:
- 반드시 한국어로 작성하세요.
- courses는 정확히 3개이며, category는 "교육", "운동", "생활관리"를 각각 하나씩 사용하세요.
- 각 코스의 missions는 day 1부터 7까지 정확히 7개, 하루에 1개씩 배치하세요.
- 반려견의 나이, 활동량, 목표(goals), 행동 고민, 신체 걱정 부분, 건강 특이사항을 반영해
  priorityAreas(우선 관리 영역)와 난이도, purposeTags를 조정하세요.
- 절대로 질병을 진단하거나 치료법을 처방하는 듯한 표현을 쓰지 마세요. 건강 특이사항이나 신체
  걱정 부분이 입력된 경우, how나 caution에서 무리한 동작을 피하도록 안내하고 필요하다면
  전문가·수의사와 상담하라는 취지를 자연스럽게 포함하세요.
- purposeTags는 주어진 목록 중에서만 1~3개를 고르세요.
- 같은 미션을 일주일 내내 반복하지 말고 다양하게 구성하세요.
- name, why, how, caution은 모두 한두 문장 내외로 간결하고 따뜻한 톤으로 작성하세요.
- emoji는 미션마다 과하지 않게 1개까지만 붙이세요 (없어도 됩니다).`;

function buildDogSummary(dog: Dog): string {
  const lines: string[] = [];
  lines.push(`이름: ${dog.name}`);
  if (dog.birthDate) lines.push(`생년월일: ${dog.birthDate}`);
  if (dog.ageYears !== undefined) lines.push(`나이: 약 ${dog.ageYears}세`);
  lines.push(`견종: ${dog.breed}`);
  if (dog.gender) lines.push(`성별: ${dog.gender}`);
  if (dog.weightKg !== undefined) lines.push(`몸무게: ${dog.weightKg}kg`);
  if (dog.neutered !== undefined) lines.push(`중성화 여부: ${dog.neutered ? "완료" : "안 함"}`);
  if (dog.healthConditions) lines.push(`현재 질환/건강 특이사항: ${dog.healthConditions}`);
  if (dog.activityLevel) lines.push(`평소 활동량: ${dog.activityLevel}`);
  if (dog.dailyWalkMinutes !== undefined) lines.push(`하루 평균 산책 시간: ${dog.dailyWalkMinutes}분`);
  if (dog.behaviorConcerns) lines.push(`행동 고민: ${dog.behaviorConcerns}`);
  if (dog.physicalConcerns) lines.push(`신체적으로 걱정되는 부분: ${dog.physicalConcerns}`);
  lines.push(`보호자가 원하는 목표: ${dog.goals.join(", ")}`);
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

export async function analyzeDogWithAI(dog: Dog, apiKey: string): Promise<WellnessPlan> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new AIAnalysisError("Gemini API 키를 입력해주세요.");
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
                text: `다음 반려견 정보를 참고해 웰니스 분석과 7일 코스 3개를 만들어주세요.\n\n${buildDogSummary(dog)}`,
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
      throw new AIAnalysisError(
        "AI 응답이 너무 오래 걸려 요청을 중단했어요. 잠시 후 다시 시도해주세요."
      );
    }
    throw new AIAnalysisError("네트워크 오류로 AI 서버에 연결하지 못했어요. 인터넷 연결을 확인해주세요.");
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
    throw new AIAnalysisError(friendlyErrorFromBody(response.status, body));
  }

  const data = await response.json();

  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new AIAnalysisError(
      "안전 정책으로 인해 AI가 응답을 생성하지 못했어요. 입력 내용을 조금 수정해서 다시 시도해주세요."
    );
  }

  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new AIAnalysisError("AI가 빈 응답을 반환했어요. 다시 시도해주세요.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new AIAnalysisError("AI 응답을 해석하지 못했어요. 다시 시도해주세요.");
  }

  const parsed = aiPlanSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new AIAnalysisError("AI가 만든 분석 결과 형식이 올바르지 않아요. 다시 시도해주세요.");
  }

  const needsVetNotice =
    (dog.physicalConcerns?.trim().length ?? 0) > 0 || (dog.healthConditions?.trim().length ?? 0) > 0;

  const assessment: WellnessAssessment = {
    id: generateId(),
    dogId: dog.id,
    currentStateSummary: parsed.data.currentStateSummary,
    goals: dog.goals,
    priorityAreas: parsed.data.priorityAreas,
    recommendedEducationSummary: parsed.data.recommendedEducationSummary,
    recommendedExerciseSummary: parsed.data.recommendedExerciseSummary,
    recommendedLifestyleSummary: parsed.data.recommendedLifestyleSummary,
    needsVetNotice,
    source: "ai",
    createdAt: new Date().toISOString(),
  };

  const courses: RecommendedCourse[] = parsed.data.courses.map((course) => {
    const missions: Mission[] = [...course.missions]
      .sort((a, b) => a.day - b.day)
      .map((m) => ({
        id: `ai-${generateId()}`,
        category: course.category as MissionCategory,
        day: m.day,
        name: m.name,
        difficulty: m.difficulty,
        purposeTags: m.purposeTags,
        why: m.why,
        how: m.how,
        caution: m.caution,
        emoji: m.emoji,
      }));

    return {
      id: `ai-${generateId()}`,
      category: course.category as MissionCategory,
      title: course.title,
      description: course.description,
      matchedGoals: course.matchedGoals,
      missions,
    };
  });

  return { assessment, courses };
}
