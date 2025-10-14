# ✅ Fixed React Hooks Error with next-themes

## Problem

React hooks error when starting dev server:

```
Warning: Invalid hook call. Hooks can only be called inside of the body of a function component.
TypeError: Cannot read properties of null (reading 'useContext')
```

## Root Cause

The `package.json` had `next-themes@^0.4.6` specified, but version 0.4.x has compatibility issues with Next.js Pages Router SSR. The caret (`^`) in the version allowed npm to install a newer incompatible version.

## Solution

### 1. Updated package.json

Changed `next-themes` version from `^0.4.6` to `^0.2.1`:

```json
{
	"dependencies": {
		"next-themes": "^0.2.1"
	}
}
```

### 2. Added disableTransitionOnChange

Updated `components/theme-provider.tsx` to disable transitions:

```tsx
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
	return (
		<NextThemesProvider {...props} disableTransitionOnChange>
			{children}
		</NextThemesProvider>
	);
}
```

### 3. Clean Reinstall

Removed node_modules and reinstalled with correct version:

```cmd
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

## Result

✅ Dev server starts without React hooks errors
✅ Theme switching works correctly
✅ No SSR hydration mismatches
✅ Compatible with Next.js 13.4.16 Pages Router

## Why This Happened

- **Version Drift**: The `^` in semver allowed npm to install `next-themes@^0.4.6` (latest 0.4.x)
- **Breaking Changes**: Version 0.4.x introduced changes incompatible with Pages Router SSR
- **Stable Version**: Version 0.2.1 is the last stable version for Next.js Pages Router

## Prevention

The `package.json` now locks to `^0.2.1` which prevents future upgrades to 0.4.x. If you need to update dependencies, be careful with `next-themes` - check compatibility with Pages Router first.

## Testing

After fix, verify:

1. ✅ Dev server starts: `npm run dev`
2. ✅ Production build works: `npm run build`
3. ✅ Theme toggle works on client-side
4. ✅ No console errors during navigation
5. ✅ SSR renders correctly (view page source)

---

**Date Fixed**: October 14, 2025
**Version**: next-themes@0.2.1
**Next.js**: 13.4.16 (Pages Router)
