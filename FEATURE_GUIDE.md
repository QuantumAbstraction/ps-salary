# New Feature Guide: Classification Type Filtering

## Overview

The PS Salary application now distinguishes between **Collective Agreement** and **Unrepresented/Excluded Employee** classifications with visual badges and filtering capabilities.

## Where to Find It

### 1. Search Page (`/search`)

**URL**: `http://localhost:3000/search`

**New Features**:

- **Classification Type Dropdown**: Located at the top of the filter card

  - Options: "All Classifications", "Collective Agreements", "Unrepresented/Excluded Employees"
  - Filters the classification family dropdown and results

- **Source Badges**: Each classification card shows its source
  - 🟢 Gray badge: "Collective Agreement"
  - 🟠 Orange badge: "Unrepresented Senior Excluded Employee"

**How to Use**:

1. Select a classification type from the dropdown
2. The classification family dropdown will update to show only that type
3. Results will display with color-coded source badges
4. Combine with other filters (salary range, steps) for advanced search

### 2. Equivalency Page (`/equivalency`)

**URL**: `http://localhost:3000/equivalency`

**New Features**:

- **Classification Type Dropdown**: First dropdown in the filter section

  - Same options as search page
  - Filters available classifications in reference dropdown

- **Source Badges**: Each equivalent classification shows:
  - Small dot-style badge with "Unrepresented" (orange) or "Collective" (gray)
  - Positioned next to the classification code chip

**How to Use**:

1. Select classification type to narrow your search
2. Choose a reference classification
3. View equivalent classifications with their source type clearly marked
4. Compare salaries across collective and unrepresented groups

## Visual Indicators

### Badge Colors

- **Orange/Warning**: Unrepresented Senior Excluded Employee
- **Gray/Default**: Collective Agreement

### Badge Styles

- **Search Page**: Full-width flat badges with complete text

  - "Collective Agreement"
  - "Unrepresented Senior Excluded Employee"

- **Equivalency Page**: Compact dot-style badges
  - "Collective"
  - "Unrepresented"

## Data Statistics

### Current Dataset (as of October 14, 2025)

- **Total Classifications**: 811
- **Collective Agreements**: 732 (90.3%)
- **Unrepresented/Excluded**: 71 (8.8%)
- **Conflict Resolutions**: 8 codes with `-EXCLUDED` suffix

### Examples of Each Type

**Collective Agreement Classifications**:

- AS-01, AS-02, AS-03, AS-04, AS-05, AS-06
- CS-01, CS-02, CS-03, CS-04, CS-05
- PM-01, PM-02, PM-03, PM-04, PM-05, PM-06
- EC-01 through EC-08
- IT-01 through IT-05

**Unrepresented Classifications**:

- AS-07-EXCLUDED, AS-08-EXCLUDED (senior AS levels)
- EX-01 through EX-06 (Executive group)
- CO-RCMP-01 through CO-RCMP-06 (RCMP Commissioned Officers)
- CX-03-EXCLUDED, CX-04 (Correctional Services supervisory)
- MD-01 through MD-06 (Medicine group)

### Conflict Resolution Examples

When a classification exists in both collective agreements and unrepresented data:

- **Collective version**: `AS-07` (from collective agreement)
- **Unrepresented version**: `AS-07-EXCLUDED` (from unrepresented data)

## Use Cases

### 1. Find All Executive Salaries

1. Go to Search page
2. Select "Unrepresented/Excluded Employees" from Classification Type
3. Type "EX" in Classification Family
4. View EX-01 through EX-06 with their salary ranges

### 2. Compare Collective vs Unrepresented AS Levels

1. Go to Search page
2. Select "All Classifications"
3. Type "AS" in Classification Family
4. See both:
   - AS-01 through AS-06 (Collective - gray badges)
   - AS-07-EXCLUDED, AS-08-EXCLUDED (Unrepresented - orange badges)

### 3. Find RCMP Officer Salaries

1. Go to Search page
2. Select "Unrepresented/Excluded Employees"
3. Type "CO-RCMP" in Classification Family
4. View all 6 ranks from Inspector to Deputy Commissioner

### 4. Find Equivalent Salaries Across Types

1. Go to Equivalency page
2. Select "All Classifications" to compare across both types
3. Choose an Executive classification (e.g., EX-02)
4. View equivalent collective agreement classifications
5. Source badges show which type each equivalent is

## Technical Details

### How It Works

1. **Source Detection**: Each classification has `_source` metadata in `data.json`
2. **URL Pattern**: Unrepresented classifications have URLs containing `unrepresented`
3. **Filter Function**: `filterByType()` in `lib/classification-filter.ts`
4. **Badge Display**: `getSourceDescription()` provides human-readable text

### API Behavior

- API endpoints (`/api/data`, `/api/top`) return all classifications
- Client-side filtering happens in the UI
- Source metadata (`_source`) is preserved in API responses
- Conflict codes with `-EXCLUDED` suffix are treated as separate entries

## Future Enhancements (Not Yet Implemented)

- Index page classification filter
- Deployment calculator type filter
- Dedicated `/api/unrepresented` endpoint
- Search by source URL
- Source type statistics dashboard

## Testing the Feature

### Quick Test Steps

1. **Start server**: `npm run dev`
2. **Open browser**: Navigate to `http://localhost:3000`
3. **Go to Search**: Click "Advanced Search" or navigate to `/search`
4. **Test Type Filter**:
   - Select "Collective Agreements" - should show ~732 classifications
   - Select "Unrepresented/Excluded" - should show ~71 classifications
   - Select "All Classifications" - should show all 811
5. **Verify Badges**: Check that badges show correct source type
6. **Test Equivalency**: Go to `/equivalency` and verify filter works there too

### Known Issues

- None currently identified
- SRW page not scraped (1 collective agreement page with unique structure)

## Support

For questions or issues with the filtering feature, refer to:

- `UNREPRESENTED_INTEGRATION_SUMMARY.md` - Technical implementation details
- `lib/classification-filter.ts` - Source code for filtering logic
- `.github/copilot-instructions.md` - Project conventions and patterns
