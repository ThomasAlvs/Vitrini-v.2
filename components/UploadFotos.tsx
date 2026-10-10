"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  gerarUrlPresignada,
  salvarFotoBanco,
} from "@/app/actions/upload-s3";

type UploadFotosProps = {
  eventoId: string;
};

export function UploadFotos({ eventoId }: UploadFotosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef(false);
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    if (isUploadingRef.current) {
      return;
    }

    isUploadingRef.current = true;
    setIsUploading(true);
    setError(null);
    let failedUploads = 0;
    let firstError: string | null = null;

    try {
      for (const [index, file] of files.entries()) {
        setProgress(`Enviando ${index + 1} de ${files.length}...`);

        try {
          const signed = await gerarUrlPresignada(
            eventoId,
            file.name,
            file.type,
          );
          if (!signed.success) {
            throw new Error(signed.error);
          }

          const response = await fetch(signed.url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!response.ok) {
            throw new Error(
              `O S3 recusou o envio de "${file.name}" (${response.status}).`,
            );
          }

          const saved = await salvarFotoBanco(eventoId, signed.key);
          if (!saved.success) {
            throw new Error(saved.error);
          }
        } catch (uploadError) {
          failedUploads += 1;
          if (!firstError) {
            firstError =
              uploadError instanceof Error
                ? uploadError.message
                : "Ocorreu um erro inesperado durante o envio.";
          }
        }
      }
    } finally {
      setProgress("");
      setIsUploading(false);
      isUploadingRef.current = false;

      if (failedUploads > 0) {
        setError(
          failedUploads === 1
            ? firstError
            : `${failedUploads} fotos não puderam ser enviadas. ${firstError ?? ""}`,
        );
      }

      router.refresh();
    }
  }

  return (
    <div className="mt-5">
      <input
        accept="image/*"
        className="sr-only"
        multiple
        onChange={handleFilesSelected}
        ref={inputRef}
        type="file"
      />
      <button
        className="inline-flex h-11 items-center justify-center rounded-md bg-black px-6 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {isUploading ? progress : "Selecionar Fotos"}
      </button>
      {error && (
        <p className="mt-3 text-sm text-gray-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
