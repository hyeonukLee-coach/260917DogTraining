import { create } from "zustand";

import { generateCurriculum } from "@/lib/curriculumEngine";
import {
  clearAll,
  generateId,
  getCurriculum,
  getDogProfile,
  saveCurriculum,
  saveDogProfile,
} from "@/lib/dataStore";
import { DogProfile, GeneratedCurriculum } from "@/types/curriculum";

export type DogProfileInput = Omit<DogProfile, "id" | "createdAt">;

interface CurriculumStore {
  profile: DogProfile | null;
  curriculum: GeneratedCurriculum | null;
  isHydrated: boolean;
  hydrate: () => void;
  submitProfile: (input: DogProfileInput) => GeneratedCurriculum;
  reset: () => void;
}

export const useCurriculumStore = create<CurriculumStore>((set) => ({
  profile: null,
  curriculum: null,
  isHydrated: false,

  hydrate: () => {
    const profile = getDogProfile();
    const curriculum = getCurriculum();
    set({ profile, curriculum, isHydrated: true });
  },

  submitProfile: (input) => {
    const profile: DogProfile = {
      ...input,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    const days = generateCurriculum(profile);
    const needsVetNotice = (profile.physicalConcerns?.trim().length ?? 0) > 0;

    const curriculum: GeneratedCurriculum = {
      id: generateId(),
      profileId: profile.id,
      days,
      needsVetNotice,
      createdAt: new Date().toISOString(),
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
