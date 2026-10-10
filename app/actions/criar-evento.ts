"use server";

import { currentUser, auth } from "@clerk/nextjs/server";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type CriarEventoInput = {
  nome: string;
  data_evento: string;
  preco_unitario_foto: string;
};

type CriarEventoResult =
  | { success: true; eventoId: string }
  | { success: false; error: string };

export async function criarEvento(
  input: CriarEventoInput,
): Promise<CriarEventoResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Você precisa entrar para criar um evento." };
  }

  if (
    typeof input?.nome !== "string" ||
    typeof input?.data_evento !== "string" ||
    typeof input?.preco_unitario_foto !== "string"
  ) {
    return { success: false, error: "Preencha os dados do evento corretamente." };
  }

  const nome = input.nome.trim();
  const slug = nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!nome || !slug) {
    return { success: false, error: "Informe um nome válido para o evento." };
  }

  const dataEvento = new Date(input.data_evento);
  if (!input.data_evento || Number.isNaN(dataEvento.getTime())) {
    return { success: false, error: "Informe uma data válida para o evento." };
  }

  const precoInput = input.preco_unitario_foto.trim();
  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(precoInput)) {
    return { success: false, error: "Informe um preço válido." };
  }

  const preco = new Prisma.Decimal(precoInput);
  if (!preco.isFinite() || !preco.greaterThan(0)) {
    return { success: false, error: "O preço deve ser maior que zero." };
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress;
  if (!clerkUser || !email) {
    return {
      success: false,
      error: "Não foi possível obter o e-mail da sua conta Clerk.",
    };
  }

  const nomeUsuario =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email;

  try {
    const evento = await prisma.$transaction(async (transaction) => {
      await transaction.usuario.upsert({
        where: { id: userId },
        create: { id: userId, email, nome: nomeUsuario },
        update: { email, nome: nomeUsuario },
      });

      return transaction.evento.create({
        data: {
          nome,
          slug,
          data_evento: dataEvento,
          preco_unitario_foto: preco,
          participacoes_evento: {
            create: {
              usuario: { connect: { id: userId } },
              papel: "ADMIN",
              comissao_percentual: new Prisma.Decimal(100),
            },
          },
        },
        select: { id: true },
      });
    });

    return { success: true, eventoId: evento.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "Já existe um evento com esse nome. Escolha outro nome.",
      };
    }

    throw error;
  }
}
