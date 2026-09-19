import { create } from "zustand";

import { analyzeDogWithAI } from "@/lib/recommendation/aiEngine";
import { analyzeDog } from "@/lib/recommendation/engine";
import { getLocalDateString } from "@/lib/progress";
import {
  clearAll,
  generateId,
  getActivations,
  getDog,
  getGeminiApiKey,
  getMissionRecords,
  getOrCreateUser,
  getPlan,
  saveActivations,
  saveDog,
  saveGeminiApiKey,
  saveMissionRecords,
  savePlan,
} from "@/lib/dataStore";
import {
  CourseActivation,
  Dog,
  GenerationMode,
  MissionRecord,
  User,
  WellnessPlan,
} from "@/types/wellness";

export type DogInput = Omit<Dog, "id" | "createdAt">;

interface SubmitOptions {
  mode: GenerationMode;
  apiKey?: string;
}

interface WellnessStore {
  user: User | null;
  dog: Dog | null;
  plan: WellnessPlan | null;
  activations: CourseActivation[];
  records: MissionRecord[];
  apiKey: string;
  isHydrated: boolean;

  hydrate: () => void;
  setApiKey: (key: string) => void;
  submitDog: (input: DogInput, options: SubmitOptions) => Promise<WellnessPlan>;
  activateCourses: (courseIds: string[]) => void;
  toggleMissionComplete: (missionId: string, completed: boolean) => void;
  reset: () => void;
}

export const useWellnessStore = create<WellnessStore>((set, get) => ({
  user: null,
  dog: null,
  plan: null,
  activations: [],
  records: [],
  apiKey: "",
  isHydrated: false,

  hydrate: () => {
    set({
      user: getOrCreateUser(),
      dog: getDog(),
      plan: getPlan(),
      activations: getActivations(),
      records: getMissionRecords(),
      apiKey: getGeminiApiKey() ?? "",
      isHydrated: true,
    });
  },

  setApiKey: (key) => {
    saveGeminiApiKey(key);
    set({ apiKey: key });
  },

  submitDog: async (input, options) => {
    const dog: Dog = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    const plan =
      options.mode === "ai"
        ? await analyzeDogWithAI(dog, options.apiKey ?? "")
        : analyzeDog(dog);

    saveDog(dog);
    savePlan(plan);
    saveActivations([]);
    saveMissionRecords([]);
    set({ dog, plan, activations: [], records: [] });

    return plan;
  },

  activateCourses: (courseIds) => {
    const today = getLocalDateString();
    const current = get().activations;
    const next = [...current];
    for (const courseId of courseIds) {
      if (!next.some((a) => a.courseId === courseId)) {
        next.push({ courseId, startDate: today });
      }
    }
    saveActivations(next);
    set({ activations: next });
  },

  toggleMissionComplete: (missionId, completed) => {
    const { dog, records } = get();
    if (!dog) return;
    const today = getLocalDateString();
    const existingIndex = records.findIndex((r) => r.missionId === missionId && r.date === today);

    const next = [...records];
    if (existingIndex >= 0) {
      next[existingIndex] = {
        ...next[existingIndex],
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
      };
    } else {
      next.push({
        id: generateId(),
        missionId,
        dogId: dog.id,
        date: today,
        completed,
        completedAt: completed ? new Date().toISOString() : undefined,
      });
    }

    saveMissionRecords(next);
    set({ records: next });
  },

  reset: () => {
    clearAll();
    set({ dog: null, plan: null, activations: [], records: [] });
  },
}));
