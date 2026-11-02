"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  gerarUrlsPresignadas,
  registrarFotosEnviadas,
} from "@/app/actions/upload-s3";

type UploadFotosProps = {
  eventoId: string;
};

const UPLOAD_CONCURRENCY = 6;

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
    let registrationError: string | null = null;
    const uploadedKeys: string[] = [];
    let phase: "signing" | "uploading" | "registering" = "signing";

    try {
      setProgress("Preparando o envio...");
      const signed = await gerarUrlsPresignadas(
        eventoId,
        files.map((file) => ({ nome: file.name, tipo: file.type })),
      );
      if (!signed.success) {
        throw new Error(signed.error);
      }
      if (signed.uploads.length !== files.length) {
        throw new Error("Não foi possível preparar o envio de todas as fotos.");
      }

      phase = "uploading";
      let nextIndex = 0;
      let completedUploads = 0;
      const uploadNextFile = async () => {
        while (nextIndex < files.length) {
          const index = nextIndex++;
          const file = files[index];
          const upload = signed.uploads[index];

          try {
            const response = await fetch(upload.url, {
              method: "PUT",
              headers: { "Content-Type": file.type },
              body: file,
            });

            if (!response.ok) {
              throw new Error(
                `O S3 recusou o envio de "${file.name}" (${response.status}).`,
              );
            }

            uploadedKeys.push(upload.key);
          } catch (uploadError) {
            failedUploads += 1;
            if (!firstError) {
              firstError =
                uploadError instanceof Error
                  ? uploadError.message
                  : "Ocorreu um erro inesperado durante o envio.";
            }
          } finally {
            completedUploads += 1;
            setProgress(`Enviando ${completedUploads} de ${files.length}...`);
          }
        }
      };

      await Promise.all(
        Array.from(
          { length: Math.min(UPLOAD_CONCURRENCY, files.length) },
          uploadNextFile,
        ),
      );

      if (uploadedKeys.length > 0) {
        phase = "registering";
        setProgress(`Salvando ${uploadedKeys.length} fotos...`);
        const saved = await registrarFotosEnviadas(eventoId, uploadedKeys);
        if (!saved.success) {
          throw new Error(saved.error);
        }
      }
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "Ocorreu um erro inesperado durante o envio.";

      if (phase === "registering") {
        registrationError = message;
      } else if (failedUploads > 0) {
        firstError ??= message;
      } else {
        setError(message);
      }
    } finally {
      setProgress("");
      setIsUploading(false);
      isUploadingRef.current = false;

      const failures: string[] = [];
      if (failedUploads > 0) {
        failures.push(
          `${failedUploads} fotos não puderam ser enviadas. ${firstError ?? ""}`,
        );
      }
      if (registrationError) {
        failures.push(
          `${uploadedKeys.length} fotos foram enviadas ao armazenamento, mas não foi possível registrar ou iniciar o processamento: ${registrationError}`,
        );
      }
      if (failures.length > 0) {
        setError(failures.join(" "));
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
