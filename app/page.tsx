import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA] text-gray-900">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center px-6 sm:px-10">
          <Link
            className="text-xl font-semibold tracking-[0.18em]"
            href="/"
          >
            Vitrini
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <section className="flex w-full max-w-3xl flex-col items-center text-center">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.3em] text-gray-500">
            Fotografia esportiva
          </p>
          <h1 className="max-w-2xl text-4xl font-medium leading-tight tracking-tight sm:text-6xl">
            Cada momento merece ser lembrado.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
            Encontre e reviva os melhores registros da sua jornada esportiva.
          </p>
          <div className="mt-10 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center rounded-md bg-black px-7 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              href="/sign-in"
            >
              Entrar
            </Link>
            <Link
              className="inline-flex h-12 items-center justify-center rounded-md bg-black px-7 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              href="/sign-up"
            >
              Sou Fotógrafo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
