export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white px-6 py-8 text-sm text-gray-600 sm:px-10">
      <div className="mx-auto grid w-full max-w-7xl gap-5 sm:grid-cols-2">
        <div>
          <p className="font-medium text-gray-900">Vitrini Art</p>
          <p className="mt-2">
            Suporte:{" "}
            <a
              className="underline underline-offset-2 hover:text-gray-900"
              href="mailto:vitriniart.envio@gmail.com"
            >
              vitriniart.envio@gmail.com
            </a>{" "}
            <span aria-hidden="true">|</span> WhatsApp:{" "}
            <a
              className="underline underline-offset-2 hover:text-gray-900"
              href="https://wa.me/5535998534504"
            >
              (35)998534504
            </a>
          </p>
        </div>
        <p className="leading-6 sm:text-right">
          Política de Entrega: As fotografias são produtos digitais em alta
          resolução. O arquivo original sem marca d&apos;água é enviado
          automaticamente para o seu e-mail logo após a confirmação do
          pagamento.
        </p>
      </div>
    </footer>
  );
}
