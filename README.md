# jedmund.com

Personal portfolio website built with SvelteKit featuring a content management system for showcasing creative work, writing, and personal interests.

## Features

- Content management system for organizing and displaying various types of media
- Photo galleries with masonry layout and infinite scrolling
- Blog/journal section for long-form writing
- Music listening history integration via Last.fm API
- Gaming activity tracking from Steam and PlayStation
- Project showcase pages with detailed case studies
- Responsive design with customizable themes

## Tech Stack

- SvelteKit with Svelte 5 (Runes mode)
- Redis for caching external API responses
- SCSS for styling
- Integration with Last.fm, Steam, PSN, iTunes, and Giant Bomb APIs

## Development

Install dependencies:
```bash
npm install
```

Start development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Environment Variables

Required environment variables:
- `LASTFM_API_KEY` - Last.fm API key for music data
- `REDIS_URL` - Redis connection URL for caching

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run check` - Type check with svelte-check
- `npm run lint` - Check formatting and linting
- `npm run format` - Auto-format code with prettier