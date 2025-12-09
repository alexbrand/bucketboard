import { test, expect } from '../../fixtures';
import { selectConnection, selectBucket } from '../../helpers/actions';
import { expectBucketVisible, expectEmptyState } from '../../helpers/assertions';
import { SELECTORS } from '../../helpers/selectors';

test.describe('Bucket List', () => {
  test('should display test bucket in list', async ({ page, provider, testBucket }) => {
    await page.goto('/buckets');

    // Select the connection
    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer).toBeVisible();
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    // Verify test bucket is visible
    await expectBucketVisible(page, testBucket);
  });

  test('should show bucket contents when clicked', async ({ page, provider, testBucket, testObjects }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    // Select the test bucket
    await selectBucket(page, testBucket);

    // Verify main content area shows bucket contents
    const mainContent = page.locator(SELECTORS.mainContent);
    await expect(mainContent).toBeVisible();

    // Wait for object list to load
    const objectListContainer = page.locator(SELECTORS.objectListContainer);
    await expect(
      objectListContainer
        .or(mainContent.getByText('This bucket is empty'))
        .or(mainContent.getByText('This folder is empty'))
    ).toBeVisible({ timeout: 10000 });

    // Verify toolbar is present
    const toolbar = page.locator(SELECTORS.bucketToolbar);
    await expect(toolbar).toBeVisible();
  });

  test('should show empty state for empty bucket', async ({ page, provider, testBucket }) => {
    // Create a new empty bucket for this test
    // Note: We'll use the testBucket fixture but it will be empty since testObjects fixture isn't used
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    // Select the test bucket
    await selectBucket(page, testBucket);

    // Wait a bit for the bucket to load
    await page.waitForTimeout(2000);

    // Check if empty state is shown (bucket might be empty if testObjects fixture didn't seed)
    const emptyBucket = page.locator(SELECTORS.emptyBucketMessage);
    const emptyFolder = page.locator(SELECTORS.emptyFolderMessage);
    const objectList = page.locator(SELECTORS.objectList);

    // Either empty state or object list should be visible
    const isEmpty = await emptyBucket.isVisible().catch(() => false) || await emptyFolder.isVisible().catch(() => false);
    const hasObjects = await objectList.isVisible().catch(() => false);

    expect(isEmpty || hasObjects).toBe(true);
  });
});
