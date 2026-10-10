import { GetObjectCommand } from "@aws-sdk/client-s3";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { BotaoStatusEvento } from "@/components/BotaoStatusEvento";
import { GaleriaGerenciamento } from "@/components/GaleriaGerenciamento";
import { UploadFotos } from "@/components/UploadFotos";
import { prisma } from "@/lib/prisma";
import { getS3BucketName, getS3Client } from "@/lib/s3";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "UTC",
});

type EventoPageProps = {
  params: Promise<{ slug: string }>;
};

async function EventoConteudo({ params }: EventoPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const { slug } = await params;
  const evento = await prisma.evento.findFirst({
    where: {
      slug,
      participacoes_evento: {
        some: { usuario_id: userId },
      },
    },
    include: {
      participacoes_evento: {
        where: { usuario_id: userId },
        include: { usuario: true },
      },
      fotos: {
        orderBy: { criado_em: "desc" },
        select: {
          id: true,
          url_original: true,
          url_marca_dagua: true,
          criado_em: true,
        },
      },
    },
  });

  if (!evento) {
    notFound();
  }

  const participacao = evento.participacoes_evento[0];
  if (!participacao) {
    notFound();
  }

  const fotos = await Promise.all(
    evento.fotos.map(async (foto) => {
      const displayKey = foto.url_marca_dagua ?? foto.url_original;
      if (!displayKey) {
        return { ...foto, previewUrl: null, fullUrl: null };
      }

      const displayUrl = await getSignedUrl(
        getS3Client(),
        new GetObjectCommand({
          Bucket: getS3BucketName(),
          Key: displayKey,
        }),
        { expiresIn: 3600 },
      );

      return {
        ...foto,
        previewUrl: displayUrl,
        fullUrl: displayUrl,
      };
    }),
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-gray-900">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-6 sm:px-10">
          <Link
            className="text-xl font-semibold tracking-[0.18em]"
            href="/painel"
          >
            Vitrini
          </Link>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-12 sm:px-10 sm:py-16">
        <Link
          className="text-sm text-gray-500 transition-colors hover:text-gray-900"
          href="/painel"
        >
          ← Meus Eventos
        </Link>

        <div className="mt-8 flex flex-col gap-6 border-b border-gray-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
              {evento.nome}
            </h1>
            <p className="mt-3 text-sm text-gray-500">
              {dateFormatter.format(evento.data_evento)}
              <span className="mx-2 text-gray-300">·</span>
              {currencyFormatter.format(
                Number(evento.preco_unitario_foto.toFixed(2)),
              )}{" "}
              por foto
            </p>
          </div>
          <BotaoStatusEvento eventoId={evento.id} status={evento.status} />
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <section aria-labelledby="fotos-heading">
            <h2
              className="text-xl font-medium tracking-tight"
              id="fotos-heading"
            >
              Fotos
            </h2>
            <UploadFotos eventoId={evento.id} />
            <GaleriaGerenciamento fotos={fotos} />
          </section>

          <section aria-labelledby="fotografos-heading">
            <h2
              className="text-xl font-medium tracking-tight"
              id="fotografos-heading"
            >
              Fotógrafos
            </h2>
            <ul className="mt-5 divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
              <li className="flex items-center justify-between gap-4 px-4 py-4">
                <span className="truncate text-sm font-medium text-gray-900">
                  {participacao.usuario.nome}
                </span>
                <span className="rounded-sm bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {participacao.papel}
                </span>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function EventoPage({ params }: EventoPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#FAFAFA] px-6 py-16 text-sm text-gray-500 sm:px-10">
          Carregando evento...
        </main>
      }
    >
      <EventoConteudo params={params} />
    </Suspense>
  );
}
