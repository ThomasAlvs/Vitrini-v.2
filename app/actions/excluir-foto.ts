"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getS3BucketName, getS3Client } from "@/lib/s3";

type ExcluirFotoResult =
  | { success: true }
  | { success: false; error: string };

export async function excluirFoto(fotoId: string): Promise<ExcluirFotoResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Entre na sua conta para excluir fotos." };
  }

  if (typeof fotoId !== "string" || !fotoId.trim()) {
    return { success: false, error: "Foto inválida." };
  }

  const foto = await prisma.foto.findFirst({
    where: {
      id: fotoId,
      evento: {
        participacoes_evento: {
          some: { usuario_id: userId },
        },
      },
    },
    select: {
      id: true,
      url_original: true,
      url_marca_dagua: true,
      evento: { select: { slug: true } },
    },
  });

  if (!foto) {
    return {
      success: false,
      error: "Foto não encontrada ou você não tem permissão para excluí-la.",
    };
  }

  const bucket = getS3BucketName();
  const s3 = getS3Client();
  const objectKeys = new Set(
    [foto.url_original, foto.url_marca_dagua].filter(
      (key): key is string => Boolean(key),
    ),
  );

  await Promise.all(
    Array.from(objectKeys, (Key) =>
      s3.send(new DeleteObjectCommand({ Bucket: bucket, Key })),
    ),
  );

  await prisma.foto.delete({ where: { id: foto.id } });
  revalidatePath(`/painel/eventos/${foto.evento.slug}`);

  return { success: true };
}
