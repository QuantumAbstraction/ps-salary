# PS Salary - AI Coding Agent Instructions

Never create MD files unless explicitly instructed. Use **cmd** terminal, not PowerShell.

## Project Overview

A Next.js 13 Pages Router application providing Canadian public service salary data through a web interface and RESTful API. Data is scraped from 28+ Treasury Board of Canada Secretariat collective agreement pages and cached for performance.

## Architecture & Data Flow

### Core Data Pipeline

1. **Scraping** (`scrape.ts`): Fetches Treasury Board URLs, parses HTML tables with complex classification detection (including salary-range inference for AS-01 through AS-08)
2. **Storage** (`data/data.json`): 777 classifications with salary steps and effective dates (cleaned of duplicate base codes)
3. **API Layer** (`pages/api/`): Dynamic routes serve cached data with proper response structure
4. **Client Cache** (`lib/api-cache.ts`): 60-minute client-side TTL cache to minimize API calls

**Key Pattern**: Data flows from Treasury Board → scraper → data.json → API routes → client cache → UI components.

### API Route Structure & Response Format

- `GET /api/data` - Full dataset (all classifications)
- `GET /api/top` - Returns `{top: {code: salary}, popular: [codes]}` structure
- `GET /api/[code]` - Classification family (e.g., `/api/cs` returns all CS-01, CS-02, etc.)
- `GET /api/[code]/[step]` - Specific step salary
- `POST /api/scraper` - Admin endpoint to refresh data (detects serverless environments)

**Critical API Usage**:

- All routes expect **uppercase** classification codes (use `.toUpperCase()`)
- `/api/top` returns nested object: `topResponse?.top || {}` NOT flat object
- When destructuring API responses: `const topData = topResponse?.top || {}`

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

- Uses `next-themes` with SSR hydration handling (**Pages Router** - NO `'use client'` directives)
- Custom icons from `components/Icons.tsx` (15 icons: Sun, Moon, Upload, Search, Compare, Deploy, Settings, Home, Filter, External, etc.)
- **Pattern**: Always check `mounted` state before rendering theme-dependent content to prevent hydration mismatch
- Storage key: `ps-salary-theme`
- **Critical**: `suppressHydrationWarning` required on both `<Html>` and `<body>` tags in `_document.tsx`

```tsx
// Theme toggle pattern (see components/ThemeToggle.tsx)
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <div className='animate-pulse' />; // Skeleton loader
```

**NEVER use `'use client'` directive** - Pages Router components are client-side by default. Adding it causes hydration errors.

## Development Workflows

### Running Locally (Use cmd, NOT PowerShell)

```cmd
npm run dev          # Start dev server (localhost:3000, may use 3001/3002 if ports busy)
npm run build        # Production build (~8s with caching)
npm start            # Run production server
npm run lint         # ESLint checks
```

### Data Refresh Workflow

**Option 1 - Admin UI (Recommended)**: Navigate to `/admin` page and click "Run Scraper" button

- Shows real-time progress with URL-by-URL updates
- Displays percentage complete and current status
- Uses Server-Sent Events (SSE) via `/api/scraper-stream`

**Option 2 - API Call**: `POST http://localhost:3002/api/scraper` (legacy, no progress)

**Option 3 - Direct Script** (cmd terminal):

```cmd
cd /d "path\to\ps-salary"
npx tsc scrape.ts --lib ES2015 --esModuleInterop --skipLibCheck
node scrape.js
```

**Scraper Progress System**:

- **API**: `GET /api/scraper-stream` - Server-Sent Events endpoint for real-time progress
- **Events**: `start` (total URLs), `progress` (current URL, percentage, status), `complete` (final stats), `error` (per-URL or fatal errors)
- **Client**: Uses EventSource in `admin.tsx` with event listeners for each event type
- **UI**: Progress bar, current URL display, status messages, URL counter (X of 28)

**Important**: Scraper detects serverless environments and skips file writes on Vercel/Lambda (read-only filesystem)

### Scraper Classification Detection

**AS Classifications** (Administrative Services): Uses salary-range inference when row labels missing

- AS-01: $48,000-$58,000 max salary
- AS-02: $58,000-$68,000
- AS-03: $68,000-$82,000
- AS-04: $82,000-$92,000
- AS-05: $98,000-$105,000
- AS-06: $108,000-$115,000
- AS-07: $118,000-$130,000
- AS-08: $130,000-$145,000

See `scrape.ts` lines 870-920 for salary-based classification inference logic.

### Debugging Classification Lookup

- Check `pages/api/[code]/index.ts` for prefix matching logic
- Function `findAllInKeys()` matches all codes starting with query
- Example: Query `as` returns `AS-01`, `AS-02`, `AS-03`, etc.

### Classification Code Patterns

**Total: 777 unique classification codes** in data.json with various formats (cleaned Oct 2025 - removed 33 duplicate base codes):

- **Standard XX-##**: Most common (e.g., `AS-01`, `CR-05`, `IT-03`)
- **Developmental suffix**: `AS-DEV` (developmental level)
- **Three-part GL codes**: `GL-XXX-##` (e.g., `GL-AIM-10`, `GL-AMW-1`, `GL-COI-9`)
- **Three-part CT codes**: `CT-XXX-##` (e.g., `CT-EAV-01`, `CT-FIN-02`, `CT-IAU-03`)
- **Three-part DA codes**: `DA-XXX-#` (e.g., `DA-CON-1`, `DA-PRO-5`)
- **Three-part EN codes**: `EN-XXX-##` (e.g., `EN-ENG-01`, `EN-SUR-02`)
- **Three-part HS codes**: `HS-XXX-##` (e.g., `HS-HDO-1`, `HS-PHS-07`)
- **Three-part ND codes**: `ND-XXX-#` (e.g., `ND-ADV-1`, `ND-DIT-2`, `ND-HME-3`)
- **Three-part NU codes**: `NU-XXX-#` (e.g., `NU-EMA-1`, `NU-HOS-2`)
- **Three-part OE codes**: `OE-XXX-#` (e.g., `OE-BEO-1`, `OE-CEO-2`, `OE-MEO-3`)
- **Three-part SO codes**: `SO-XXX-#` (e.g., `SO-FLP-1`, `SO-INS-1`, `SO-MAO-10`)
- **Three-part ST codes**: `ST-XXX-#` (e.g., `ST-COR-1`, `ST-OCE-2`, `ST-SCY-3`)
- **Three-part SW codes**: `SW-XXX-#` (e.g., `SW-CHA-1`, `SW-SCW-2`)
- **Three-part SG codes**: `SG-XXX-##` (e.g., `SG-PAT-01`, `SG-SRE-02`)
- **Three-part SE codes**: `SE-XXX-#` (e.g., `SE-REM-1`, `SE-RES-2`)
- **Three-part PO codes**: `PO-XXX-##` (e.g., `PO-IMA-01`, `PO-TCO-02`)
- **Three-part MD codes**: `MD-XXX-#` (e.g., `MD-MOF-1`, `MD-MSP-2`)
- **Three-part LES codes**: `LES-XX-##` (e.g., `LES-IM-01`, `LES-TO-02`)
- **Three-part ED codes**: `ED-XXX-##` (e.g., `ED-LAT-01`)
- **Base codes only**: `AIM`, `AMW`, `CO`, `COI`, `CT`, `DA`, `ED`, `EIM`, `ELE`, `EU`, `FR`, `GHW`, `HP`, `HS`, `II`, `INM`, `LI`, `LP`, `LS`, `MAM`, `MAN`, `MDO`, `MOC`, `MST`, `NP`, `NU`, `PCF`, `PIP`, `PM`, `PR`, `PRW`, `RCMP`, `SMW`, `SO`, `SR`, `ST`

**CRITICAL**: Always load classifications dynamically from `Object.keys(salaryData)` - NEVER use hardcoded arrays. This ensures UI displays all 777 codes including all variations and future additions.

## Project-Specific Conventions

### Code Style (Enforced Patterns)

**No semicolons** - React style without trailing semicolons
**JSX spacing**: `className={ value }` with spaces inside braces
**String quotes**: Single quotes `'text'` for consistency
**Button pattern**: `color='primary'`, `variant='solid'`, `startContent={ <Icon /> }`

```tsx
// Example button with icon (see all pages for pattern)
<Button
	as={NextLink}
	href='/path'
	color='primary'
	size='md'
	variant='solid'
	startContent={<Search className='w-4 h-4' />}>
	Button Text
</Button>
```

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

**Pages**: `index`, `search`, `equivalency`, `deployment`, `admin`
**Components**: AppShell, AppNavbar, Footer, Icons (15 icons), ThemeToggle, theme-provider
**API Routes**: Dynamic segments in `pages/api/[code]/`

**Layout Pattern** (CRITICAL):

- `_app.tsx` wraps ALL pages with `<AppShell>` (navbar + footer + container)
- Individual pages should **NEVER** import or use AppShell themselves
- Double-wrapping causes duplicate headings and layout issues

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
2. **Pages Router**: NO `'use client'` directives - causes hydration errors
3. **Hydration errors**: Always use mounted check for theme/client-only code + `suppressHydrationWarning` on Html/body
4. **AppShell wrapping**: Only in `_app.tsx`, never in individual pages
5. **API response format**: `/api/top` returns `{top: {...}, popular: [...]}` - must destructure correctly
6. **Uppercase codes**: API expects uppercase classification codes
7. **Legacy peer deps**: Required for all npm installs (`npm install --legacy-peer-deps`)
8. **Most recent rates**: Last element in array, not first (`rates[rates.length - 1]`)
9. **Terminal**: Use **cmd**, not PowerShell (PowerShell doesn't support `&&`)
10. **Console logs**: Removed in production by next.config.js compiler

## Key Files Reference

- `scrape.ts` - Data ingestion (1164 lines) with Unicode dash handling, exports URLS array, parseAppendixFromDocument, sortSalaryData
- `lib/api-cache.ts` - Client-side cache implementation (60-min TTL)
- `pages/equivalency.tsx` - Salary comparison tool (tolerance slider, 4 comparison types: top/min/max/average)
- `pages/deployment.tsx` - Treasury Board deployment eligibility calculator (inter-step increment rules)
- `pages/search.tsx` - Advanced search with dynamic classification dropdown (740+ codes from data.json, no hardcoded array)
- `pages/admin.tsx` - Scraper admin interface with real-time progress using EventSource and SSE
- `pages/api/scraper-stream.ts` - Server-Sent Events endpoint for streaming scraper progress
- `pages/_app.tsx` - App wrapper with ThemeProvider + HeroUIProvider + AppShell
- `pages/_document.tsx` - SSR document with `suppressHydrationWarning` on Html and body
- `components/Icons.tsx` - 15 SVG icon components (Sun, Moon, Upload, Search, Compare, Deploy, Settings, Home, Filter, External, etc.)
- `components/ThemeToggle.tsx` - Theme switcher with mounted state check (NO 'use client')
- `vercel.json` - Deployment config with caching headers (3600s max-age)
- `DEPLOYMENT.md` - Comprehensive deployment guide
- `data/data.json` - 777 classification codes including variations (AS-DEV, GL-XXX-##, CT-XXX-##, DA-XXX-#, EN-XXX-##, HS-XXX-##, etc.)

## When Adding Features

1. Check if data structure in `data.json` supports it
2. Add API endpoint in `pages/api/` if needed (remember uppercase codes)
3. Use `cachedFetch()` for client-side data fetching (NOT raw fetch)
4. Follow HeroUI component patterns from existing pages
5. Add custom icons to `components/Icons.tsx` if needed (15 existing icons as reference)
6. Follow code style: no semicolons, single quotes, `className={ }` spacing
7. Use `color='primary'` `variant='solid'` for buttons with `startContent` icons
8. Never wrap pages in AppShell (already in `_app.tsx`)
9. Never use `'use client'` directive (Pages Router, not App Router)
10. Update README.md with new functionality

## Recent Updates & Fixes

**Scraper Progress UI** (admin.tsx & scraper-stream.ts): Added real-time progress tracking with Server-Sent Events

- EventSource implementation for streaming progress updates
- Progress bar showing percentage, current URL, and status messages
- URL counter (X of 28) during scraping process
- Graceful error handling for individual URL failures

**AS Classification Fix** (scrape.ts lines 870-920): Added salary-range inference for AS-01, AS-02, AS-03 (previously missing)

**Theme System Fix**: Removed `'use client'` directives causing hydration errors, added `suppressHydrationWarning` to body tag

**API Response Fix**: Updated all pages to properly destructure `/api/top` response: `topResponse?.top || {}`

**Button Modernization**: All buttons now use `color='primary'`, `variant='solid'`, and appropriate icons from Icons.tsx

**Dynamic Classifications** (search.tsx): Replaced hardcoded 70-item classification array with dynamic loading from actual data (777 classifications including AS-DEV, GL-XXX-##, CT-XXX-##, etc.)

**Search Simplification**: Removed text search inputs from search.tsx and equivalency.tsx - now only dropdown classification family selector

**Base Code Parsing Fix** (Oct 2025): Removed 33 duplicate base classification codes (e.g., "EX", "DS", "PM") that were incorrectly parsed alongside their leveled versions (e.g., "EX-01", "DS-01", "PM-01"). Total count: 810 → 777. See PARSING_FIX_BASE_CODES.md for details.

**SC/STD Exclusion** (Oct 2025): Excluded 14 SC and STD classifications from salary statistics due to mixed rate types (monthly/annual/weekly/daily/hourly in same classification). Both pages/index.tsx and pages/api/top.ts now skip SC-_ and STD-_ codes.
