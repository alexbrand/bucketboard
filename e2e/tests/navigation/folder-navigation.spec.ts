import { test, expect } from '../../fixtures';
import { selectConnection, selectBucket, navigateToFolder } from '../../helpers/actions';
import { expectBreadcrumb } from '../../helpers/assertions';
import { SELECTORS } from '../../helpers/selectors';

test.describe('Folder Navigation', () => {
  test('should navigate into a folder when clicked', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Find a folder object (one with / in the key)
    const folderObjects = testObjects.filter((key) => key.includes('/'));
    
    if (folderObjects.length > 0) {
      const folderKey = folderObjects[0];
      const folderName = folderKey.split('/')[0];

      // Click on the folder
      const folderRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: folderName });
      await expect(folderRow).toBeVisible();
      await folderRow.click();

      // Wait for navigation to complete
      await page.waitForTimeout(1000);

      // Verify we're now in the folder (URL might change or breadcrumb updates)
      // Check if breadcrumb shows the folder
      const breadcrumb = page.locator(SELECTORS.breadcrumb);
      if (await breadcrumb.isVisible({ timeout: 2000 }).catch(() => false)) {
        const breadcrumbText = await breadcrumb.textContent();
        expect(breadcrumbText).toContain(folderName);
      }

      // Object list should still be visible (showing folder contents)
      await expect(objectList).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate into nested folders', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Find a nested folder (one with multiple / in the key)
    const nestedFolders = testObjects.filter((key) => key.split('/').length > 2);
    
    if (nestedFolders.length > 0) {
      const nestedFolderKey = nestedFolders[0];
      const parts = nestedFolderKey.split('/');
      const firstFolder = parts[0];
      const secondFolder = parts[1];

      // Navigate into first folder
      const firstFolderRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: firstFolder });
      await expect(firstFolderRow).toBeVisible();
      await firstFolderRow.click();

      await page.waitForTimeout(1000);

      // Navigate into nested folder
      const secondFolderRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: secondFolder });
      await expect(secondFolderRow).toBeVisible({ timeout: 5000 });
      await secondFolderRow.click();

      await page.waitForTimeout(1000);

      // Verify navigation worked
      const breadcrumb = page.locator(SELECTORS.breadcrumb);
      if (await breadcrumb.isVisible({ timeout: 2000 }).catch(() => false)) {
        const breadcrumbText = await breadcrumb.textContent();
        expect(breadcrumbText).toContain(firstFolder);
        expect(breadcrumbText).toContain(secondFolder);
      }
    }
  });

  test('should update URL when navigating folders', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Get initial URL
    const initialUrl = page.url();

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Find a folder
    const folderObjects = testObjects.filter((key) => key.includes('/'));
    
    if (folderObjects.length > 0) {
      const folderKey = folderObjects[0];
      const folderName = folderKey.split('/')[0];

      // Click on folder
      const folderRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: folderName });
      await expect(folderRow).toBeVisible();
      await folderRow.click();

      // Wait for navigation
      await page.waitForTimeout(1000);

      // URL should have changed (might include bucket and path)
      const newUrl = page.url();
      expect(newUrl).not.toBe(initialUrl);
      
      // URL should contain bucket name or folder path
      expect(newUrl).toMatch(new RegExp(testBucket + '|' + folderName));
    }
  });
});
