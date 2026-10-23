import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-gray-200">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
        <Link className="text-xl font-semibold tracking-[0.18em]" href="/">
          Vitrini Art
        </Link>
        <nav
          aria-label="Navegação principal"
          className="flex items-center gap-3 sm:gap-6"
        >
          <Link
            className="text-sm font-medium text-gray-700 transition-colors hover:text-black"
            href="/sign-in"
          >
            Entrar
          </Link>
          <Link
            className="rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            href="/sign-in?tipo=fotografo"
          >
            Sou Fotógrafo
          </Link>
        </nav>
      </div>
    </header>
  );
}
