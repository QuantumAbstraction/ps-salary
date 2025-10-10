# PS Salary - AI Coding Agent Instructions

Never create MD files unless explicitly instructed.

## Project Overview

A Next.js 13 application providing Canadian public service salary data through a web interface and RESTful API. Data is scraped from Treasury Board of Canada Secretariat pages and cached for performance.

## Architecture & Data Flow

### Core Data Pipeline

1. **Scraping** (`scrape.ts`): Fetches 28+ Treasury Board URLs, parses HTML tables into structured JSON
2. **Storage** (`data/data.json`): 107+ classifications with salary steps and effective dates
3. **API Layer** (`pages/api/`): Dynamic routes serve cached data
4. **Client Cache** (`lib/api-cache.ts`): 60-minute client-side TTL cache to minimize API calls

**Key Pattern**: Data flows from Treasury Board → scraper → data.json → API routes → client cache → UI components.

### API Route Structure

- `GET /api/data` - Full dataset (all classifications)
- `GET /api/top` - Top salaries + popular list
- `GET /api/[code]` - Classification family (e.g., `cs-01`, `cs-02` for code `cs`)
- `GET /api/[code]/[step]` - Specific step salary
- `POST /api/scraper` - Admin endpoint to refresh data (detects serverless environments)

**Critical**: All API routes expect uppercase classification codes. Use `.toUpperCase()` when querying.

## Technology Stack Requirements

### Package Installation

**Always use**: `npm install --legacy-peer-deps`

- Required for HeroUI v2.6.7 compatibility
- Configured in `vercel.json` and package.json scripts

### UI Framework: HeroUI (NextUI fork)

- Import from `@heroui/react`, NOT `@nextui/react`
- Components: Button, Card, Table, Autocomplete, Slider, Tabs, Switch
- Styling: Tailwind CSS utility classes + HeroUI theme tokens
- Example: `<Button color="primary" variant="bordered">Text</Button>`

### Theme System

- Uses `next-themes` with SSR hydration handling
- Custom icons from `components/Icons.tsx` (Sun, Moon, Upload, etc.)
- **Pattern**: Always check `mounted` state before rendering theme-dependent content to prevent hydration mismatch
- Storage key: `ps-salary-theme`

```tsx
// Theme toggle pattern (see components/ThemeToggle.tsx)
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <div className='animate-pulse' />; // Skeleton loader
```

## Development Workflows

### Running Locally

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (~8s with caching)
npm start            # Run production server
npm run lint         # ESLint checks
```

### Data Refresh

1. Update URLs in `scrape.ts` URLS array
2. POST to `/api/scraper` endpoint (local or production)
3. Verifies serverless environment and skips file writes on read-only systems
4. Merges new data with existing classifications

### Debugging Classification Lookup

- Check `pages/api/[code]/index.ts` for prefix matching logic
- Function `findAllInKeys()` matches all codes starting with query
- Example: Query `as` returns `AS-01`, `AS-02`, `AS-03`, etc.

## Project-Specific Conventions

### Salary Formatting

Always use this pattern for currency display:

```tsx
const formatSalary = (amount: number) =>
	new Intl.NumberFormat('en-CA', {
		style: 'currency',
		currency: 'CAD',
		minimumFractionDigits: 0,
		maximumFractionDigits: 0
	}).format(amount);
```

### Data Structure

Classifications stored as:

```json
{
  "AS-01": {
    "annual-rates-of-pay": [
      {
        "effective-date": "2023-01-01",
        "step-1": 50000,
        "step-2": 52000,
        ...
      }
    ]
  }
}
```

- Most recent rates at **end** of array (`rates[rates.length - 1]`)
- Steps are dynamic (some have 1-3 steps, others have 10+)
- Filter object keys with `key.startsWith('step-')` to find all steps

### Component Organization

- Pages in `pages/` (index, search, equivalency, admin)
- Reusable UI in `components/` (AppShell, AppNavbar, Footer, Icons, ThemeToggle)
- API routes in `pages/api/` with dynamic segments
- **Layout**: AppShell wraps all pages with navbar + footer + max-width container

### Performance Patterns

1. **Client-side caching**: Import `cachedFetch` from `lib/api-cache.ts`, not raw fetch
2. **API caching**: Headers set in `next.config.js` and `vercel.json` (3600s max-age)
3. **Dynamic imports**: Use `await import()` for client-only modules (see api-cache usage)
4. **Memoization**: Wrap expensive computations in `useMemo()` (see index.tsx stats calculation)

## Deployment

### Vercel (Production)

- Install command: `npm install --legacy-peer-deps`
- Build command: `npm run build`
- Function timeout: 300s (for scraper endpoint)
- Environment detection: `process.env.VERCEL` check in scraper.ts

### Environment-Specific Behavior

Scraper API (`pages/api/scraper.ts`) detects serverless:

- **Local**: Reads/writes `data/data.json`
- **Vercel/Lambda**: Skips file operations (read-only filesystem)

## Common Gotchas

1. **HeroUI imports**: Must use `@heroui/react`, not `@nextui/react`
2. **Hydration errors**: Always use mounted check for theme/client-only code
3. **Uppercase codes**: API expects uppercase classification codes
4. **Legacy peer deps**: Required for all npm installs
5. **Most recent rates**: Last element in array, not first
6. **Console logs**: Removed in production by next.config.js compiler

## Key Files Reference

- `scrape.ts` - Data ingestion logic (1097 lines, complex parsing)
- `lib/api-cache.ts` - Client-side cache implementation
- `pages/equivalency.tsx` - Salary comparison tool (tolerance %, multiple comparison types)
- `components/Icons.tsx` - Centralized SVG icon system
- `vercel.json` - Deployment config with caching headers
- `DEPLOYMENT.md` - Comprehensive deployment guide

## When Adding Features

1. Check if data structure in `data.json` supports it
2. Add API endpoint in `pages/api/` if needed
3. Use `cachedFetch()` for client-side data fetching
4. Follow HeroUI component patterns from existing pages
5. Add custom icons to `components/Icons.tsx` if needed
6. Update README.md with new functionality
