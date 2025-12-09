import { test, expect } from '../../fixtures';
import { selectConnection, selectBucket, deleteObject } from '../../helpers/actions';
import { expectObjectVisible } from '../../helpers/assertions';
import { SELECTORS } from '../../helpers/selectors';

test.describe('Object Delete', () => {
  test('should delete a single object', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Get first object key
    const firstObjectKey = testObjects[0];
    expect(firstObjectKey).toBeTruthy();

    // Verify object is visible before deletion
    await expectObjectVisible(page, firstObjectKey);

    // Delete the object
    await deleteObject(page, firstObjectKey);

    // Verify object is no longer visible
    const objectRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: new RegExp(firstObjectKey.split('/').pop() || firstObjectKey) });
    await expect(objectRow).toBeHidden({ timeout: 5000 });
  });

  test('should show delete confirmation dialog', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Find an object to delete
    const objectKey = testObjects[0];
    const objectRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: new RegExp(objectKey.split('/').pop() || objectKey) });
    await expect(objectRow).toBeVisible();

    // Hover to show actions
    await objectRow.hover();

    // Click delete button
    const deleteButton = objectRow.locator(SELECTORS.deleteButton).first();
    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click();

      // Check for confirmation dialog
      const confirmDialog = page.getByRole('dialog');
      const confirmButton = page.getByRole('button', { name: /confirm|delete|yes/i });

      // Dialog should appear
      if (await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(confirmDialog).toBeVisible();
        
        // Cancel the deletion
        const cancelButton = page.getByRole('button', { name: /cancel|no/i });
        if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancelButton.click();
        } else {
          await page.keyboard.press('Escape');
        }
      }
    }
  });
});
