"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Camera, Check, Eye, EyeOff, Sparkles, X } from "lucide-react";

import { AIAnalysisError } from "@/lib/recommendation/aiEngine";
import { saveDogPhoto } from "@/lib/dataStore";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { fadeInProps, MotionDiv } from "@/components/motion";
import { useWellnessStore, DogInput } from "@/store/useWellnessStore";
import { ActivityLevel, Gender, WellnessGoal, WELLNESS_GOALS } from "@/types/wellness";

const formSchema = z
  .object({
    name: z.string().trim().min(1, "이름을 입력해주세요"),
    ageInputMode: z.enum(["birthDate", "age"]),
    birthDate: z.string().optional(),
    ageYears: z.string().optional(),
    breed: z.string().trim().min(1, "견종을 입력해주세요"),
    gender: z.string().optional(),
    weightKg: z.string().optional(),
    neutered: z.boolean().optional(),
    healthConditions: z.string().optional(),
    activityLevel: z.string().optional(),
    dailyWalkMinutes: z.string().optional(),
    behaviorConcerns: z.string().optional(),
    physicalConcerns: z.string().optional(),
    goals: z.array(z.string()).min(1, "목표를 1개 이상 선택해주세요"),
    photoDataUrl: z.string().optional(),
    generationMode: z.enum(["rule", "ai"]),
    apiKey: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ageInputMode === "birthDate" && !data.birthDate) {
      ctx.addIssue({ code: "custom", path: ["birthDate"], message: "생년월일을 입력해주세요" });
    }
    if (data.ageInputMode === "age" && !data.ageYears) {
      ctx.addIssue({ code: "custom", path: ["ageYears"], message: "나이를 입력해주세요" });
    }
    if (data.generationMode === "ai" && !data.apiKey?.trim()) {
      ctx.addIssue({ code: "custom", path: ["apiKey"], message: "Gemini API 키를 입력해주세요" });
    }
  });

type FormValues = z.infer<typeof formSchema>;

const defaultValues: FormValues = {
  name: "",
  ageInputMode: "age",
  birthDate: "",
  ageYears: "",
  breed: "",
  gender: "",
  weightKg: "",
  neutered: false,
  healthConditions: "",
  activityLevel: "",
  dailyWalkMinutes: "",
  behaviorConcerns: "",
  physicalConcerns: "",
  goals: [],
  photoDataUrl: "",
  generationMode: "rule",
  apiKey: "",
};

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB

function parseOptionalNumber(value?: string): number | undefined {
  if (!value || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ProfileForm() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const addDog = useWellnessStore((state) => state.addDog);
  const setApiKey = useWellnessStore((state) => state.setApiKey);
  const storedApiKey = useWellnessStore((state) => state.apiKey);
  const isHydrated = useWellnessStore((state) => state.isHydrated);
  const hydrate = useWellnessStore((state) => state.hydrate);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const ageInputMode = watch("ageInputMode");
  const generationMode = watch("generationMode");
  const goals = watch("goals");
  const photoDataUrl = watch("photoDataUrl");

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && storedApiKey) {
      setValue("apiKey", storedApiKey);
    }
  }, [isHydrated, storedApiKey, setValue]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("이미지 파일만 업로드할 수 있어요.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("2MB 이하의 사진만 업로드할 수 있어요.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setValue("photoDataUrl", dataUrl);
    } catch {
      setPhotoError("사진을 불러오지 못했어요. 다시 시도해주세요.");
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    if (!user) {
      setSubmitError("로그인 후 다시 시도해주세요.");
      return;
    }

    const input: DogInput = {
      name: values.name.trim(),
      birthDate: values.ageInputMode === "birthDate" ? values.birthDate : undefined,
      ageYears: values.ageInputMode === "age" ? parseOptionalNumber(values.ageYears) : undefined,
      breed: values.breed.trim(),
      gender: (values.gender || undefined) as Gender | undefined,
      weightKg: parseOptionalNumber(values.weightKg),
      neutered: values.neutered,
      healthConditions: values.healthConditions?.trim() || undefined,
      activityLevel: (values.activityLevel || undefined) as ActivityLevel | undefined,
      dailyWalkMinutes: parseOptionalNumber(values.dailyWalkMinutes),
      behaviorConcerns: values.behaviorConcerns?.trim() || undefined,
      physicalConcerns: values.physicalConcerns?.trim() || undefined,
      goals: values.goals as WellnessGoal[],
    };

    if (values.generationMode === "ai" && values.apiKey?.trim()) {
      setApiKey(values.apiKey.trim());
    }

    try {
      const dog = await addDog(user.uid, input, {
        mode: values.generationMode,
        apiKey: values.apiKey?.trim(),
      });
      if (values.photoDataUrl?.trim()) {
        saveDogPhoto(dog.id, values.photoDataUrl.trim());
      }
      router.push(`/dogs/${dog.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof AIAnalysisError
          ? err.message
          : "분석 중 문제가 발생했어요. 잠시 후 다시 시도해주세요."
      );
    }
  };

  return (
    <MotionDiv {...fadeInProps}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-input bg-sand text-muted-foreground"
                aria-label="반려견 사진 선택"
              >
                {photoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoDataUrl} alt="반려견 사진 미리보기" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6" />
                )}
              </button>
              <div className="flex flex-col gap-1">
                <Label>반려견 사진 (선택)</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    사진 선택
                  </Button>
                  {photoDataUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setValue("photoDataUrl", "")}
                    >
                      제거
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                {photoError && <p className="text-xs text-destructive">{photoError}</p>}
                <p className="text-xs text-muted-foreground">
                  이 브라우저에만 저장되고 서버로 전송되지 않아요.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">이름 *</Label>
              <Input id="name" placeholder="예: 초코" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label>생년월일 또는 나이 *</Label>
              <Controller
                control={control}
                name="ageInputMode"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid grid-cols-2 gap-3"
                  >
                    <label className="flex items-center gap-2 rounded-xl border border-input bg-sand px-3 py-2.5 text-sm">
                      <RadioGroupItem value="age" id="age-mode-age" />
                      나이로 입력
                    </label>
                    <label className="flex items-center gap-2 rounded-xl border border-input bg-sand px-3 py-2.5 text-sm">
                      <RadioGroupItem value="birthDate" id="age-mode-birth" />
                      생년월일로 입력
                    </label>
                  </RadioGroup>
                )}
              />

              {ageInputMode === "age" ? (
                <div>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="예: 3"
                    aria-label="나이(년)"
                    {...register("ageYears")}
                  />
                  {errors.ageYears && (
                    <p className="mt-1 text-xs text-destructive">{errors.ageYears.message}</p>
                  )}
                </div>
              ) : (
                <div>
                  <Input type="date" aria-label="생년월일" {...register("birthDate")} />
                  {errors.birthDate && (
                    <p className="mt-1 text-xs text-destructive">{errors.birthDate.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="breed">견종 *</Label>
              <Input id="breed" placeholder="예: 말티즈" {...register("breed")} />
              {errors.breed && <p className="text-xs text-destructive">{errors.breed.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>성별</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-2 gap-2"
                    >
                      <label className="flex items-center gap-2 rounded-xl border border-input bg-sand px-3 py-2 text-sm">
                        <RadioGroupItem value="수컷" id="gender-male" />
                        수컷
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-input bg-sand px-3 py-2 text-sm">
                        <RadioGroupItem value="암컷" id="gender-female" />
                        암컷
                      </label>
                    </RadioGroup>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="weightKg">몸무게(kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="예: 5.2"
                  {...register("weightKg")}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-input bg-sand px-4 py-3">
              <Label htmlFor="neutered" className="cursor-pointer">
                중성화 완료
              </Label>
              <Controller
                control={control}
                name="neutered"
                render={({ field }) => (
                  <Switch id="neutered" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="healthConditions">현재 질환/건강 특이사항 (선택)</Label>
              <Textarea
                id="healthConditions"
                placeholder="예: 슬개골 탈구 진단을 받은 적이 있어요"
                {...register("healthConditions")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>생활 습관</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>평소 활동량</Label>
                <Controller
                  control={control}
                  name="activityLevel"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="선택해주세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="낮음">낮음</SelectItem>
                        <SelectItem value="보통">보통</SelectItem>
                        <SelectItem value="높음">높음</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dailyWalkMinutes">하루 평균 산책시간(분)</Label>
                <Input
                  id="dailyWalkMinutes"
                  type="number"
                  min={0}
                  placeholder="예: 30"
                  {...register("dailyWalkMinutes")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="behaviorConcerns">보호자가 느끼는 행동 고민 (선택)</Label>
              <Textarea
                id="behaviorConcerns"
                placeholder="예: 산책 중 다른 개를 보면 짖어요"
                {...register("behaviorConcerns")}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="physicalConcerns">신체적으로 걱정되는 부분 (선택)</Label>
              <Textarea
                id="physicalConcerns"
                placeholder="예: 뒷다리 관절이 약해 보여요"
                {...register("physicalConcerns")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>보호자가 원하는 목표 * (1개 이상)</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="goals"
              render={({ field }) => (
                <div className="grid grid-cols-3 gap-2">
                  {WELLNESS_GOALS.map((goal) => {
                    const active = field.value.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() =>
                          field.onChange(
                            active
                              ? field.value.filter((g: string) => g !== goal)
                              : [...field.value, goal]
                          )
                        }
                        className={cn(
                          "flex items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors",
                          active
                            ? "border-cocoa bg-cocoa/15 text-cocoa"
                            : "border-input bg-sand text-muted-foreground"
                        )}
                      >
                        {active && <Check className="h-3 w-3 shrink-0" />}
                        {goal}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {errors.goals && (
              <p className="mt-2 text-xs text-destructive">{errors.goals.message}</p>
            )}
            {goals.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {goals.map((goal) => (
                  <span
                    key={goal}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {goal}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() =>
                        setValue(
                          "goals",
                          goals.filter((g) => g !== goal)
                        )
                      }
                    />
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>웰니스 분석 방식</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Controller
              control={control}
              name="generationMode"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-3"
                >
                  <label className="flex flex-col gap-1 rounded-xl border border-input bg-sand px-3 py-3 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <RadioGroupItem value="rule" id="mode-rule" />
                      빠른 분석
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">규칙 기반 · 즉시 생성</span>
                  </label>
                  <label className="flex flex-col gap-1 rounded-xl border border-input bg-sand px-3 py-3 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <RadioGroupItem value="ai" id="mode-ai" />
                      <Sparkles className="h-3.5 w-3.5 text-cocoa" />
                      AI 정밀 분석
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">Gemini · 더 정교한 플랜</span>
                  </label>
                </RadioGroup>
              )}
            />

            {generationMode === "ai" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="apiKey">Gemini API 키 *</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    placeholder="AIza..."
                    autoComplete="off"
                    className="pr-10"
                    {...register("apiKey")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showApiKey ? "API 키 숨기기" : "API 키 표시"}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey.message}</p>}
                <p className="text-xs text-muted-foreground">
                  입력한 키는 서버로 전송되지 않고 이 브라우저에만 저장되며, Google Gemini API로
                  직접 요청할 때만 사용돼요.{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cocoa underline"
                  >
                    Google AI Studio에서 무료로 발급받기
                  </a>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {submitError && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{submitError}</p>
          </div>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
          {isSubmitting
            ? generationMode === "ai"
              ? "AI가 분석하고 있어요..."
              : "분석 중..."
            : "웰니스 분석 시작하기"}
        </Button>
      </form>
    </MotionDiv>
  );
}
