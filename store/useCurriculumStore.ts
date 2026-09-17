import { create } from "zustand";

import { generateCurriculumWithAI } from "@/lib/aiCurriculumEngine";
import { generateCurriculum } from "@/lib/curriculumEngine";
import {
  clearAll,
  generateId,
  getCurriculum,
  getDogProfile,
  getGeminiApiKey,
  saveCurriculum,
  saveDogProfile,
  saveGeminiApiKey,
} from "@/lib/dataStore";
import { DogProfile, GeneratedCurriculum, GenerationMode } from "@/types/curriculum";

export type DogProfileInput = Omit<DogProfile, "id" | "createdAt">;

interface SubmitOptions {
  mode: GenerationMode;
  apiKey?: string;
}

interface CurriculumStore {
  profile: DogProfile | null;
  curriculum: GeneratedCurriculum | null;
  apiKey: string;
  isHydrated: boolean;
  hydrate: () => void;
  setApiKey: (key: string) => void;
  submitProfile: (input: DogProfileInput, options: SubmitOptions) => Promise<GeneratedCurriculum>;
  reset: () => void;
}

export const useCurriculumStore = create<CurriculumStore>((set) => ({
  profile: null,
  curriculum: null,
  apiKey: "",
  isHydrated: false,

  hydrate: () => {
    const profile = getDogProfile();
    const curriculum = getCurriculum();
    const apiKey = getGeminiApiKey() ?? "";
    set({ profile, curriculum, apiKey, isHydrated: true });
  },

  setApiKey: (key) => {
    saveGeminiApiKey(key);
    set({ apiKey: key });
  },

  submitProfile: async (input, options) => {
    const profile: DogProfile = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    const days =
      options.mode === "ai"
        ? await generateCurriculumWithAI(profile, options.apiKey ?? "")
        : generateCurriculum(profile);

    const needsVetNotice = (profile.physicalConcerns?.trim().length ?? 0) > 0;

    const curriculum: GeneratedCurriculum = {
      id: generateId(),
      profileId: profile.id,
      days,
      needsVetNotice,
      createdAt: new Date().toISOString(),
      source: options.mode,
    };

    saveDogProfile(profile);
    saveCurriculum(curriculum);
    set({ profile, curriculum });

    return curriculum;
  },

  reset: () => {
    clearAll();
    set({ profile: null, curriculum: null });
  },
}));
