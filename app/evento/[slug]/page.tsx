import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { GaleriaPublica } from "@/components/GaleriaPublica";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/prisma";
import { getS3BucketName, getS3Client } from "@/lib/s3";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

async function VitrineConteudo({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const evento = await prisma.evento.findFirst({
    where: {
      slug,
      status: "ATIVO",
    },
    select: {
      id: true,
      nome: true,
      data_evento: true,
      preco_unitario_foto: true,
      fotos: {
        orderBy: { criado_em: "desc" },
        select: {
          id: true,
          url_marca_dagua: true,
        },
      },
    },
  });

  if (!evento) {
    return (
      <main className="flex-1 p-10 pt-20 text-center text-gray-900">
        Nenhum evento ATIVO encontrado para o link: <b>{slug}</b>. Verifique se
        a URL está correta e se você ativou o evento no painel.
      </main>
    );
  }

  const fotos = await Promise.all(
    evento.fotos.map(async (foto) => {
      if (!foto.url_marca_dagua) {
        return { id: foto.id, marcaDaguaUrl: null };
      }

      const marcaDaguaUrl = await getSignedUrl(
        getS3Client(),
        new GetObjectCommand({
          Bucket: getS3BucketName(),
          Key: foto.url_marca_dagua,
        }),
        { expiresIn: 3600 },
      );

      return { id: foto.id, marcaDaguaUrl };
    }),
  );

  return (
    <main className="flex-1 bg-[#FAFAFA] text-gray-900">
      <section className="border-b border-gray-200 px-6 py-16 text-center sm:py-24">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-gray-500">
          Galeria do evento
        </p>
        <h1 className="mx-auto mt-5 max-w-4xl text-4xl font-medium leading-tight tracking-tight sm:text-6xl">
          {evento.nome}
        </h1>
        <p className="mt-5 text-sm text-gray-500">
          {dateFormatter.format(evento.data_evento)}
        </p>
        <p className="mt-3 text-base text-gray-600">
          Fotos por apenas{" "}
          <span className="font-medium text-gray-900">
            {currencyFormatter.format(
              Number(evento.preco_unitario_foto.toFixed(2)),
            )}
          </span>
        </p>
      </section>

      <section
        aria-label="Fotos do evento"
        className="mx-auto w-full max-w-7xl px-6 py-10 pb-32 sm:px-10 sm:py-14 sm:pb-32"
      >
        {fotos.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500">
            As fotos deste evento ainda estão sendo preparadas.
          </p>
        ) : (
          <GaleriaPublica
            eventoId={evento.id}
            fotos={fotos}
            precoUnitario={Number(evento.preco_unitario_foto.toFixed(2))}
          />
        )}
      </section>
    </main>
  );
}

export default async function EventoPublicoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-gray-900">
      <Header />
      <Suspense
        fallback={
          <main className="flex flex-1 items-center justify-center px-6 text-sm text-gray-500">
            Carregando vitrine...
          </main>
        }
      >
        <VitrineConteudo params={params} />
      </Suspense>
      <Footer />
    </div>
  );
}
