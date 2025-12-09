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
    const fileName = objectKey.split('/').pop() || objectKey;
    const objectRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: new RegExp(fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
    await expect(objectRow).toBeVisible();

    // Click the checkbox to select the object
    const checkbox = objectRow.locator('input[type="checkbox"]').or(objectRow.locator('[role="checkbox"]'));
    await expect(checkbox).toBeVisible();
    await checkbox.click();

    // Wait for the delete button to appear in the toolbar
    const deleteButton = page.locator(SELECTORS.deleteButton);
    await expect(deleteButton).toBeVisible({ timeout: 5000 });

    // Set up dialog handler BEFORE clicking delete button to cancel the deletion
    let dialogHandled = false;
    page.once('dialog', async (dialog) => {
      dialogHandled = true;
      if (dialog.type() === 'confirm') {
        // Verify the dialog message
        const message = dialog.message();
        expect(message.toLowerCase()).toContain('delete');
        // Cancel the deletion
        await dialog.dismiss();
      }
    });

    // Click the delete button (this will trigger the confirm dialog)
    await deleteButton.click();

    // Wait a moment for dialog to be handled
    await page.waitForTimeout(500);
    
    // Verify dialog was shown
    expect(dialogHandled).toBe(true);

    // Verify object is still visible (deletion was cancelled)
    await expect(objectRow).toBeVisible();
  });
});
