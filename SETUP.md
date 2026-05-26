# SETUP.md — News Automation Hub

## Visão Geral

Plataforma web para automação de notícias: coleta via RSS/scraping, editor de mockups/templates, agendamento e publicação em redes sociais e blog.

## Ambiente Configurado em

**Data:** 2026-05-08  
**Node.js:** v22.14.0  
**npm:** bundled com Node 22

---

## 1. Estrutura do Projeto

```
news-automation-hub/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/              ← shadcn/ui (adicionar componentes via CLI)
│   │   └── layout/          ← componentes de layout globais
│   ├── pages/
│   │   ├── auth/            ← login, registro, reset de senha
│   │   ├── feed/            ← feed diário de notícias
│   │   ├── mockups/         ← editor de templates/artes
│   │   ├── schedule/        ← agendamento de publicações
│   │   └── integrations/    ← gestão de chaves de API e webhooks
│   ├── lib/
│   │   ├── supabase.ts      ← cliente Supabase configurado
│   │   └── utils.ts         ← utilitário cn() (clsx + tailwind-merge)
│   ├── hooks/               ← custom React hooks
│   ├── stores/              ← Zustand stores (state global)
│   ├── types/               ← TypeScript types e interfaces
│   ├── services/            ← chamadas de API e Edge Functions
│   └── config/              ← constantes e configurações
├── supabase/
│   ├── functions/           ← Edge Functions (Deno)
│   ├── migrations/          ← migrações do banco de dados
│   └── config.toml          ← configuração do projeto Supabase
├── .env.example             ← template de variáveis de ambiente
├── .env.local               ← variáveis locais (NÃO commitado)
├── .gitignore
├── .prettierrc
├── components.json          ← configuração do shadcn/ui
├── supabase.exe             ← Supabase CLI v2.98.2 (local, Windows)
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.app.json        ← path aliases configurados aqui
├── vite.config.ts
└── package.json
```

---

## 2. Stack e Versões Instaladas

### Dependências de Produção

| Pacote | Versão | Finalidade |
|--------|--------|------------|
| `react` | ^19.2.5 | UI framework |
| `react-dom` | ^19.2.5 | DOM renderer |
| `react-router-dom` | ^7.15.0 | Roteamento |
| `@supabase/supabase-js` | ^2.105.3 | Cliente Supabase |
| `zustand` | ^5.0.13 | State management |
| `@tanstack/react-query` | ^5.100.9 | Data fetching e cache |
| `react-hook-form` | ^7.75.0 | Formulários |
| `zod` | ^4.4.3 | Validação de schemas |
| `@hookform/resolvers` | ^5.2.2 | Integração RHF + Zod |
| `lucide-react` | ^1.14.0 | Ícones |
| `date-fns` | ^4.1.0 | Manipulação de datas |
| `recharts` | ^3.8.1 | Gráficos e dashboard |
| `axios` | ^1.16.0 | Requisições HTTP |
| `rss-parser` | ^3.13.0 | Parsing de feeds RSS |
| `cheerio` | ^1.2.0 | Scraping de HTML |
| `konva` | ^10.3.0 | Canvas 2D (editor de mockups) |
| `react-konva` | ^19.2.4 | Bindings React para Konva |
| `html2canvas` | ^1.4.1 | Renderizar HTML como imagem |
| `clsx` | ^2.1.1 | Utilitário de classes CSS |
| `tailwind-merge` | ^3.5.0 | Merge de classes Tailwind |
| `class-variance-authority` | ^0.7.1 | Variantes de componentes (shadcn) |
| `@radix-ui/react-slot` | ^1.2.4 | Componente base (shadcn) |

### Dependências de Desenvolvimento

| Pacote | Versão | Finalidade |
|--------|--------|------------|
| `vite` | ^8.0.10 | Build tool |
| `tailwindcss` | ^3.4.19 | CSS framework (v3!) |
| `postcss` | ^8.5.14 | Processador CSS |
| `autoprefixer` | ^10.5.0 | Prefixos CSS automáticos |
| `typescript` | ~6.0.2 | Tipagem estática |
| `@types/node` | ^24.12.3 | Types para Node.js |
| `prettier` | ^3.8.3 | Formatação de código |
| `eslint-config-prettier` | ^10.1.8 | ESLint + Prettier |
| `eslint-plugin-prettier` | ^5.5.5 | Prettier como regra ESLint |
| `@types/cheerio` | ^0.22.35 | Types para Cheerio |

### Ferramenta CLI

| Ferramenta | Versão | Localização |
|-----------|--------|------------|
| Supabase CLI | 2.98.2 | `./supabase.exe` (local, Windows) |

> **Nota:** O Supabase CLI não suporta instalação via `npm install -g`. Foi baixado como binário diretamente do GitHub Releases e colocado na raiz do projeto. Para usar globalmente, adicione o diretório do projeto ao PATH do sistema.

---

## 3. Configurações Aplicadas

### TailwindCSS v3
- Inicializado com `npx tailwindcss init -p`
- `tailwind.config.js`: content paths apontando para `./src/**/*.{js,ts,jsx,tsx}`
- `darkMode: ["class"]` configurado para suporte ao tema dark do shadcn/ui
- Diretivas Tailwind + variáveis CSS do shadcn em `src/index.css`

### Path Alias `@`
- `tsconfig.app.json`: `"paths": { "@/*": ["./src/*"] }`
- `vite.config.ts`: `resolve.alias: { '@': path.resolve(__dirname, './src') }`
- Permite imports como `import { supabase } from '@/lib/supabase'`

### shadcn/ui
- `components.json` criado manualmente com:
  - Style: `default`
  - Base color: `neutral`
  - CSS variables: `true`
  - Alias componentes: `@/components`
  - Alias utils: `@/lib/utils`
- `src/lib/utils.ts` criado com a função `cn()` (clsx + tailwind-merge)
- Para adicionar componentes: `npx shadcn@4.6.0 add <componente>`

### Prettier
- Arquivo `.prettierrc` com: `singleQuote`, `semi`, `trailingComma: "es5"`, `tabWidth: 2`

### Supabase Local
- `supabase init` executado — criada pasta `supabase/` com `config.toml`
- Estrutura pronta para migrations e Edge Functions

---

## 4. Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJECT-ID.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

Obtenha os valores em: [supabase.com/dashboard](https://supabase.com/dashboard) → Settings → API

---

## 5. Scripts Disponíveis

```bash
npm run dev       # Servidor de desenvolvimento (http://localhost:5173)
npm run build     # Build de produção
npm run preview   # Preview do build de produção
npm run lint      # Linting com ESLint
```

---

## 6. Próximos Passos Sugeridos

### Fase 2 — Autenticação e Layout Base
- [ ] Criar `src/App.tsx` com React Router DOM configurado
- [ ] Configurar `QueryClientProvider` (React Query) e `Suspense`
- [ ] Criar layout base: `src/components/layout/AppLayout.tsx`
- [ ] Implementar páginas de auth: Login e Registro com Supabase Auth
- [ ] Configurar proteção de rotas (route guards)

### Fase 3 — Feed de Notícias
- [ ] Service de RSS: `src/services/rssService.ts`
- [ ] Scraper leve com Cheerio: `src/services/scraperService.ts`
- [ ] Edge Function Supabase para agendamento de coleta
- [ ] Store Zustand para estado do feed: `src/stores/feedStore.ts`
- [ ] Página de feed com cards de notícias

### Fase 4 — Editor de Mockups
- [ ] Canvas com react-konva em `src/pages/mockups/`
- [ ] Sistema de templates salvos no Supabase Storage
- [ ] Exportação como imagem (html2canvas + Konva.toDataURL)

### Fase 5 — Agendamento e Publicações
- [ ] Integração com APIs: Instagram Graph API, Facebook Graph API
- [ ] Edge Functions para dispatch de publicações
- [ ] Calendário de agendamento com date-fns

### Fase 6 — Dashboard e Métricas
- [ ] Gráficos com Recharts
- [ ] Analytics de publicações

### Supabase CLI (comandos frequentes)
```bash
# Na raiz do projeto (Windows)
.\supabase.exe login              # Autenticar com o Supabase
.\supabase.exe link --project-ref SEU_PROJECT_REF  # Vincular projeto
.\supabase.exe migration new nome_da_migration     # Nova migração
.\supabase.exe functions new nome-da-funcao        # Nova Edge Function
.\supabase.exe functions deploy nome-da-funcao     # Deploy de função
```

### Adicionar Componentes shadcn/ui
```bash
npx shadcn@4.6.0 add button
npx shadcn@4.6.0 add input
npx shadcn@4.6.0 add card
npx shadcn@4.6.0 add dialog
npx shadcn@4.6.0 add form
npx shadcn@4.6.0 add toast
```

---

## 7. Validação do Setup

✅ `npm run dev` → servidor sobe em `http://localhost:5173`  
✅ `npx tsc --noEmit` → zero erros de TypeScript  
✅ TailwindCSS v3 configurado com diretivas em `index.css`  
✅ Path alias `@/` funcionando em Vite e TypeScript  
✅ shadcn/ui `components.json` configurado, `lib/utils.ts` criado  
✅ Supabase CLI v2.98.2 instalado (`.\supabase.exe`)  
✅ Estrutura `supabase/` criada com `config.toml`  
✅ `.env.example` e `.env.local` (gitignored) criados  
✅ `.prettierrc` configurado  
✅ `.gitignore` com env files e supabase temps  
✅ Git inicializado  
