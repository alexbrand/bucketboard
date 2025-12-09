import { Page, expect } from '@playwright/test';
import { SELECTORS } from './selectors';

/**
 * Asserts that a bucket appears in the bucket list
 */
export async function expectBucketVisible(page: Page, bucketName: string): Promise<void> {
  const bucketList = page.locator(SELECTORS.bucketList);
  await expect(bucketList).toBeVisible();
  
  const bucketButton = bucketList.locator('button').filter({ hasText: bucketName });
  await expect(bucketButton).toBeVisible();
}

/**
 * Asserts that an object appears in the object list
 */
export async function expectObjectVisible(page: Page, objectKey: string): Promise<void> {
  const objectList = page.locator(SELECTORS.objectList);
  await expect(objectList).toBeVisible();
  
  // Object key might be displayed as full path or just filename
  const objectRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: new RegExp(objectKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  await expect(objectRow).toBeVisible();
}

/**
 * Asserts the number of visible objects in the list
 */
export async function expectObjectCount(page: Page, count: number): Promise<void> {
  const objectList = page.locator(SELECTORS.objectList);
  await expect(objectList).toBeVisible();
  
  const objectRows = objectList.locator(SELECTORS.objectRow);
  await expect(objectRows).toHaveCount(count);
}

/**
 * Asserts that the breadcrumb shows the expected path
 */
export async function expectBreadcrumb(page: Page, path: string[]): Promise<void> {
  const breadcrumb = page.locator(SELECTORS.breadcrumb);
  await expect(breadcrumb).toBeVisible();
  
  // Check each breadcrumb item
  for (let i = 0; i < path.length; i++) {
    const breadcrumbItems = breadcrumb.locator(SELECTORS.breadcrumbItem);
    const item = breadcrumbItems.nth(i);
    await expect(item).toContainText(path[i]);
  }
}

/**
 * Asserts that an empty state message is shown
 */
export async function expectEmptyState(page: Page): Promise<void> {
  const emptyBucket = page.locator(SELECTORS.emptyBucketMessage);
  const emptyFolder = page.locator(SELECTORS.emptyFolderMessage);
  
  // Either empty bucket or empty folder message should be visible
  const isBucketEmpty = await emptyBucket.isVisible().catch(() => false);
  const isFolderEmpty = await emptyFolder.isVisible().catch(() => false);
  
  expect(isBucketEmpty || isFolderEmpty).toBe(true);
}

/**
 * Asserts that the connection selector is visible and has loaded connections
 */
export async function expectConnectionsLoaded(page: Page): Promise<void> {
  const connectionSelector = page.locator(SELECTORS.connectionSelector);
  await expect(connectionSelector).toBeVisible();
  
  const selectTrigger = connectionSelector.locator('button[role="combobox"]');
  await expect(selectTrigger).toBeVisible();
  
  // Open dropdown to check connections are loaded
  await selectTrigger.click();
  
  const dropdown = page.locator(SELECTORS.connectionDropdown);
  await expect(dropdown).toBeVisible();
  
  const options = dropdown.locator(SELECTORS.connectionOption);
  await expect(options.first()).toBeVisible({ timeout: 5000 });
  
  // Close dropdown
  await page.keyboard.press('Escape');
}
