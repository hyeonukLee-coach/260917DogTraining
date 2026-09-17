"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Eye, EyeOff, Sparkles } from "lucide-react";

import { AICurriculumError } from "@/lib/aiCurriculumEngine";
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
import { fadeInProps, MotionDiv } from "@/components/motion";
import { useCurriculumStore, DogProfileInput } from "@/store/useCurriculumStore";
import { ActivityLevel, CurriculumType, Gender } from "@/types/curriculum";

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
    activityLevel: z.string().optional(),
    dailyWalkMinutes: z.string().optional(),
    behaviorConcerns: z.string().optional(),
    physicalConcerns: z.string().optional(),
    curriculumType: z.string().min(1, "커리큘럼 유형을 선택해주세요"),
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
    if (!["운동", "교육", "둘다"].includes(data.curriculumType)) {
      ctx.addIssue({
        code: "custom",
        path: ["curriculumType"],
        message: "커리큘럼 유형을 선택해주세요",
      });
    }
    if (data.generationMode === "ai" && !data.apiKey?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["apiKey"],
        message: "Gemini API 키를 입력해주세요",
      });
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
  activityLevel: "",
  dailyWalkMinutes: "",
  behaviorConcerns: "",
  physicalConcerns: "",
  curriculumType: "",
  generationMode: "rule",
  apiKey: "",
};

function parseOptionalNumber(value?: string): number | undefined {
  if (!value || value.trim().length === 0) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function DogProfileForm() {
  const router = useRouter();
  const submitProfile = useCurriculumStore((state) => state.submitProfile);
  const setApiKey = useCurriculumStore((state) => state.setApiKey);
  const storedApiKey = useCurriculumStore((state) => state.apiKey);
  const isHydrated = useCurriculumStore((state) => state.isHydrated);
  const hydrate = useCurriculumStore((state) => state.hydrate);

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

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

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isHydrated && storedApiKey) {
      setValue("apiKey", storedApiKey);
    }
  }, [isHydrated, storedApiKey, setValue]);

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);

    const input: DogProfileInput = {
      name: values.name.trim(),
      birthDate: values.ageInputMode === "birthDate" ? values.birthDate : undefined,
      ageYears: values.ageInputMode === "age" ? parseOptionalNumber(values.ageYears) : undefined,
      breed: values.breed.trim(),
      gender: (values.gender || undefined) as Gender | undefined,
      weightKg: parseOptionalNumber(values.weightKg),
      neutered: values.neutered,
      activityLevel: (values.activityLevel || undefined) as ActivityLevel | undefined,
      dailyWalkMinutes: parseOptionalNumber(values.dailyWalkMinutes),
      behaviorConcerns: values.behaviorConcerns?.trim() || undefined,
      physicalConcerns: values.physicalConcerns?.trim() || undefined,
      curriculumType: values.curriculumType as CurriculumType,
    };

    if (values.generationMode === "ai" && values.apiKey?.trim()) {
      setApiKey(values.apiKey.trim());
    }

    try {
      await submitProfile(input, {
        mode: values.generationMode,
        apiKey: values.apiKey?.trim(),
      });
      router.push("/result");
    } catch (err) {
      setSubmitError(
        err instanceof AICurriculumError
          ? err.message
          : "커리큘럼 생성 중 문제가 발생했어요. 잠시 후 다시 시도해주세요."
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
                  <Switch
                    id="neutered"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
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
              <Label htmlFor="behaviorConcerns">행동 고민 (선택)</Label>
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
            <CardTitle>커리큘럼 유형 *</CardTitle>
          </CardHeader>
          <CardContent>
            <Controller
              control={control}
              name="curriculumType"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-3 gap-3"
                >
                  {(["운동", "교육", "둘다"] as const).map((type) => (
                    <label
                      key={type}
                      className="flex flex-col items-center gap-2 rounded-xl border border-input bg-sand px-3 py-3 text-sm font-medium"
                    >
                      <RadioGroupItem value={type} id={`curriculum-${type}`} />
                      {type}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
            {errors.curriculumType && (
              <p className="mt-2 text-xs text-destructive">{errors.curriculumType.message}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>커리큘럼 생성 방식</CardTitle>
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
                      빠른 생성
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">규칙 기반 · 즉시 생성</span>
                  </label>
                  <label className="flex flex-col gap-1 rounded-xl border border-input bg-sand px-3 py-3 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <RadioGroupItem value="ai" id="mode-ai" />
                      <Sparkles className="h-3.5 w-3.5 text-cocoa" />
                      AI 맞춤 생성
                    </span>
                    <span className="pl-6 text-xs text-muted-foreground">Gemini · 더 정교한 커리큘럼</span>
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
                {errors.apiKey && (
                  <p className="text-xs text-destructive">{errors.apiKey.message}</p>
                )}
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
              ? "AI가 커리큘럼을 만들고 있어요..."
              : "생성 중..."
            : "7일 커리큘럼 만들기"}
        </Button>
      </form>
    </MotionDiv>
  );
}
