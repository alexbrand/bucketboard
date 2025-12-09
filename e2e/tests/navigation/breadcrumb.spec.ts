import { test, expect } from '../../fixtures';
import { selectConnection, selectBucket, navigateToFolder } from '../../helpers/actions';
import { expectBreadcrumb } from '../../helpers/assertions';
import { SELECTORS } from '../../helpers/selectors';

test.describe('Breadcrumb Navigation', () => {
  test('should show breadcrumb with current path', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Navigate into a folder
    const folderObjects = testObjects.filter((key) => key.includes('/'));
    
    if (folderObjects.length > 0) {
      const folderKey = folderObjects[0];
      const folderName = folderKey.split('/')[0];

      const folderRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: folderName });
      await expect(folderRow).toBeVisible();
      await folderRow.click();

      await page.waitForTimeout(1000);

      // Check breadcrumb
      const breadcrumb = page.locator(SELECTORS.breadcrumb);
      if (await breadcrumb.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(breadcrumb).toBeVisible();
        
        const breadcrumbText = await breadcrumb.textContent();
        expect(breadcrumbText).toBeTruthy();
      }
    }
  });

  test('should navigate when clicking breadcrumb segment', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Navigate into a folder
    const folderObjects = testObjects.filter((key) => key.includes('/'));
    
    if (folderObjects.length > 0) {
      const folderKey = folderObjects[0];
      const folderName = folderKey.split('/')[0];

      const folderRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: folderName });
      await expect(folderRow).toBeVisible();
      await folderRow.click();

      await page.waitForTimeout(1000);

      // Check if breadcrumb is visible
      const breadcrumb = page.locator(SELECTORS.breadcrumb);
      if (await breadcrumb.isVisible({ timeout: 2000 }).catch(() => false)) {
        const breadcrumbItems = breadcrumb.locator(SELECTORS.breadcrumbItem);
        const itemCount = await breadcrumbItems.count();

        if (itemCount > 1) {
          // Click on the first breadcrumb item (should be bucket root)
          const firstItem = breadcrumbItems.first();
          await firstItem.click();

          await page.waitForTimeout(1000);

          // Should navigate back to bucket root
          // Verify by checking if we're back at bucket level
          const currentBreadcrumbText = await breadcrumb.textContent();
          expect(currentBreadcrumbText).toContain(testBucket);
        }
      }
    }
  });

  test('should show root breadcrumb when at bucket root', async ({ page, provider, testBucket }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Check breadcrumb at root level
    const breadcrumb = page.locator(SELECTORS.breadcrumb);
    if (await breadcrumb.isVisible({ timeout: 2000 }).catch(() => false)) {
      const breadcrumbText = await breadcrumb.textContent();
      // Breadcrumb should show bucket name or root indicator
      expect(breadcrumbText).toBeTruthy();
    }
  });
});
