"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { criarEvento } from "@/app/actions/criar-evento";

export default function NovoEventoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const result = await criarEvento({
        nome: String(formData.get("nome") ?? ""),
        data_evento: String(formData.get("data_evento") ?? ""),
        preco_unitario_foto: String(
          formData.get("preco_unitario_foto") ?? "",
        ),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/painel");
      router.refresh();
    } catch {
      setError("Não foi possível criar o evento. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-6 py-16 text-gray-900 sm:px-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          className="text-sm text-gray-600 transition-colors hover:text-gray-900"
          href="/painel"
        >
          Voltar ao painel
        </Link>

        <h1 className="mt-8 text-3xl font-medium tracking-tight sm:text-4xl">
          Criar Novo Evento
        </h1>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="nome"
            >
              Nome do Evento
            </label>
            <input
              className="h-12 w-full rounded-md border border-gray-300 bg-transparent px-4 text-gray-900 outline-none transition focus:border-gray-900"
              id="nome"
              name="nome"
              required
              type="text"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="data_evento"
            >
              Data do Evento
            </label>
            <input
              className="h-12 w-full rounded-md border border-gray-300 bg-transparent px-4 text-gray-900 outline-none transition focus:border-gray-900"
              id="data_evento"
              name="data_evento"
              required
              type="date"
            />
          </div>

          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="preco_unitario_foto"
            >
              Preço Unitário da Foto (R$)
            </label>
            <input
              className="h-12 w-full rounded-md border border-gray-300 bg-transparent px-4 text-gray-900 outline-none transition focus:border-gray-900"
              id="preco_unitario_foto"
              min="0.01"
              name="preco_unitario_foto"
              required
              step="0.01"
              type="number"
            />
          </div>

          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            className="inline-flex h-12 w-full items-center justify-center rounded-md bg-black px-7 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Criando evento..." : "Criar Evento"}
          </button>
        </form>
      </div>
    </main>
  );
}
