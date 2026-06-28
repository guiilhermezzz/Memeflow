# Memeflow Social Video Platform

Memeflow é uma plataforma social para compartilhar vídeos curtos e memes, com autenticação, perfil, explorar conteúdo e publicação.

## Tecnologias

- React
- TypeScript
- Vite
- Zustand
- React Router
- Supabase
- Tailwind-style classes via componentes próprios

## Requisitos

- Node.js 18+
- npm ou pnpm

## Instalação

```bash
npm install
```

## Execução

```bash
npm run dev
```

O projeto ficará disponível no endereço padrão do Vite.

## Estrutura principal

- src/pages: páginas da aplicação
- src/components: componentes reutilizáveis
- src/lib: utilidades, integração com Supabase e helpers
- src/stores: estado global da aplicação

## Variáveis de ambiente

Se o projeto estiver usando Supabase, crie um arquivo `.env` com as variáveis:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Build

```bash
npm run build
```
