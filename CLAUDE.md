# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Sitio web corporativo de **Solterra Movimiento de Tierra, Maquinarias y Equipos** — empresa de construcción e ingeniería en el norte de Chile. El contenido está en español.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** — sin shadcn/ui; utilidades custom con `clsx` + `class-variance-authority`
- **Biome** — linter y formateador (reemplaza ESLint + Prettier)
- **Bun** — gestor de paquetes y runtime
- **Netlify** — plataforma de despliegue (con `@netlify/plugin-nextjs`)

## Comandos

```bash
bun dev          # Servidor local (0.0.0.0, turbopack)
bun run build    # Build de producción
bun run lint     # tsc --noEmit + next lint
bun run format   # biome format --write (solo src/**/*.ts y src/**/*.tsx)
```

No hay tests configurados aún.

## Arquitectura

### Páginas (App Router)

| Ruta | Archivo |
|------|---------|
| `/` | `src/app/page.tsx` |
| `/quienes-somos` | `src/app/quienes-somos/page.tsx` |
| `/servicios` | `src/app/servicios/page.tsx` |
| `/experiencia` | `src/app/experiencia/page.tsx` |
| `/contacto` | `src/app/contacto/page.tsx` |

El layout global (`src/app/layout.tsx`) inyecta `<Header>`, `<Footer>` y `<WhatsAppButton>` en todas las páginas. El `<main>` tiene `pt-20` para compensar el header fijo.

### Componentes

- `Header` — `"use client"`, navegación fija con menú responsive. La lista de items está en `navItems[]` dentro del propio archivo.
- `Footer` — server component
- `WhatsAppButton` — botón flotante
- `ClientLogos` — carrusel/grid de logos de clientes
- `CTASection` — sección de llamada a la acción reutilizable; acepta `title`, `subtitle`, `buttonText`, `buttonLink`

### Imágenes y assets

- `next/image` con `unoptimized: true`
- Los assets externos se sirven desde `ext.same-assets.com` — ya configurados en `remotePatterns` de `next.config.js`
- No usar `<img>` nativo (Biome lo permite con `noImgElement: off`, pero se prefiere `next/image`)

### Identidad de marca

- Azul oscuro: `#253158`
- Rojo corporativo: `#c6352e`
- No hay archivo de tokens CSS; los colores se aplican directamente con clases Tailwind arbitrarias (`text-[#253158]`, `bg-[#c6352e]`)

### Biome

- Comillas dobles en JS/TS
- Indentación con espacios
- Varias reglas de accesibilidad desactivadas (ver `biome.json`)
- Ejecutar `bun run format` después de editar archivos en `src/`

### Despliegue

Netlify con el plugin oficial de Next.js. El comando de build es `bun run build` y publica `.next`.
