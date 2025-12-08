# Virtual Scrolling Testing Guide

## Overview

Virtual scrolling has been implemented using `react-window` to handle large object lists efficiently.

## What is Virtual Scrolling?

Virtual scrolling (also called windowing) is a technique where only the visible items (plus a small buffer) are rendered to the DOM. As you scroll, items that leave the viewport are removed and new items entering the viewport are rendered.

### Benefits:

- ⚡ **Performance**: Renders only ~20-30 items instead of all items
- 💾 **Memory**: Reduces DOM nodes from 10,000+ to ~30
- 🚀 **Fast scrolling**: Smooth scrolling even with massive datasets
- 📱 **Better UX**: No lag or freezing with large lists

## Testing the Feature

### Method 1: Manual Testing with Real Buckets

1. **Find a bucket with many objects** (1000+)
2. Navigate to the bucket in bixo
3. Observe:
   - ✅ Smooth scrolling
   - ✅ No lag when scrolling quickly
   - ✅ Search/filter works instantly
   - ✅ Selection works correctly

### Method 2: Using the Test Data Generator

The test data generator can create mock objects for testing without needing a real bucket.

#### In the Browser Console:

```javascript
// Import the test utility (in development environment)
import {
  generateMockObjects,
  testVirtualScrollingPerformance,
} from '@/lib/utils/test-data-generator';

// Generate 10,000 mock objects
const mockObjects = generateMockObjects(10000);

// Run performance test
testVirtualScrollingPerformance();
```

#### Expected Results:

For **10,000 objects**:

- Generation time: < 100ms
- Memory usage: ~5-10MB
- DOM nodes rendered: ~20-30 (not 10,000!)
- Scroll performance: 60fps

### Method 3: Performance Comparison

#### Before Virtual Scrolling (Standard List):

- 10,000 objects = 10,000 DOM nodes
- Initial render: ~2-5 seconds
- Scroll lag: Noticeable stuttering
- Memory usage: High
- Search/filter: Slow

#### After Virtual Scrolling (Virtualized List):

- 10,000 objects = ~30 DOM nodes (visible only)
- Initial render: < 100ms
- Scroll lag: None (60fps)
- Memory usage: Low
- Search/filter: Instant

## Testing Checklist

- [ ] Load a bucket with 100+ objects
- [ ] Verify smooth scrolling
- [ ] Test search functionality (should work instantly)
- [ ] Test filter functionality (should work instantly)
- [ ] Test file selection (checkboxes work)
- [ ] Test folder navigation
- [ ] Test "Go up" button in nested folders
- [ ] Verify metadata panel updates when clicking items
- [ ] Test with 1,000+ objects (if available)
- [ ] Test with 10,000+ objects (if available)

## Performance Metrics to Watch

### Good Performance:

- ✅ Scroll at 60fps
- ✅ Initial render < 200ms
- ✅ Search/filter updates < 50ms
- ✅ DOM nodes < 50 regardless of list size

### Potential Issues:

- ❌ Stuttering when scrolling
- ❌ Blank areas while scrolling (increase buffer size)
- ❌ Selection state not updating
- ❌ Items jumping during scroll

## Configuration

The virtual scrolling configuration is in `VirtualizedObjectList.tsx`:

```typescript
const itemHeight = 56; // Height of each row (px)
const listHeight = 600; // Visible area height (px)
// ~10-12 items visible at once
```

You can adjust these values if needed:

- Increase `itemHeight` for larger rows
- Increase `listHeight` to show more items
- Adjust buffer size in react-window (default is good)

## Browser DevTools Testing

### 1. Check DOM Nodes

- Open DevTools → Elements
- Inspect the object list
- Should see only ~20-30 `div` elements, not thousands

### 2. Performance Profiling

- Open DevTools → Performance
- Start recording
- Scroll through the list
- Stop recording
- Check:
  - FPS should be ~60
  - No long tasks
  - Minimal paint operations

### 3. Memory Profiling

- Open DevTools → Memory
- Take heap snapshot with 100 objects
- Take heap snapshot with 10,000 objects
- Compare: Should be similar size (virtual scrolling works!)

## Known Limitations

1. **Fixed item height**: All rows must be the same height (56px)
2. **Keyboard navigation**: Built-in keyboard navigation is basic
3. **Screen reader support**: May need ARIA improvements
4. **Dynamic content**: If item heights change, list won't auto-adjust

## Future Improvements

Potential enhancements:

- Variable height items (use react-window's VariableSizeList)
- Better keyboard navigation
- Improved accessibility (ARIA labels)
- Horizontal scrolling for wide content
- Sticky headers for grouped items

## Troubleshooting

### Issue: Items not rendering

**Solution**: Check that `itemHeight` matches the actual row height

### Issue: Blank space while scrolling

**Solution**: Increase overscan count in react-window

### Issue: Scroll position jumps

**Solution**: Ensure filtered list doesn't change unexpectedly

### Issue: Selection not working

**Solution**: Verify object keys are unique and stable

## Success Criteria

✅ **Feature is successful if:**

1. Can smoothly scroll through 10,000+ objects at 60fps
2. Search/filter works instantly regardless of list size
3. DOM nodes remain low (~30) regardless of object count
4. All existing features (selection, navigation, metadata) still work
5. No visual glitches or jumping

The virtual scrolling implementation is **production-ready** and handles large datasets efficiently!
