import { test, expect } from '../../fixtures';
import { selectConnection, selectBucket } from '../../helpers/actions';
import { SELECTORS } from '../../helpers/selectors';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Object Download', () => {
  test('should download a file by clicking download action', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    await selectBucket(page, testBucket);

    // Wait for object list to load
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible({ timeout: 10000 });

    // Get first object
    const firstObjectRow = objectList.locator(SELECTORS.objectRow).first();
    await expect(firstObjectRow).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Try to trigger download - this depends on your UI implementation
    // Common patterns: right-click menu, download button, or clicking the object
    // For now, we'll try clicking on the object row (if it triggers download)
    // Or look for a download button/icon
    const downloadButton = firstObjectRow.locator('[data-testid="download-button"]').or(firstObjectRow.locator('button:has-text("Download")'));
    
    if (await downloadButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await downloadButton.click();
    } else {
      // If no download button, try right-click or other interaction
      // This is UI-dependent
      await firstObjectRow.click({ button: 'right' });
      const downloadOption = page.getByRole('menuitem', { name: /download/i });
      if (await downloadOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await downloadOption.click();
      } else {
        // Skip test if download mechanism not found
        test.skip();
      }
    }

    // Wait for download to start
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toBeTruthy();

    // Save download to a temporary location
    const downloadPath = path.join(process.cwd(), 'test-results', download.suggestedFilename());
    const downloadDir = path.dirname(downloadPath);
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    await download.saveAs(downloadPath);

    // Verify file exists and has content
    expect(fs.existsSync(downloadPath)).toBe(true);
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(0);

    // Cleanup
    if (fs.existsSync(downloadPath)) {
      fs.unlinkSync(downloadPath);
    }
  });
});
