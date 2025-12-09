import { test, expect } from '../../fixtures';
import { selectConnection, selectBucket, openMetadataPanel } from '../../helpers/actions';
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

    // Find a file object (not a folder)
    const fileObjects = testObjects.filter((key) => !key.includes('/') || key.split('/').length === 1);
    if (fileObjects.length === 0) {
      test.skip('No file objects available for download test');
      return;
    }

    const fileObjectKey = fileObjects[0];
    const fileName = fileObjectKey.split('/').pop() || fileObjectKey;

    // Set up download listener BEFORE clicking
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

    // Click on the object to open the metadata panel
    await openMetadataPanel(page, fileObjectKey);

    // Wait for metadata panel to be visible
    const metadataPanel = page.locator(SELECTORS.metadataPanel);
    await expect(metadataPanel).toBeVisible({ timeout: 5000 });

    // Find and click the download button in the metadata panel
    const downloadButton = metadataPanel.locator('[data-testid="download-button"]');
    await expect(downloadButton).toBeVisible({ timeout: 5000 });
    await downloadButton.click();

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
