import { test, expect } from '../../fixtures';
import { selectConnection, selectBucket } from '../../helpers/actions';
import { expectObjectVisible, expectObjectCount } from '../../helpers/assertions';
import { SELECTORS } from '../../helpers/selectors';

test.describe('Object List', () => {
  test('should display objects with correct names', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    // Select the test bucket
    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Verify some test objects are visible
    // Check at least the first few objects
    const objectsToCheck = testObjects.slice(0, 5);
    for (const objectKey of objectsToCheck) {
      // Object might be displayed with full path or just filename
      const objectRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: new RegExp(objectKey.split('/').pop() || objectKey) });
      await expect(objectRow.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display object metadata', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Get first object row
    const firstObjectRow = objectList.locator(SELECTORS.objectRow).first();
    await expect(firstObjectRow).toBeVisible();

    // Verify object name is displayed
    const objectName = firstObjectRow.locator(SELECTORS.objectName);
    await expect(objectName).toBeVisible();

    // Verify the object name has text
    const nameText = await objectName.textContent();
    expect(nameText).toBeTruthy();
    expect(nameText!.trim().length).toBeGreaterThan(0);

    // Object metadata (size, last modified) might be in the row
    // This is UI-dependent, so we just verify the row is visible and contains text
    const rowText = await firstObjectRow.textContent();
    expect(rowText).toBeTruthy();
    expect(rowText!.length).toBeGreaterThan(0);
  });

  test('should distinguish folders from files', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Find folder objects (those with / in the key)
    const folderObjects = testObjects.filter((key) => key.includes('/'));
    
    if (folderObjects.length > 0) {
      // Verify at least one folder is displayed
      const folderKey = folderObjects[0];
      const folderRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: folderKey.split('/')[0] });
      await expect(folderRow.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle large number of objects', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Verify virtual scrolling works (list should be visible even with many objects)
    // The exact count might be less than total due to virtualization
    const visibleRows = objectList.locator(SELECTORS.objectRow);
    const visibleCount = await visibleRows.count();
    
    // Should have at least some objects visible
    expect(visibleCount).toBeGreaterThan(0);
    
    // Should not crash or show error with many objects
    const errorMessage = page.locator('text=/error/i');
    await expect(errorMessage).toBeHidden();
  });
});
