"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { alterarStatusEvento } from "@/app/actions/alterar-status-evento";
import { StatusEvento } from "@/app/generated/prisma/enums";

type BotaoStatusEventoProps = {
  eventoId: string;
  status: StatusEvento;
};

export function BotaoStatusEvento({
  eventoId,
  status,
}: BotaoStatusEventoProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const ativar = status === StatusEvento.RASCUNHO;

  function handleClick() {
    setError(null);
    const novoStatus = ativar
      ? StatusEvento.ATIVO
      : StatusEvento.RASCUNHO;

    startTransition(async () => {
      const result = await alterarStatusEvento(eventoId, novoStatus);
      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        className={
          ativar
            ? "inline-flex h-11 items-center justify-center rounded-md bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
            : "inline-flex h-11 items-center justify-center rounded-md border border-gray-300 bg-transparent px-6 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        }
        disabled={isPending}
        onClick={handleClick}
        type="button"
      >
        {isPending
          ? "Atualizando..."
          : ativar
            ? "Ativar evento"
            : "Voltar para rascunho"}
      </button>
      {error && (
        <p className="text-sm text-gray-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
