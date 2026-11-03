import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import exifr from "exifr";
import { randomBytes } from "node:crypto";
import { Resend } from "resend";
import sharp from "sharp";
import { inngest } from "@/lib/inngest/client";
import { prisma } from "@/lib/prisma";
import { getS3BucketName, getS3Client } from "@/lib/s3";

type FotoCadastradaPayload = {
  fotoId: string;
  key: string;
};

type PedidoPagoPayload = {
  pedidoId: string;
  emailCliente: string | null;
};

function escaparHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function criarSvgProtecaoPreview(width: number, height: number) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="watermark" width="440" height="250" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
          <text x="12" y="145" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="800" letter-spacing="3" fill="white" fill-opacity="0.6" stroke="#111827" stroke-opacity="0.32" stroke-width="1.5" paint-order="stroke">VITRINI ART</text>
        </pattern>
      </defs>
      <circle cx="${width * 0.12}" cy="${height * 0.18}" r="${Math.min(width, height) * 0.2}" fill="#7c3aed" fill-opacity="0.36" />
      <path d="M ${width * 0.62} ${height * 0.02} C ${width * 0.92} ${height * 0.08}, ${width * 0.82} ${height * 0.3}, ${width * 1.02} ${height * 0.36} L ${width * 0.92} ${height * 0.58} C ${width * 0.72} ${height * 0.46}, ${width * 0.58} ${height * 0.22}, ${width * 0.62} ${height * 0.02} Z" fill="#dc2626" fill-opacity="0.34" />
      <ellipse cx="${width * 0.46}" cy="${height * 0.9}" rx="${width * 0.25}" ry="${height * 0.14}" transform="rotate(-18 ${width * 0.46} ${height * 0.9})" fill="#374151" fill-opacity="0.32" />
      <rect width="${width}" height="${height}" fill="url(#watermark)" />
    </svg>
  `);
}

function criarRuidoPreview(width: number, height: number) {
  const pixelCount = width * height;
  const randomValues = randomBytes(pixelCount * 2);
  const noise = Buffer.alloc(pixelCount * 4);

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const value = randomValues[pixel * 2] >= 128 ? 255 : 0;
    const offset = pixel * 4;
    noise[offset] = value;
    noise[offset + 1] = value;
    noise[offset + 2] = value;
    noise[offset + 3] = 10 + (randomValues[pixel * 2 + 1] % 15);
  }

  return noise;
}

export const processarFoto = inngest.createFunction(
  { id: "processar-foto", triggers: { event: "foto/cadastrada" } },
  async ({ event, step }) => {
    const { fotoId, key } = event.data as FotoCadastradaPayload;
    if (!fotoId || !key) {
      throw new Error("Evento foto/cadastrada sem fotoId ou chave S3.");
    }

    return step.run("processar-original-e-gerar-marca-dagua", async () => {
      const bucket = getS3BucketName();
      const s3 = getS3Client();
      const foto = await prisma.foto.findUnique({
        where: { id: fotoId },
        select: { url_original: true },
      });
      if (!foto || foto.url_original !== key) {
        throw new Error(
          `A foto ${fotoId} não existe ou não corresponde à chave S3 informada.`,
        );
      }

      const object = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );

      if (!object.Body) {
        throw new Error(`O objeto original ${key} não possui conteúdo.`);
      }

      const buffer = Buffer.from(await object.Body.transformToByteArray());

      let horarioExif: Date | null = null;
      try {
        const metadata = await exifr.parse(buffer, {
          pick: ["DateTimeOriginal"],
        });
        const dateTimeOriginal: unknown = metadata?.DateTimeOriginal;
        if (dateTimeOriginal instanceof Date && !Number.isNaN(dateTimeOriginal.getTime())) {
          horarioExif = dateTimeOriginal;
        } else if (typeof dateTimeOriginal === "string") {
          const parsedDate = new Date(dateTimeOriginal);
          if (!Number.isNaN(parsedDate.getTime())) {
            horarioExif = parsedDate;
          }
        }
      } catch {
        // Imagens sem EXIF continuam pelo processamento da marca d'água.
      }

      const resized = await sharp(buffer)
        .rotate()
        .resize({
          width: 800,
          height: 800,
          fit: "inside",
          withoutEnlargement: true,
        })
        .toBuffer({ resolveWithObject: true });

      const noiseBuffer = await sharp(criarRuidoPreview(
        resized.info.width,
        resized.info.height,
      ), {
        raw: {
          width: resized.info.width,
          height: resized.info.height,
          channels: 4,
        },
      })
        .png()
        .toBuffer();

      const watermarkedBuffer = await sharp(resized.data)
        .composite([
          {
            input: noiseBuffer,
            blend: "soft-light",
          },
          {
            input: criarSvgProtecaoPreview(
              resized.info.width,
              resized.info.height,
            ),
          },
        ])
        .webp({ quality: 60 })
        .toBuffer();

      const watermarkedKey = `watermarks/${fotoId}.webp`;
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: watermarkedKey,
          Body: watermarkedBuffer,
          ContentType: "image/webp",
        }),
      );

      await prisma.foto.update({
        where: { id: fotoId },
        data: {
          horario_exif: horarioExif,
          url_marca_dagua: watermarkedKey,
        },
      });

      return { fotoId, watermarkedKey, horarioExif: horarioExif?.toISOString() ?? null };
    });
  },
);

export const enviarFotosCompradas = inngest.createFunction(
  { id: "enviar-fotos-compradas", triggers: { event: "pedido/pago" } },
  async ({ event, step }) => {
    const { pedidoId, emailCliente } = event.data as PedidoPagoPayload;
    if (!pedidoId) {
      throw new Error("Evento pedido/pago sem pedidoId.");
    }
    if (!emailCliente?.trim()) {
      throw new Error(`O pedido ${pedidoId} não possui um e-mail de cliente válido.`);
    }

    const pedido = await step.run("buscar-pedido-e-fotos", async () => {
      const result = await prisma.pedido.findUnique({
        where: { id: pedidoId },
        include: {
          evento: { select: { nome: true } },
          itens: {
            include: {
              foto: { select: { id: true, url_original: true } },
            },
          },
        },
      });

      if (!result) {
        throw new Error(`Pedido ${pedidoId} não encontrado para fulfillment.`);
      }
      if (result.status !== "PAGO") {
        throw new Error(`O pedido ${pedidoId} ainda não está pago.`);
      }

      return {
        nomeEvento: result.evento.nome,
        fotos: result.itens.map(({ foto }) => ({
          id: foto.id,
          chaveOriginal: foto.url_original,
        })),
      };
    });

    const fotosComLinks = await step.run(
      "gerar-links-temporarios-de-download",
      async () => {
        const bucket = getS3BucketName();
        const s3 = getS3Client();

        return Promise.all(
          pedido.fotos.map(async (foto, index) => {
            if (!foto.chaveOriginal) {
              throw new Error(
                `A foto ${foto.id} do pedido ${pedidoId} não possui chave S3 original.`,
              );
            }

            try {
              const url = await getSignedUrl(
                s3,
                new GetObjectCommand({
                  Bucket: bucket,
                  Key: foto.chaveOriginal,
                }),
                { expiresIn: 604800 },
              );
              return { numero: index + 1, url };
            } catch (error) {
              console.error(
                `Falha ao gerar link de download para a foto ${foto.id}.`,
                error,
              );
              throw new Error(
                `Não foi possível gerar o link de download da foto ${foto.id}.`,
                { cause: error },
              );
            }
          }),
        );
      },
    );

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("A variável de ambiente RESEND_API_KEY não está configurada.");
    }

    const resend = new Resend(apiKey);
    const linksHtml = fotosComLinks
      .map(
        ({ numero, url }) =>
          `<li style="margin: 0 0 12px;"><a href="${escaparHtml(url)}" style="display: inline-block; padding: 12px 18px; background: #111827; color: #ffffff; text-decoration: none; border-radius: 6px;">Download da Foto ${numero}</a></li>`,
      )
      .join("");
    const nomeEventoHtml = escaparHtml(pedido.nomeEvento);

    const email = await step.run("enviar-email-com-links-de-download", async () => {
      const { data, error } = await resend.emails.send({
        from: "Vitrini Art <pedidos@vitriniart.com.br>",
        to: emailCliente,
        subject: `Suas fotos de ${pedido.nomeEvento} estão prontas`,
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 32px; color: #111827; font-family: Arial, Helvetica, sans-serif;">
            <h1 style="font-size: 24px; font-weight: 600;">Obrigado pela sua compra!</h1>
            <p>As fotos do evento <strong>${nomeEventoHtml}</strong> estão prontas para download.</p>
            <ul style="list-style: none; padding: 0; margin: 24px 0;">${linksHtml}</ul>
            <p style="color: #6b7280; font-size: 14px;">Os links ficam disponíveis por 7 dias.</p>
          </div>
        `,
      });

      if (error) {
        console.error(`Falha no envio do e-mail do pedido ${pedidoId}.`, error);
        throw new Error(`Não foi possível enviar o e-mail do pedido ${pedidoId}.`);
      }
      return { id: data?.id ?? null };
    });

    return {
      pedidoId,
      emailId: email.id,
      fotosEnviadas: fotosComLinks.length,
    };
  },
);
