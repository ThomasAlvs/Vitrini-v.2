"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { excluirFoto } from "@/app/actions/excluir-foto";

export type FotoGaleria = {
  id: string;
  url_original: string | null;
  url_marca_dagua: string | null;
  previewUrl: string | null;
  fullUrl: string | null;
  criado_em: Date;
};

type GaleriaGerenciamentoProps = {
  fotos: FotoGaleria[];
};

export function GaleriaGerenciamento({
  fotos,
}: GaleriaGerenciamentoProps) {
  const router = useRouter();
  const [fotoSelecionadaId, setFotoSelecionadaId] = useState<string | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fotoSelecionada = fotos.find(
    (foto) => foto.id === fotoSelecionadaId,
  );

  async function handleDelete() {
    if (!fotoSelecionada || isDeleting) {
      return;
    }

    if (!window.confirm("Tem certeza que deseja excluir esta foto?")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const result = await excluirFoto(fotoSelecionada.id);
      if (!result.success) {
        setError(result.error);
        return;
      }

      setFotoSelecionadaId(null);
      router.refresh();
    } catch {
      setError("Não foi possível excluir a foto. Tente novamente.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (fotos.length === 0) {
    return (
      <div className="mt-5 flex min-h-64 items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 px-6 text-center">
        <p className="text-sm text-gray-500">
          Nenhuma foto enviada para este evento.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {fotos.map((foto) => (
          <li
            className="overflow-hidden rounded-md border border-gray-200 bg-white"
            key={foto.id}
          >
            <button
              aria-label="Visualizar foto"
              className="block w-full cursor-zoom-in"
              onClick={() => {
                setError(null);
                setFotoSelecionadaId(foto.id);
              }}
              type="button"
            >
              {foto.previewUrl ? (
                <img
                  alt="Foto do evento"
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                  src={foto.previewUrl}
                />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-gray-50 text-xs text-gray-500">
                  Imagem indisponível
                </div>
              )}
            </button>
            <p className="px-3 py-2 text-xs text-gray-500">
              {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
                foto.criado_em,
              )}
            </p>
          </li>
        ))}
      </ul>

      {fotoSelecionada && (
        <div
          aria-label="Visualizador de foto"
          aria-modal="true"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 sm:p-8"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              setFotoSelecionadaId(null);
            }
          }}
          role="dialog"
        >
          <button
            aria-label="Fechar visualizador"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-md text-3xl leading-none text-white transition-colors hover:bg-white/10 disabled:opacity-50 sm:right-6 sm:top-6"
            disabled={isDeleting}
            onClick={() => setFotoSelecionadaId(null)}
            type="button"
          >
            ×
          </button>

          {fotoSelecionada.fullUrl ? (
            <img
              alt="Foto ampliada"
              className="max-h-[calc(100vh-10rem)] max-w-full object-contain"
              src={fotoSelecionada.fullUrl}
            />
          ) : (
            <p className="text-sm text-white/70">
              A imagem original não está disponível.
            </p>
          )}

          <div className="absolute inset-x-4 bottom-4 flex flex-col items-center gap-3 sm:bottom-6">
            {error && (
              <p className="max-w-md text-center text-sm text-white" role="alert">
                {error}
              </p>
            )}
            <button
              className="inline-flex h-11 items-center justify-center rounded-md border border-red-300/60 px-5 text-sm font-medium text-red-200 transition-colors hover:border-red-200 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isDeleting}
              onClick={handleDelete}
              type="button"
            >
              {isDeleting ? "Excluindo..." : "Excluir Foto"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
