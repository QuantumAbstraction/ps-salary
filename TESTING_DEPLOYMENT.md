# Testing the Deployment Page

## Quick Access

The deployment page is now live and accessible at:

- **Development:** `http://localhost:3003/deployment`
- **Production:** `https://your-domain.vercel.app/deployment` (after deployment)

## Navigation Routes to Access

1. **Main Navigation Bar** (Desktop & Mobile)

   - Click "Deployment" in the top navigation

2. **From Equivalency Page**

   - Go to `/equivalency`
   - Click "Check Deployment" button in the header

3. **Direct URL**
   - Type `/deployment` in the browser

## Test Cases

### Test Case 1: AS-04 → EC-03 (Should be Deployable)

**Steps:**

1. Select "AS-04" from the "From Classification" dropdown
2. Select "EC-03" from the "To Classification" dropdown
3. Click "Check Eligibility" button

**Expected Result:**

- ✓ Green checkmark with "Deployment Allowed" message
- AS-04 Maximum Salary: $87,108
- EC-03 Maximum Salary: $87,907
- Salary Difference: +$799
- Minimum Step Increment (AS-04): $3,063
- Decision: ALLOWED (because 799 < 3,063)

### Test Case 2: CS-01 → CS-02 (Test with real data)

**Steps:**

1. Select "CS-01" from the "From Classification" dropdown
2. Select "CS-02" from the "To Classification" dropdown
3. Click "Check Eligibility" button

**Expected Result:**

- Check if the salary difference is less than the minimum step increment in CS-01
- Result will show either deployable (green) or not deployable (red)

### Test Case 3: PM-01 → PM-06 (Likely Not Deployable)

**Steps:**

1. Select "PM-01" from the "From Classification" dropdown
2. Select "PM-06" from the "To Classification" dropdown
3. Click "Check Eligibility" button

**Expected Result:**

- ✗ Red X with "Deployment Not Allowed" message
- Large salary difference should exceed minimum increment

### Test Case 4: Invalid Selection

**Steps:**

1. Select "AS-04" from the "From Classification" dropdown
2. Do NOT select a "To Classification"
3. Try to click "Check Eligibility" button

**Expected Result:**

- Button remains disabled (grayed out)
- Cannot click until both selections are made

## Visual Checks

### Desktop View (1920x1080)

- [ ] Navigation bar shows "Deployment" link
- [ ] Header card displays properly with chip and title
- [ ] Selection dropdowns are side-by-side
- [ ] Results card fills width appropriately
- [ ] Details table is readable
- [ ] Explanation section is well-formatted

### Mobile View (375x667)

- [ ] Navigation menu includes "Deployment" link
- [ ] Header is responsive
- [ ] Dropdowns stack vertically
- [ ] Button is full width on mobile
- [ ] Results card is scrollable if needed
- [ ] Table is horizontally scrollable

### Theme Switching

- [ ] Toggle dark/light mode
- [ ] All text remains readable
- [ ] Color-coded results maintain contrast
- [ ] Borders and backgrounds adjust properly
- [ ] No flash of unstyled content (FOUC)

## Feature Checks

### Autocomplete Functionality

- [ ] Dropdown shows all 100+ classifications
- [ ] Can type to filter classifications
- [ ] Can scroll through list
- [ ] Selection highlights properly
- [ ] Can clear and reselect

### Calculation Accuracy

- [ ] Results appear within 300ms
- [ ] Currency formatting is correct ($XX,XXX)
- [ ] Step counts are accurate
- [ ] Min increment calculation is correct
- [ ] Deployment decision matches formula

### User Feedback

- [ ] Loading spinner appears during data fetch
- [ ] "Calculating..." text shows during calculation
- [ ] Success/danger colors are appropriate
- [ ] Explanation text is clear and helpful
- [ ] No console errors in browser

## Cross-Navigation Checks

### From Deployment Page

- [ ] "Compare Equivalencies" button links to `/equivalency`
- [ ] Navigation bar links work (Home, Search, Equivalency)
- [ ] Logo links back to home page
- [ ] Admin button links to `/admin`

### To Deployment Page

- [ ] From home page navigation
- [ ] From equivalency page "Check Deployment" button
- [ ] From search page navigation
- [ ] Direct URL access

## Performance Checks

### Initial Load

- [ ] Page loads in under 2 seconds
- [ ] No layout shift during render
- [ ] Data fetches complete quickly
- [ ] Spinner shows while loading

### Interaction Speed

- [ ] Dropdown opens instantly
- [ ] Selection updates immediately
- [ ] Calculation completes in <300ms
- [ ] Button states change responsively

### Caching

- [ ] Second visit to page loads from cache
- [ ] Data doesn't refetch unnecessarily
- [ ] 60-minute cache works as expected

## Browser Compatibility

Test in multiple browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile browsers (iOS Safari, Chrome)

## Accessibility Checks

### Keyboard Navigation

- [ ] Tab key navigates through elements
- [ ] Enter key selects from dropdown
- [ ] Space key activates button
- [ ] Escape key closes dropdowns

### Screen Reader

- [ ] Labels are properly announced
- [ ] Button states are clear
- [ ] Table data is readable
- [ ] Error messages are announced

### Visual Accessibility

- [ ] Color contrast meets WCAG standards
- [ ] Text size is readable
- [ ] Interactive elements are large enough (44x44px minimum)
- [ ] Focus indicators are visible

## Edge Cases

### Single-Step Classifications

Some classifications may have only one step:

- [ ] Calculation handles single-step gracefully
- [ ] Shows appropriate message
- [ ] Doesn't divide by zero or error

### Missing Data

- [ ] Handles classifications with no data
- [ ] Shows error message if data fetch fails
- [ ] Graceful degradation if API is down

### Same Classification

- [ ] Can select same code for both (AS-04 → AS-04)
- [ ] Shows appropriate result (usually deployable)
- [ ] No calculation errors

## Common Issues to Watch For

### Theme Hydration Errors

**Symptom:** Console warning about hydration mismatch
**Check:** No warnings in browser console

### API Cache Stale Data

**Symptom:** Old salary data showing
**Solution:** Clear cache or wait 60 minutes

### Dropdown Not Populating

**Symptom:** Empty dropdowns
**Check:** Network tab shows successful `/api/data` call

### Button Not Enabling

**Symptom:** Button stays disabled
**Check:** Both dropdowns have valid selections

## Success Criteria

✅ **The deployment page is working correctly if:**

1. All navigation links reach the page
2. Dropdowns populate with classifications
3. Calculations complete successfully
4. Results display with correct formatting
5. Green/red colors indicate deployment eligibility
6. Details table shows all metrics
7. Theme switching works without errors
8. No console errors or warnings
9. Page is responsive on all screen sizes
10. Performance is smooth and fast

## Reporting Issues

If you find any issues:

1. **Check browser console** for error messages
2. **Note the specific test case** that failed
3. **Screenshot the issue** if visual
4. **Record browser and screen size** if layout-related
5. **Document steps to reproduce**

## Next Steps After Testing

Once testing is complete:

1. ✅ Commit changes to git
2. ✅ Push to main branch
3. ✅ Verify Vercel deployment
4. ✅ Test on production URL
5. ✅ Update team documentation
6. ✅ Share with stakeholders

## Quick Reference

**Math Formula:**

```
|MaxSalary(To) - MaxSalary(From)| < MinIncrement(From) = Deployable
```

**Example Result Format:**

```
AS-04 → EC-03
✓ Deployment Allowed
Difference: $799 < Min Increment: $3,063
```

**Navigation Path:**

```
Home → Deployment
Equivalency → Check Deployment → Deployment
```

---

**Testing Status:** Ready to test
**Documentation:** See DEPLOYMENT_ELIGIBILITY.md for mathematical background
**Support:** Check project README.md for general information
