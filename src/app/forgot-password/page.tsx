import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default async function ForgotPasswordPage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-semibold">비밀번호 재설정</h1>
      <p className="mt-2 text-neutral-600">DecisionOS에 등록한 이메일로 재설정 링크를 보내드립니다.</p>
      {error === "expired" ? <p role="alert" className="mt-4 text-red-800">링크가 만료됐거나 확인할 수 없습니다. 이 브라우저에서 새 메일을 요청해 주세요.</p> : null}
      <ForgotPasswordForm />
    </main>
  );
}
