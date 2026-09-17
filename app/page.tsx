import { DogProfileForm } from "@/components/DogProfileForm";

export default function HomePage() {
  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-cocoa">반려견 정보 입력</h1>
        <p className="text-sm text-muted-foreground">
          정보를 입력하면 우리 아이에게 맞는 7일 운동·교육 커리큘럼을 만들어드려요.
        </p>
      </header>
      <DogProfileForm />
    </main>
  );
}
