import Link from "next/link";
import { Suspense } from "react";

async function SucessoConteudo({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="flex min-h-screen flex-col bg-[#FAFAFA] text-gray-900">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center px-6 sm:px-10">
          <Link className="text-xl font-semibold tracking-[0.18em]" href="/">
            Vitrini
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gray-500">
          Pedido recebido
        </p>
        <h1 className="mt-5 text-3xl font-medium tracking-tight sm:text-4xl">
          Estamos processando seu pagamento.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-gray-600">
          Assim que a confirmação for concluída, enviaremos as fotos originais
          para o e-mail informado no momento da compra.
        </p>
        <Link
          className="mt-9 inline-flex h-11 items-center justify-center rounded-md bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          href={`/evento/${encodeURIComponent(slug)}`}
        >
          Voltar para o evento
        </Link>
      </section>
    </main>
  );
}

export default function SucessoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#FAFAFA] px-6 text-sm text-gray-500">
          Carregando confirmação...
        </main>
      }
    >
      <SucessoConteudo params={params} />
    </Suspense>
  );
}
