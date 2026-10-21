import * as XLSX from "xlsx";

import { Difficulty, MissionCategory, PurposeTag, WELLNESS_GOALS } from "@/types/wellness";

/** 엑셀/워드에서 막 뽑아낸, 아직 검토 전인 미션 후보 1건 */
export interface ParsedMissionCandidate {
  category: MissionCategory | "";
  name: string;
  difficulty: Difficulty | "";
  /** 쉼표로 구분된 태그 문자열. 검토 화면에서 그대로 입력란에 보여주기 위함 */
  purposeTagsText: string;
  why: string;
  how: string;
  caution: string;
  emoji: string;
  /** 자동 추출이 불확실한 부분을 관리자에게 미리 알려준다 */
  warnings: string[];
}

const VALID_PURPOSE_TAGS = new Set<string>([...WELLNESS_GOALS, "사회화", "집중력향상"]);

export function parsePurposeTagsText(text: string): { tags: PurposeTag[]; dropped: string[] } {
  const parts = text
    .split(/[,/|、;]/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const tags: PurposeTag[] = [];
  const dropped: string[] = [];
  for (const part of parts) {
    if (VALID_PURPOSE_TAGS.has(part)) tags.push(part as PurposeTag);
    else dropped.push(part);
  }
  return { tags, dropped };
}

function normalizeCategory(raw: string): MissionCategory | "" {
  const value = raw.trim();
  if (["교육", "행동교육", "training", "education"].includes(value)) return "교육";
  if (["운동", "exercise", "운동관리"].includes(value)) return "운동";
  if (["생활관리", "생활", "lifestyle", "생활습관"].includes(value)) return "생활관리";
  return "";
}

function normalizeDifficulty(raw: string): Difficulty | "" {
  const value = raw.trim();
  if (["초급", "쉬움", "easy", "beginner"].includes(value)) return "초급";
  if (["중급", "보통", "medium", "intermediate"].includes(value)) return "중급";
  if (["고급", "어려움", "hard", "advanced"].includes(value)) return "고급";
  return "";
}

const HEADER_ALIASES: Record<string, string[]> = {
  category: ["카테고리", "분류", "category"],
  name: ["이름", "제목", "미션", "미션명", "name", "title"],
  difficulty: ["난이도", "difficulty"],
  tags: ["태그", "목표", "tags", "purposetags"],
  why: ["왜", "이유", "필요성", "why"],
  how: ["어떻게", "방법", "how"],
  caution: ["주의", "주의사항", "caution"],
  emoji: ["이모지", "emoji"],
};

function findHeaderKey(header: string): string | null {
  const normalized = header.trim().toLowerCase().replace(/\s+/g, "");
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.some((alias) => alias.toLowerCase().replace(/\s+/g, "") === normalized)) {
      return key;
    }
  }
  return null;
}

/**
 * 엑셀(.xlsx) 파일을 파싱해 미션 후보 목록을 만든다.
 * 예상 헤더: 카테고리, 이름, 난이도, 태그, 왜, 어떻게, 주의사항, 이모지(선택)
 * 헤더 이름은 위 별칭 중 하나면 인식한다. 필수 값이 비어있으면 그 행은 건너뛴다.
 */
export function parseMissionsFromExcel(buffer: ArrayBuffer): ParsedMissionCandidate[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const candidates: ParsedMissionCandidate[] = [];
  for (const row of rows) {
    const byKey: Record<string, string> = {};
    for (const [header, value] of Object.entries(row)) {
      const key = findHeaderKey(header);
      if (key) byKey[key] = String(value ?? "").trim();
    }

    const name = byKey.name ?? "";
    if (!name) continue; // 이름이 없는 빈 행은 건너뛴다

    const warnings: string[] = [];
    const category = normalizeCategory(byKey.category ?? "");
    if (!category) warnings.push("카테고리를 확인해주세요");
    const difficulty = normalizeDifficulty(byKey.difficulty ?? "");
    if (!difficulty) warnings.push("난이도를 확인해주세요");

    const why = byKey.why ?? "";
    const how = byKey.how ?? "";
    const caution = byKey.caution ?? "";
    if (!why) warnings.push("'왜' 내용이 비어있어요");
    if (!how) warnings.push("'어떻게' 내용이 비어있어요");
    if (!caution) warnings.push("'주의사항' 내용이 비어있어요");

    candidates.push({
      category,
      name,
      difficulty,
      purposeTagsText: byKey.tags ?? "",
      why,
      how,
      caution,
      emoji: byKey.emoji ?? "",
      warnings,
    });
  }
  return candidates;
}

/**
 * 워드(.docx) 파일을 파싱해 미션 후보 목록을 만든다.
 * 제목 스타일(Heading 1~3)로 쓰인 문단을 미션 이름으로 보고, 그 다음 제목이 나오기
 * 전까지의 본문을 모아 why/how/caution으로 나눠본다(완벽하지 않으니 검토가 필요하다).
 * 카테고리/난이도는 문서에서 알 수 없어 비워두고 관리자가 검토 화면에서 채운다.
 */
export async function parseMissionsFromDocx(buffer: ArrayBuffer): Promise<ParsedMissionCandidate[]> {
  const mammoth = await import("mammoth");
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buffer });

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.children);

  interface Section {
    name: string;
    paragraphs: string[];
  }
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const node of nodes) {
    const tag = node.tagName.toLowerCase();
    const text = node.textContent?.trim() ?? "";
    if (!text) continue;

    if (tag === "h1" || tag === "h2" || tag === "h3") {
      current = { name: text, paragraphs: [] };
      sections.push(current);
    } else if (current) {
      current.paragraphs.push(text);
    }
    // 첫 제목이 나오기 전의 문단은 버린다(문서 서두 설명 등으로 보고 제외)
  }

  return sections.map(({ name, paragraphs }) => {
    const why: string[] = [];
    const how: string[] = [];
    const caution: string[] = [];
    const rest: string[] = [];

    for (const p of paragraphs) {
      if (/^(주의|조심)/.test(p)) caution.push(p);
      else if (/^(어떻게|방법)/.test(p)) how.push(p);
      else if (/^(왜|이유)/.test(p)) why.push(p);
      else rest.push(p);
    }

    // 명확히 분류되지 않은 문단은 일단 why로 몰아넣고, 비어있는 how/caution은
    // 검토 화면에서 채우도록 경고만 남긴다.
    const warnings: string[] = [];
    if (why.length === 0 && rest.length > 0) why.push(...rest);
    else if (rest.length > 0) why.push(...rest);
    if (how.length === 0) warnings.push("'어떻게' 내용을 직접 입력해주세요");
    if (caution.length === 0) warnings.push("'주의사항' 내용을 직접 입력해주세요");
    warnings.push("카테고리/난이도를 선택해주세요");

    return {
      category: "" as const,
      name,
      difficulty: "" as const,
      purposeTagsText: "",
      why: why.join(" "),
      how: how.join(" "),
      caution: caution.join(" "),
      emoji: "",
      warnings,
    };
  });
}
