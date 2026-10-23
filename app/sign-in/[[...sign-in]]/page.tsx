import { Suspense } from "react";
import { SignIn } from "@clerk/nextjs";

async function SignInWidget({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const isFotografo = tipo === "fotografo";

  return isFotografo ? (
    <SignIn forceRedirectUrl="/painel" />
  ) : (
    <SignIn fallbackRedirectUrl="/" />
  );
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-6 py-12">
      <Suspense
        fallback={<div className="h-[480px] w-full max-w-md animate-pulse rounded-md bg-gray-100" />}
      >
        <SignInWidget searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
