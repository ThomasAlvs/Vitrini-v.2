"use client";

import { useState } from "react";
import { checkout } from "@/app/actions/checkout";

type FotoPublica = {
  id: string;
  marcaDaguaUrl: string | null;
};

type GaleriaPublicaProps = {
  eventoId: string;
  fotos: FotoPublica[];
  precoUnitario: number;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function GaleriaPublica({
  eventoId,
  fotos,
  precoUnitario,
}: GaleriaPublicaProps) {
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valorTotal = selecionados.length * precoUnitario;

  function toggleFoto(fotoId: string) {
    setError(null);
    setSelecionados((current) =>
      current.includes(fotoId)
        ? current.filter((id) => id !== fotoId)
        : [...current, fotoId],
    );
  }

  async function handleCheckout() {
    if (selecionados.length === 0 || isCheckingOut) {
      return;
    }

    setIsCheckingOut(true);
    setError(null);

    try {
      const result = await checkout(eventoId, selecionados);
      if (!result.success) {
        setError(result.error);
        return;
      }

      window.location.href = result.url;
    } catch {
      setError("Não foi possível iniciar o pagamento. Tente novamente.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {fotos.map((foto) => {
          const selecionada = selecionados.includes(foto.id);

          return (
            <li className="overflow-hidden rounded-md" key={foto.id}>
              {foto.marcaDaguaUrl ? (
                <button
                  aria-pressed={selecionada}
                  className={`group relative block w-full overflow-hidden rounded-md border-2 bg-white text-left transition ${
                    selecionada
                      ? "border-gray-900"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                  onClick={() => toggleFoto(foto.id)}
                  type="button"
                >
                  <img
                    alt="Foto do evento com marca d’água Vitrini"
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                    src={foto.marcaDaguaUrl}
                  />
                  {selecionada && (
                    <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-sm text-white">
                      ✓
                    </span>
                  )}
                </button>
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-md border border-gray-200 bg-gray-100 px-6 text-center">
                  <p className="text-sm text-gray-500">
                    Processando imagem...
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {selecionados.length > 0 && (
        <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur sm:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selecionados.length}{" "}
                {selecionados.length === 1 ? "foto selecionada" : "fotos selecionadas"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Total: {currencyFormatter.format(valorTotal)}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {error && (
                <p className="text-sm text-gray-600" role="alert">
                  {error}
                </p>
              )}
              <button
                className="inline-flex h-11 w-full items-center justify-center rounded-md bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                disabled={isCheckingOut}
                onClick={handleCheckout}
                type="button"
              >
                {isCheckingOut ? "Preparando pagamento..." : "Comprar Fotos"}
              </button>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
