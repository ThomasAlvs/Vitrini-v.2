import Link from "next/link";
import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

async function ListaEventos() {
  const eventos = await prisma.evento.findMany({
    where: { status: "ATIVO" },
    orderBy: { criado_em: "desc" },
    select: {
      nome: true,
      slug: true,
      data_evento: true,
    },
  });

  if (eventos.length === 0) {
    return (
      <p className="rounded-lg border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-600">
        Ainda não há eventos disponíveis. Volte em breve para conferir novas
        fotos!
      </p>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {eventos.map((evento) => (
        <li
          key={evento.slug}
          className="flex flex-col rounded-lg border border-gray-200 bg-white p-6"
        >
          <h3 className="text-lg font-medium">{evento.nome}</h3>
          {evento.data_evento && (
            <p className="mt-2 text-sm text-gray-500">
              {dateFormatter.format(evento.data_evento)}
            </p>
          )}
          <Link
            className="mt-6 inline-flex h-11 items-center justify-center self-start rounded-md bg-black px-5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            href={`/evento/${evento.slug}`}
          >
            Ver Fotos
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-gray-900">
      <Header />

      <main className="flex-1">
        <section className="px-6 py-20 text-center sm:py-28">
          <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
            <p className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-gray-500">
              Fotografia esportiva
            </p>
            <h1 className="max-w-2xl text-4xl font-medium leading-tight tracking-tight sm:text-6xl">
              Cada momento merece ser lembrado.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
              Encontre e reviva os melhores registros da sua jornada esportiva.
            </p>
          </div>
        </section>

        <section
          aria-labelledby="eventos-title"
          className="mx-auto w-full max-w-7xl px-6 pb-20 sm:px-10"
        >
          <h2
            id="eventos-title"
            className="mb-8 text-2xl font-medium tracking-tight"
          >
            Eventos disponíveis
          </h2>
          <Suspense
            fallback={
              <p className="py-12 text-center text-sm text-gray-500">
                Carregando eventos...
              </p>
            }
          >
            <ListaEventos />
          </Suspense>
        </section>
      </main>

      <Footer />
    </div>
  );
}
