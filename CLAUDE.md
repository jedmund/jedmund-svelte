# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**

```bash
npm run dev
```

**Build for production:**

```bash
npm run build
```

**Type checking and linting:**

```bash
npm run check          # Type check with svelte-check
npm run lint           # Check formatting and linting
npm run format         # Auto-format code with prettier
```

**Preview production build:**

```bash
npm run preview
```

## Architecture Overview

This is a SvelteKit personal portfolio site for @jedmund that integrates with multiple external APIs to display real-time data about music listening habits and gaming activity.

### Key Architecture Components

**API Integration Layer** (`src/routes/api/`)

- **Redis caching**: Shared Redis client (`redis-client.ts`) used across API routes for caching external API responses
- **External APIs**: Last.fm (music), Steam (games), PSN (PlayStation games), Giant Bomb (game metadata)
- **Data enrichment**: Last.fm data is enhanced with iTunes artwork and Giant Bomb metadata

**Frontend Structure**

- **Component-based**: Reusable Svelte components in `$lib/components/`
- **Page composition**: Main page (`+page.svelte`) composed of multiple `Page` components with different content sections
- **Data loading**: Server-side data fetching in `+page.ts` with error handling

**Styling System**

- **SCSS-based**: Global variables, fonts, themes automatically imported via Vite config
- **Asset management**: SVG icons and illustrations with automatic processing and alias imports

### Key Aliases (svelte.config.js)

- `$components` → `src/lib/components`
- `$icons` → `src/assets/icons`
- `$illos` → `src/assets/illos`
- `$styles` → `src/styles`

### Environment Dependencies

- Requires `LASTFM_API_KEY` and `REDIS_URL` environment variables
- Uses Node.js adapter for deployment
