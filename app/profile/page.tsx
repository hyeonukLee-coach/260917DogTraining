import { ProfileForm } from "@/components/ProfileForm";

export default function ProfilePage() {
  return (
    <main className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-semibold text-cocoa">STEP 2 · 반려견 정보 입력</p>
        <h1 className="text-2xl font-bold text-cocoa">우리 강아지를 소개해주세요</h1>
        <p className="text-sm text-muted-foreground">
          입력하신 정보를 바탕으로 맞춤 웰니스 플랜을 만들어드려요.
        </p>
      </header>
      <ProfileForm />
    </main>
  );
}
