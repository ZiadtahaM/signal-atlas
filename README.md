# Signal Atlas

A searchable field guide for AI-assisted software engineering, built as a reference companion to the principles of John Ousterhout, Eric Evans, and Kent Beck.

![Signal Atlas Interface](https://raw.githubusercontent.com/ZiadtahaM/signal-atlas/main/client/public/manus-storage/signal-atlas-hero-texture_0334d338.jpg)

## What it is

Signal Atlas extracts the engineering principles that stay relevant when an AI is writing most of the code. The core argument: AI makes generation cheap. It doesn't make design, maintenance, or changeability cheap.

The guide covers eight areas:

| # | Topic | Focus |
|---|-------|-------|
| 01 | The central thesis | Strategic vs. tactical split |
| 02 | AI development workflow | Understand → Design → Name → Specify → Implement → Review |
| 03 | Ubiquitous language | One concept, one name across code, docs, and tests |
| 04 | TDD as a speed limit | Stop the agent from outrunning its headlights |
| 05 | Deep vs. shallow modules | Substantial behavior behind a small interface |
| 06 | Grey-box implementation | Human owns the contract, agent owns the how |
| 07 | Warning signals | When to stop adding code and inspect the boundary |
| 08 | Books and resources | The longer tradition behind these ideas |

## Stack

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Routing | Wouter |
| Components | Radix UI primitives, shadcn/ui patterns |
| Animations | Framer Motion |
| Charts | Recharts |
| Toasts | Sonner |
| Build | Vite 7, esbuild (server bundle) |
| Server | Express (static file server, SPA fallback) |
| Maps | Google Maps JS API (proxied via Forge) |
| Package manager | pnpm |

## Architecture

```
signal-atlas/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/          # Radix-based primitives
│   │   │   ├── Map.tsx      # Google Maps integration with typed props
│   │   │   └── ManusDialog.tsx
│   │   ├── hooks/
│   │   │   ├── useComposition.ts
│   │   │   ├── useMobile.tsx
│   │   │   └── usePersistFn.ts
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx
│   │   └── pages/
│   │       └── Home.tsx     # Main guide page (87 lines)
│   └── public/
├── server/
│   └── index.ts             # Express static server + SPA fallback
├── vite.config.ts
└── package.json
```

The server has one job: serve the Vite-built `dist/public` directory and return `index.html` for every unmatched route. No database, no sessions, no API layer.

## Local setup

```bash
# Install
pnpm install

# Dev server (Vite HMR + Express)
pnpm dev

# Type check
pnpm check

# Production build
pnpm build

# Run production build
pnpm start
```

## Reference books in the guide

- John Ousterhout, *A Philosophy of Software Design*
- Eric Evans, *Domain-Driven Design*
- Kent Beck, *Extreme Programming Explained*
- Frederick P. Brooks, *The Design of Design*
- David Thomas & Andrew Hunt, *The Pragmatic Programmer*
