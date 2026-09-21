import { describe, expect, it } from "vitest";

import { analyzeDog } from "@/lib/recommendation/engine";
import { AssessmentInput } from "@/types/wellness";

function buildInput(overrides: Partial<AssessmentInput>): AssessmentInput {
  return {
    id: "dog-test-1",
    ownerUid: "owner-test-1",
    name: "테스트견",
    breed: "믹스견",
    ageYears: 3,
    goals: ["활동량증가"],
    ...overrides,
  };
}

describe("analyzeDog", () => {
  it("신체 걱정 부분이 관절과 관련되면 우선순위가 낮은 목표라도 1순위로 올라온다", () => {
    const plan = analyzeDog(
      buildInput({
        goals: ["활동량증가", "관절관리"],
        physicalConcerns: "고관절이 약한 편이에요",
      })
    );

    expect(plan.priorityAreas[0]).toBe("관절관리");
  });

  it("신체 걱정 부분이 있으면 운동 항목에 고급 난이도를 배치하지 않고, 건강 특이사항이 많으면(3개 이상 목표) 8주 과정이 되며, 수의사 상담 안내를 켠다", () => {
    const plan = analyzeDog(
      buildInput({
        goals: ["근력강화", "관절관리", "체중관리"],
        physicalConcerns: "무릎이 약해요",
      })
    );

    const exerciseItems = plan.days.flatMap((d) => d.items).filter((i) => i.category === "운동");
    expect(exerciseItems.length).toBeGreaterThan(0);
    expect(exerciseItems.every((i) => i.difficulty !== "고급")).toBe(true);
    expect(plan.needsVetNotice).toBe(true);
    expect(plan.weeks).toBe(8);
    expect(plan.totalDays).toBe(56);
  });

  it("교육·운동·생활관리를 요일별로 순환 배합해 하나의 커리큘럼으로 만들고, 걱정 부분이 없고 목표가 적으면 4주 과정에 수의사 안내를 끈다", () => {
    const plan = analyzeDog(buildInput({ goals: ["관계형성", "생활습관개선"] }));

    expect(plan.weeks).toBe(4);
    expect(plan.totalDays).toBe(28);
    expect(plan.days).toHaveLength(28);
    expect(plan.days.map((d) => d.day)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));

    // 1일차=교육, 2일차=운동, 3일차=생활관리 순으로 순환 배합된다
    expect(plan.days[0].items[0].category).toBe("교육");
    expect(plan.days[1].items[0].category).toBe("운동");
    expect(plan.days[2].items[0].category).toBe("생활관리");
    expect(plan.days[3].items[0].category).toBe("교육");

    expect(plan.needsVetNotice).toBe(false);
  });
});
