This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Frontend — Club Deportivo

Next.js (App Router) + TypeScript + Tailwind CSS v4. La UI se genera a partir de `docs/pantallas.md` y `docs/colores.md` (SDD).

## Scripts

```bash
pnpm dev      # http://localhost:3000
pnpm build
pnpm lint
```

## Design system (fase 6.2)

Componentes transversales en `src/components/`:

| Componente | Uso |
|---|---|
| `ThemeToggle` | Sol/luna. Persiste en `localStorage` (`theme`). |
| `StatusBadge` | Estados → tokens `success` / `warning` / `error` / `info`. |
| `Navbar` | Menú condicional por rol (`SOCIO` / `GERENTE` / `ADMINISTRADOR`). |
| `Sidebar` / `AdminSidebar` | Navegación de paneles de gestión. |
| `TimeSlotGrid` | Franjas 🟢 libre / 🔴 ocupada. |
| `ReservationCard` | Fecha, disciplina, cancha, horario, estado, monto. |
| `DataTable` | Búsqueda, filtros, ordenamiento y paginación. |
| `PublicLayout` / `AuthenticatedLayout` / `AdminLayout` | Shells por tipo de pantalla. |

Importar desde `@/components`. No usar hex ni colores nombrados en TSX: ESLint `no-color-literals`.

## Theme

1. `localStorage.theme` (`light` \| `dark`)
2. Si no hay valor, `prefers-color-scheme`
3. Toggle en el navbar persiste la elección
