import Stripe from "stripe";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!signature) {
    return Response.json(
      { error: "Header stripe-signature ausente." },
      { status: 400 },
    );
  }

  if (!webhookSecret || !stripeSecretKey) {
    console.error("Stripe webhook secrets are not configured.");
    return Response.json(
      { error: "Webhook não configurado." },
      { status: 500 },
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("Invalid Stripe webhook signature.", error);
    return Response.json(
      { error: "Assinatura inválida." },
      { status: 400 },
    );
  }

  if (
    stripeEvent.type !== "checkout.session.completed" &&
    stripeEvent.type !== "checkout.session.async_payment_succeeded"
  ) {
    return Response.json({ received: true }, { status: 200 });
  }

  const session = stripeEvent.data.object;
  if (
    stripeEvent.type === "checkout.session.completed" &&
    session.payment_status !== "paid"
  ) {
    // Delayed payment methods, such as Pix, are confirmed in a later event.
    return Response.json({ received: true }, { status: 200 });
  }

  const pedidoId = session.metadata?.pedidoId;
  if (!pedidoId) {
    return Response.json(
      { error: "Metadata pedidoId ausente na sessão." },
      { status: 400 },
    );
  }

  const emailCliente = session.customer_details?.email ?? null;

  try {
    const pedidoAtualizado = await prisma.pedido.updateMany({
      where: {
        id: pedidoId,
        session_id_stripe: session.id,
      },
      data: {
        status: "PAGO",
        email_cliente: emailCliente,
      },
    });

    if (pedidoAtualizado.count !== 1) {
      console.error("Stripe session does not match a stored order.", {
        pedidoId,
        sessionId: session.id,
      });
      return Response.json(
        { error: "Pedido não encontrado para esta sessão." },
        { status: 500 },
      );
    }

    await inngest.send({
      id: `stripe-${stripeEvent.id}`,
      name: "pedido/pago",
      data: { pedidoId, emailCliente },
    });

    return Response.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to process Stripe payment webhook.", error);
    return Response.json(
      { error: "Falha ao processar confirmação de pagamento." },
      { status: 500 },
    );
  }
}
