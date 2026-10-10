import { Suspense } from "react";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-6 py-12">
      <Suspense
        fallback={<div className="h-[480px] w-full max-w-md animate-pulse rounded-md bg-gray-100" />}
      >
        <SignUp fallbackRedirectUrl="/painel" />
      </Suspense>
    </main>
  );
}
