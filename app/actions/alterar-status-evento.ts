"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { StatusEvento } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type AlterarStatusResult =
  | { success: true }
  | { success: false; error: string };

export async function alterarStatusEvento(
  eventoId: string,
  novoStatus: StatusEvento,
): Promise<AlterarStatusResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: "Entre na sua conta para alterar o evento." };
  }

  if (
    typeof eventoId !== "string" ||
    !eventoId.trim() ||
    (novoStatus !== StatusEvento.ATIVO &&
      novoStatus !== StatusEvento.RASCUNHO)
  ) {
    return { success: false, error: "Os dados enviados são inválidos." };
  }

  const evento = await prisma.$transaction(async (transaction) => {
    const participacao = await transaction.participacaoEvento.findFirst({
      where: {
        evento_id: eventoId,
        usuario_id: userId,
        papel: "ADMIN",
      },
      select: { evento: { select: { slug: true } } },
    });

    if (!participacao) {
      return null;
    }

    await transaction.evento.update({
      where: { id: eventoId },
      data: { status: novoStatus },
    });

    return participacao.evento;
  });

  if (!evento) {
    return {
      success: false,
      error: "Você não tem permissão para alterar este evento.",
    };
  }

  revalidatePath("/painel");
  revalidatePath(`/painel/eventos/${evento.slug}`);

  return { success: true };
}
