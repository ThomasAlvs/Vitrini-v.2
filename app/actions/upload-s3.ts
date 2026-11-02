"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getS3BucketName, getS3Client } from "@/lib/s3";

type ArquivoUpload = {
  nome: string;
  tipo: string;
};

type UploadUrlsResult =
  | { success: true; uploads: { url: string; key: string }[] }
  | { success: false; error: string };

type RegistroFotosResult =
  | { success: true }
  | { success: false; error: string };

export async function gerarUrlsPresignadas(
  eventoId: string,
  arquivos: ArquivoUpload[],
): Promise<UploadUrlsResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Entre na sua conta para enviar fotos." };
  }

  if (
    typeof eventoId !== "string" ||
    !eventoId.trim() ||
    !Array.isArray(arquivos) ||
    arquivos.length === 0 ||
    arquivos.some(
      (arquivo) =>
        !arquivo ||
        typeof arquivo.nome !== "string" ||
        !arquivo.nome.trim() ||
        typeof arquivo.tipo !== "string" ||
        !/^image\/[a-z0-9.+-]+$/i.test(arquivo.tipo),
    )
  ) {
    return {
      success: false,
      error: "Arquivos ou evento inválidos. Selecione imagens para enviar.",
    };
  }

  const participacao = await prisma.participacaoEvento.findFirst({
    where: { evento_id: eventoId, usuario_id: userId },
    select: { id: true },
  });

  if (!participacao) {
    return {
      success: false,
      error: "Você não tem permissão para enviar fotos a este evento.",
    };
  }

  const bucket = getS3BucketName();
  const s3 = getS3Client();
  const uploads = await Promise.all(
    arquivos.map(async ({ nome, tipo }) => {
      const baseFileName = nome.split(/[\\/]/).pop();
      if (!baseFileName) {
        throw new Error("O nome de um dos arquivos é inválido.");
      }

      const safeFileName = baseFileName
        .normalize("NFKC")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 120);
      if (!safeFileName) {
        throw new Error("O nome de um dos arquivos é inválido.");
      }

      const key = `${eventoId}/${userId}/${randomUUID()}-${safeFileName}`;
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: tipo,
      });
      const url = await getSignedUrl(s3, command, { expiresIn: 300 });

      return { url, key };
    }),
  );

  return { success: true, uploads };
}

export async function registrarFotosEnviadas(
  eventoId: string,
  objectKeys: string[],
): Promise<RegistroFotosResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Entre na sua conta para salvar as fotos." };
  }

  if (
    typeof eventoId !== "string" ||
    !eventoId.trim() ||
    !Array.isArray(objectKeys) ||
    objectKeys.length === 0
  ) {
    return { success: false, error: "Os dados das fotos são inválidos." };
  }

  const prefix = `${eventoId}/${userId}/`;
  if (
    objectKeys.some(
      (key) =>
        typeof key !== "string" ||
        !key.startsWith(prefix) ||
        key.length <= prefix.length,
    ) ||
    new Set(objectKeys).size !== objectKeys.length
  ) {
    return { success: false, error: "Os dados das fotos são inválidos." };
  }

  const participacao = await prisma.participacaoEvento.findFirst({
    where: { evento_id: eventoId, usuario_id: userId },
    select: { id: true },
  });

  if (!participacao) {
    return {
      success: false,
      error: "Você não tem permissão para adicionar fotos a este evento.",
    };
  }

  const fotos = objectKeys.map((key) => ({
    id: randomUUID(),
    evento_id: eventoId,
    fotografo_id: userId,
    url_original: key,
  }));

  await prisma.foto.createMany({ data: fotos });

  await inngest.send(
    fotos.map((foto) => ({
      name: "foto/cadastrada",
      data: { fotoId: foto.id, key: foto.url_original },
    })),
  );

  return { success: true };
}
