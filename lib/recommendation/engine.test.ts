import { describe, expect, it } from "vitest";

import { analyzeDog } from "@/lib/recommendation/engine";
import { AssessmentInput } from "@/types/wellness";

function buildInput(overrides: Partial<AssessmentInput>): AssessmentInput {
  return {
    id: "dog-test-1",
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

    expect(plan.assessment.priorityAreas[0]).toBe("관절관리");
  });

  it("신체 걱정 부분이 있으면 운동 코스에 고급 난이도 미션을 배치하지 않고, 수의사 상담 안내를 켠다", () => {
    const plan = analyzeDog(
      buildInput({
        goals: ["근력강화"],
        physicalConcerns: "무릎이 약해요",
      })
    );

    const exerciseCourse = plan.courses.find((c) => c.category === "운동");
    expect(exerciseCourse).toBeDefined();
    expect(exerciseCourse!.missions.every((m) => m.difficulty !== "고급")).toBe(true);
    expect(plan.assessment.needsVetNotice).toBe(true);
  });

  it("교육/운동/생활관리 3개 코스를 각각 7일치(1~7일) 미션으로 만들고, 걱정 부분이 없으면 수의사 안내를 끈다", () => {
    const plan = analyzeDog(buildInput({ goals: ["관계형성", "생활습관개선"] }));

    expect(plan.courses).toHaveLength(3);
    expect(plan.courses.map((c) => c.category).sort()).toEqual(["교육", "생활관리", "운동"].sort());

    for (const course of plan.courses) {
      expect(course.missions).toHaveLength(7);
      expect(course.missions.map((m) => m.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    }

    expect(plan.assessment.needsVetNotice).toBe(false);
  });
});
