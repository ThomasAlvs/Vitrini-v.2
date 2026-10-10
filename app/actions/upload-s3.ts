"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "node:crypto";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getS3BucketName, getS3Client } from "@/lib/s3";

type UploadResult =
  | { success: true; url: string; key: string }
  | { success: false; error: string };

type SavePhotoResult =
  | { success: true }
  | { success: false; error: string };

export async function gerarUrlPresignada(
  eventoId: string,
  fileName: string,
  fileType: string,
): Promise<UploadResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Entre na sua conta para enviar fotos." };
  }

  if (
    typeof eventoId !== "string" ||
    !eventoId.trim() ||
    typeof fileName !== "string" ||
    !fileName.trim() ||
    typeof fileType !== "string" ||
    !/^image\/[a-z0-9.+-]+$/i.test(fileType)
  ) {
    return {
      success: false,
      error: "Arquivo ou evento inválido. Selecione uma imagem.",
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

  const safeFileName = fileName
    .split(/[\\/]/)
    .pop()!
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  if (!safeFileName) {
    return { success: false, error: "O nome do arquivo é inválido." };
  }

  const key = `${eventoId}/${userId}/${randomUUID()}-${safeFileName}`;
  const command = new PutObjectCommand({
    Bucket: getS3BucketName(),
    Key: key,
    ContentType: fileType,
  });
  const url = await getSignedUrl(getS3Client(), command, { expiresIn: 300 });

  return { success: true, url, key };
}

export async function salvarFotoBanco(
  eventoId: string,
  objectKey: string,
): Promise<SavePhotoResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Entre na sua conta para salvar a foto." };
  }

  if (
    typeof eventoId !== "string" ||
    !eventoId.trim() ||
    typeof objectKey !== "string" ||
    !objectKey.startsWith(`${eventoId}/${userId}/`)
  ) {
    return { success: false, error: "Os dados da foto são inválidos." };
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

  const novaFoto = await prisma.foto.create({
    data: {
      evento: { connect: { id: eventoId } },
      fotografo: { connect: { id: userId } },
      url_original: objectKey,
    },
    select: { id: true },
  });

  await inngest.send({
    name: "foto/cadastrada",
    data: { fotoId: novaFoto.id, key: objectKey },
  });

  return { success: true };
}
