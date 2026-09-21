import { create } from "zustand";

import { generateId, getGeminiApiKey, saveGeminiApiKey } from "@/lib/dataStore";
import {
  createDog as createDogDoc,
  getCurriculum,
  getDog as getDogDoc,
  listDogsByOwner,
  listMissionRecords,
  saveCurriculum,
  setMissionRecord,
} from "@/lib/firebase/dogs";
import { getLocalDateString } from "@/lib/progress";
import { analyzeDogWithAI } from "@/lib/recommendation/aiEngine";
import { analyzeDog } from "@/lib/recommendation/engine";
import { AssessmentInput, Curriculum, Dog, GenerationMode, MissionRecord } from "@/types/wellness";

export type DogInput = Omit<Dog, "id" | "ownerUid" | "createdAt" | "updatedAt">;

interface SubmitOptions {
  mode: GenerationMode;
  apiKey?: string;
}

interface WellnessStore {
  apiKey: string;
  isHydrated: boolean;

  dogs: Dog[];
  isLoadingDogs: boolean;

  currentDog: Dog | null;
  currentCurriculum: Curriculum | null;
  currentRecords: MissionRecord[];
  isLoadingCurrentDog: boolean;

  hydrate: () => void;
  setApiKey: (key: string) => void;

  loadDogs: (ownerUid: string) => Promise<void>;
  addDog: (ownerUid: string, input: DogInput, options: SubmitOptions) => Promise<Dog>;
  loadDogDetail: (dogId: string) => Promise<void>;
  toggleMissionComplete: (
    ownerUid: string,
    missionId: string,
    date: string,
    completed: boolean
  ) => Promise<void>;
  clearCurrentDog: () => void;
  clearDogs: () => void;
}

export const useWellnessStore = create<WellnessStore>((set, get) => ({
  apiKey: "",
  isHydrated: false,

  dogs: [],
  isLoadingDogs: false,

  currentDog: null,
  currentCurriculum: null,
  currentRecords: [],
  isLoadingCurrentDog: false,

  hydrate: () => {
    set({ apiKey: getGeminiApiKey() ?? "", isHydrated: true });
  },

  setApiKey: (key) => {
    saveGeminiApiKey(key);
    set({ apiKey: key });
  },

  loadDogs: async (ownerUid) => {
    set({ isLoadingDogs: true });
    try {
      const dogs = await listDogsByOwner(ownerUid);
      set({ dogs, isLoadingDogs: false });
    } catch {
      set({ isLoadingDogs: false });
    }
  },

  addDog: async (ownerUid, input, options) => {
    const assessmentInput: AssessmentInput = {
      ...input,
      id: generateId(),
      ownerUid,
    };

    const plan =
      options.mode === "ai"
        ? await analyzeDogWithAI(assessmentInput, options.apiKey ?? "")
        : analyzeDog(assessmentInput);

    const dogId = await createDogDoc({
      ownerUid,
      name: input.name,
      birthDate: input.birthDate,
      ageYears: input.ageYears,
      breed: input.breed,
      gender: input.gender,
      weightKg: input.weightKg,
      neutered: input.neutered,
      healthConditions: input.healthConditions,
      activityLevel: input.activityLevel,
      dailyWalkMinutes: input.dailyWalkMinutes,
      behaviorConcerns: input.behaviorConcerns,
      physicalConcerns: input.physicalConcerns,
      goals: input.goals,
    });

    await saveCurriculum(dogId, ownerUid, { ...plan, startDate: getLocalDateString() });

    const dog = await getDogDoc(dogId);
    if (!dog) throw new Error("강아지 정보를 저장하지 못했어요.");

    set((state) => ({ dogs: [...state.dogs, dog] }));
    return dog;
  },

  loadDogDetail: async (dogId) => {
    set({ isLoadingCurrentDog: true });
    try {
      const [dog, curriculum, records] = await Promise.all([
        getDogDoc(dogId),
        getCurriculum(dogId),
        listMissionRecords(dogId),
      ]);
      set({
        currentDog: dog,
        currentCurriculum: curriculum,
        currentRecords: records,
        isLoadingCurrentDog: false,
      });
    } catch {
      set({ isLoadingCurrentDog: false });
    }
  },

  toggleMissionComplete: async (ownerUid, missionId, date, completed) => {
    const { currentDog, currentRecords } = get();
    if (!currentDog) return;

    await setMissionRecord(currentDog.id, ownerUid, missionId, date, completed);

    const record: MissionRecord = {
      id: `${missionId}_${date}`,
      dogId: currentDog.id,
      missionId,
      date,
      completed,
      completedAt: completed ? Date.now() : undefined,
    };
    const existingIndex = currentRecords.findIndex(
      (r) => r.missionId === missionId && r.date === date
    );
    const next = [...currentRecords];
    if (existingIndex >= 0) next[existingIndex] = record;
    else next.push(record);

    set({ currentRecords: next });
  },

  clearCurrentDog: () => set({ currentDog: null, currentCurriculum: null, currentRecords: [] }),
  clearDogs: () => set({ dogs: [] }),
}));
