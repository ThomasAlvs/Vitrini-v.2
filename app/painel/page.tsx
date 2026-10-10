import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
});

async function EventosUsuario() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const participacoes = await prisma.participacaoEvento.findMany({
    where: { usuario_id: userId },
    include: { evento: true },
    orderBy: { evento: { data_evento: "desc" } },
  });

  if (participacoes.length === 0) {
    return (
      <p className="mt-12 text-sm text-gray-500">
        Você ainda não possui nenhum evento criado.
      </p>
    );
  }

  return (
    <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {participacoes.map(({ evento, papel }) => (
        <li
          className="flex flex-col rounded-md border border-gray-200 bg-white p-6 shadow-sm"
          key={evento.id}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-lg font-medium text-gray-900">{evento.nome}</h2>
            <span className="rounded-sm bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {papel}
            </span>
          </div>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Data</dt>
              <dd className="text-right text-gray-900">
                {dateFormatter.format(evento.data_evento)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Preço por foto</dt>
              <dd className="text-right text-gray-900">
                {currencyFormatter.format(
                  Number(evento.preco_unitario_foto.toFixed(2)),
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Status</dt>
              <dd>
                <span className="rounded-sm border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {evento.status}
                </span>
              </dd>
            </div>
          </dl>

          <Link
            className="mt-6 border-t border-gray-100 pt-4 text-sm font-medium text-gray-900 transition-colors hover:text-gray-600"
            href={`/painel/eventos/${evento.slug}`}
          >
            Gerenciar
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function PainelPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-gray-900">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-10">
          <span className="text-xl font-semibold tracking-[0.18em]">
            Vitrini
          </span>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Meus Eventos
          </h1>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            href="/painel/eventos/novo"
          >
            Novo Evento
          </Link>
        </div>

        <Suspense
          fallback={
            <p className="mt-12 text-sm text-gray-500">
              Carregando seus eventos...
            </p>
          }
        >
          <EventosUsuario />
        </Suspense>
      </main>
    </div>
  );
}
