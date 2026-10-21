"use server";

import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

type CheckoutResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function checkout(
  eventoId: string,
  fotoIds: string[],
): Promise<CheckoutResult> {
  if (
    typeof eventoId !== "string" ||
    !eventoId.trim() ||
    !Array.isArray(fotoIds) ||
    fotoIds.length === 0 ||
    fotoIds.some((fotoId) => typeof fotoId !== "string" || !fotoId.trim())
  ) {
    return { success: false, error: "Selecione ao menos uma foto válida." };
  }

  const uniqueFotoIds = [...new Set(fotoIds)];
  if (uniqueFotoIds.length !== fotoIds.length) {
    return { success: false, error: "A seleção contém fotos duplicadas." };
  }

  const evento = await prisma.evento.findFirst({
    where: { id: eventoId, status: "ATIVO" },
    select: {
      id: true,
      slug: true,
      nome: true,
      preco_unitario_foto: true,
    },
  });

  if (!evento) {
    return { success: false, error: "Este evento não está disponível." };
  }

  const fotos = await prisma.foto.findMany({
    where: {
      id: { in: uniqueFotoIds },
      evento_id: evento.id,
    },
    select: { id: true },
  });

  if (fotos.length !== uniqueFotoIds.length) {
    return {
      success: false,
      error: "Uma ou mais fotos não pertencem a este evento.",
    };
  }

  const unitAmount = Math.round(
    Number(evento.preco_unitario_foto) * 100,
  );

  if (!Number.isSafeInteger(unitAmount) || unitAmount <= 0) {
    return { success: false, error: "O preço do evento é inválido." };
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("A variável de ambiente STRIPE_SECRET_KEY não está configurada.");
  }

  const baseUrl = "https://vitrini-v-2-nsil.vercel.app";
  const stripe = new Stripe(secretKey);
  const eventoSlug = encodeURIComponent(evento.slug);

  const valorTotal = evento.preco_unitario_foto.mul(uniqueFotoIds.length);
  const pedido = await prisma.$transaction(async (transaction) => {
    const novoPedido = await transaction.pedido.create({
      data: {
        evento_id: evento.id,
        valor_total: valorTotal,
        itens: {
          create: uniqueFotoIds.map((fotoId) => ({
            foto_id: fotoId,
          })),
        },
      },
      select: { id: true },
    });

    return novoPedido;
  });

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Pacote de Fotos - ${evento.nome}`,
            },
            unit_amount: unitAmount,
          },
          quantity: uniqueFotoIds.length,
        },
      ],
      metadata: { pedidoId: pedido.id },
      success_url: `${baseUrl}/evento/${eventoSlug}/sucesso`,
      cancel_url: `${baseUrl}/evento/${eventoSlug}`,
    });
  } catch (error) {
    console.error("Stripe Checkout session creation failed.", error);
    throw new Error("Não foi possível iniciar o checkout com o Stripe.", {
      cause: error,
    });
  }

  if (!session.url) {
    throw new Error("O Stripe não retornou uma URL de checkout.");
  }

  await prisma.pedido.update({
    where: { id: pedido.id },
    data: { session_id_stripe: session.id },
  });

  return { success: true, url: session.url };
}
