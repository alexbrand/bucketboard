import { Page, expect } from '@playwright/test';
import { SELECTORS } from './selectors';

/**
 * Maps connection IDs to their display names
 */
const CONNECTION_NAMES: Record<string, string> = {
  'localstack-s3': 'LocalStack S3',
  'azurite-blob': 'Azurite Blob Storage',
  'fake-gcs': 'Fake GCS Server',
};

/**
 * Selects a connection from the connection dropdown
 */
export async function selectConnection(page: Page, connectionId: string): Promise<void> {
  const connectionSelector = page.locator(SELECTORS.connectionSelector);
  await expect(connectionSelector).toBeVisible();

  const selectTrigger = connectionSelector.locator('button[role="combobox"]');
  await selectTrigger.click();

  const dropdown = page.locator(SELECTORS.connectionDropdown);
  await expect(dropdown).toBeVisible();

  // Find and click the option with the matching connection name or ID
  // The UI displays connection names, not IDs
  const connectionName = CONNECTION_NAMES[connectionId] || connectionId;
  const option = dropdown.locator(SELECTORS.connectionOption).filter({ hasText: new RegExp(connectionName, 'i') });
  await expect(option).toBeVisible({ timeout: 10000 });
  await option.click();

  // Wait for dropdown to close
  await expect(dropdown).toBeHidden();
}

/**
 * Selects a bucket from the bucket list
 */
export async function selectBucket(page: Page, bucketName: string): Promise<void> {
  const bucketList = page.locator(SELECTORS.bucketList);
  await expect(bucketList).toBeVisible();

  // Find the bucket button by text content
  const bucketButton = bucketList.locator('button').filter({ hasText: bucketName });
  await expect(bucketButton).toBeVisible();
  await bucketButton.click();

  // Wait for bucket to be selected (toolbar should appear)
  const toolbar = page.locator(SELECTORS.bucketToolbar);
  await expect(toolbar).toBeVisible({ timeout: 10000 });
}

/**
 * Navigates into a folder by clicking on it
 */
export async function navigateToFolder(page: Page, folderPath: string): Promise<void> {
  // folderPath can be like "folder-01" or "folder-01/nested-02"
  const parts = folderPath.split('/');
  
  for (const part of parts) {
    const objectList = page.locator(SELECTORS.objectList);
    await expect(objectList).toBeVisible();

    // Find folder by name (folders typically end with / or are displayed differently)
    const folderRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: part });
    await expect(folderRow).toBeVisible();
    await folderRow.click();

    // Wait for navigation to complete
    await page.waitForTimeout(500); // Small delay for navigation
  }
}

/**
 * Uploads a file via the UI
 */
export async function uploadFile(page: Page, filePath: string): Promise<void> {
  const uploadButton = page.locator(SELECTORS.uploadButton);
  await expect(uploadButton).toBeVisible();
  
  // Set up file input handler
  const fileInput = page.locator('input[type="file"]');
  
  // Click upload button (this should trigger file input)
  await uploadButton.click();
  
  // Wait for file input to be available and set the file
  await fileInput.setInputFiles(filePath);
  
  // Wait for upload to complete (you may need to adjust this based on your UI)
  await page.waitForTimeout(1000);
}

/**
 * Deletes an object via the UI
 * Requires selecting the checkbox first, then clicking the delete button in the toolbar
 */
export async function deleteObject(page: Page, objectKey: string): Promise<void> {
  // Find the object row
  const objectList = page.locator(SELECTORS.objectList);
  await expect(objectList).toBeVisible();

  // Find the object row - match by the filename (last part of the key)
  const fileName = objectKey.split('/').pop() || objectKey;
  const objectRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: new RegExp(fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  await expect(objectRow).toBeVisible();

  // Click the checkbox in the object row to select it
  const checkbox = objectRow.locator('input[type="checkbox"]').or(objectRow.locator('[role="checkbox"]'));
  await expect(checkbox).toBeVisible();
  await checkbox.click();

  // Wait for the delete button to appear in the toolbar
  const deleteButton = page.locator(SELECTORS.deleteButton);
  await expect(deleteButton).toBeVisible({ timeout: 5000 });

  // Set up dialog handler BEFORE clicking delete button
  // The page uses window.confirm, so we need to handle it via page.on('dialog')
  page.once('dialog', async (dialog) => {
    if (dialog.type() === 'confirm') {
      await dialog.accept();
    }
  });

  // Click the delete button (this will trigger the confirm dialog)
  await deleteButton.click();

  // Wait for object to disappear
  await expect(objectRow).toBeHidden({ timeout: 5000 });
}

/**
 * Opens the metadata panel for an object
 */
export async function openMetadataPanel(page: Page, objectKey: string): Promise<void> {
  const objectList = page.locator(SELECTORS.objectList);
  await expect(objectList).toBeVisible();

  // Find the object row by filename (last part of the key)
  const fileName = objectKey.split('/').pop() || objectKey;
  const objectRow = objectList.locator(SELECTORS.objectRow).filter({ hasText: new RegExp(fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  await expect(objectRow).toBeVisible();

  // Click on the object name or the button containing it to open metadata
  // The button wraps the icon and name, clicking on the name should work
  const objectName = objectRow.locator(SELECTORS.objectName);
  await expect(objectName).toBeVisible();
  await objectName.click();

  // Wait for metadata panel to appear
  const metadataPanel = page.locator(SELECTORS.metadataPanel);
  await expect(metadataPanel).toBeVisible({ timeout: 5000 });
}

/**
 * Navigates to a specific URL path
 */
export async function navigateToPath(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle');
}
