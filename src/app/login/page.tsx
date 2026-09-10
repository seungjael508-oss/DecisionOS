import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-semibold">로그인</h1>
      <p className="mt-2 text-neutral-600">입주촉진 현장에 접속합니다.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
