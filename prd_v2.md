# PRD Master: Vitrini v2.0 - Plataforma de Fotografia Esportiva

## 1. Visão Geral do Produto
Marketplace de fotografia esportiva de alta performance focado em múltiplas modalidades. A plataforma atua como ponte comercial entre fotógrafos/agências e atletas, focando em alta velocidade de busca via IA, liquidação financeira automatizada e uma experiência de compra mobile-first sem atritos.

## 2. Identidade Visual e UI/UX
*   **Conceito:** Estética premium/minimalista ("vitrine de loja de grife"). O design deve ser invisível para que a fotografia seja o destaque.
*   **Paleta de Cores:** Monocromática de alto contraste. Fundo em *Off-White* (`#FAFAFA` ou similar) e textos em *Grafite Profundo* (`#111827`). 
*   **Elementos:** Ausência de cores vibrantes na interface. Botões de ação primária (CTAs) em preto sólido com texto branco. Linhas de divisão finas (1px). Uso generoso de espaço em branco (negative space). Cantos retos ou levemente arredondados (sem formato "pílula").
*   **Tipografia:** Moderna e sem serifa (ex: *Inter* ou *Geist*), com espaçamento de letras sutilmente alargado (tracking) em títulos para transmitir sofisticação.

## 3. Stack Tecnológica Base
*   **Linguagem:** TypeScript.
*   **Frontend / Backend:** Next.js (App Router).
*   **Estilização:** Tailwind CSS.
*   **Banco de Dados:** PostgreSQL (via Neon ou Supabase).
*   **ORM:** Prisma.

## 4. Infraestrutura e Serviços Gerenciados
*   **Hospedagem Principal:** Vercel (Hobby).
*   **Autenticação:** Clerk (Sessões e permissões baseadas em metadados).
*   **Storage (Armazenamento):** Amazon S3 (AWS). Separação entre originais (privado) e vitrine/marcas d'água (público).
*   **Processamento Assíncrono:** Inngest. Orquestração de tarefas de fundo (marcas d'água, extração EXIF e zip).
*   **IA e Visão Computacional:** AWS Rekognition (Busca facial).
*   **Pagamentos e Split:** Stripe Connect (Checkout e divisão de comissões).
*   **Disparo de E-mails:** Resend (Notificações de sucesso e entrega de links).

## 5. Regras de Negócio e Arquitetura do Sistema

### 5.1. Atores e Hierarquia (Baseada em Evento)
*   A permissão (role) de um fotógrafo não é global, mas sim **atrelada ao evento**.
*   Um usuário que cria um evento é o `ADMIN` daquele evento.
*   O `ADMIN` pode convidar outros usuários como freelancers (`CAMPO`) para aquele evento específico, definindo uma porcentagem de comissão (split).
*   O Stripe Connect garantirá a divisão do pagamento entre o `ADMIN`, o `CAMPO` (se a foto for dele) e a taxa da plataforma.

### 5.2. Descoberta e Organização de Imagens
*   **Busca Primária:** Reconhecimento facial (IA). Selfies de busca são efêmeras (mantidas em RAM apenas para inferência e deletadas).
*   **Busca Secundária (Fallback):** Blocos cronológicos dinâmicos de 1 hora. O sistema extrairá o `DateTimeOriginal` do EXIF da imagem durante o upload via Inngest e exibirá apenas os blocos que contiverem imagens.

### 5.3. Precificação, Pacotes e Carrinho
*   **Preço Fixo:** O preço da foto é definido em nível de *Evento*. Todas as fotos de um mesmo evento têm o mesmo valor.
*   **Venda Dinâmica ("Minhas Fotos"):** Não existirão pacotes estáticos pré-definidos. Quando a IA (ou busca cronológica) separar as fotos do atleta, o sistema agrupará essas imagens em um pacote dinâmico e exclusivo para ele no carrinho.
*   **Descontos e Promoções:** O sistema oferecerá descontos progressivos nativos (ex: compre X fotos, ganhe Y% off) e aceitará Cupons de Desconto configurados via Stripe. A regra legada de "cassino" e captura de leads por tempo foi descartada.

### 5.4. Ciclo de Vida do Evento e Operação
*   **Status de Rascunho:** Todo evento é criado e permanece no status `INATIVO`. Enquanto estiver recebendo uploads e sendo processado pelo Inngest, ele fica invisível para o público. O fotógrafo altera manualmente para `ATIVO` quando desejar liberar as vendas.
*   **Retenção de Arquivos (S3 TTL):** Visando otimização de custos, o sistema (ou configuração do S3) excluirá automaticamente as fotos originais em alta resolução 6 meses após a criação do evento. Fotos comprimidas de vitrine permanecem.

### 5.5. Entrega e Segurança
*   **Proteção de Originais:** A entrega de fotos pagas não utiliza anexos ou links permanentes. O cliente recebe por e-mail um link seguro (gerado via URL pré-assinada do S3 com tempo de expiração).
*   **Webhooks Idempotentes:** A comunicação entre o Stripe e a plataforma via webhooks será construída de forma idempotente para garantir que falhas momentâneas de servidor não deixem pedidos travados como pendentes após o pagamento do cliente.