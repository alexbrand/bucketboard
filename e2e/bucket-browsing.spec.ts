import { test, expect } from './fixtures';
import { selectConnection, selectBucket } from './helpers/actions';
import { expectConnectionsLoaded, expectBucketVisible } from './helpers/assertions';
import { SELECTORS } from './helpers/selectors';

/**
 * End-to-end test for the core bucket browsing flow.
 * Uses the unified fixture system to work across all providers.
 */
test.describe('Bucket Browsing', () => {
  test('should display connections, buckets, and allow browsing objects', async ({ page, provider, testBucket, testObjects }) => {
    // Navigate to the app - it redirects from / to /buckets
    await page.goto('/');

    // Wait for the page to load and redirect to /buckets
    await expect(page).toHaveURL(/\/buckets/);

    // Verify the sidebar is visible
    const sidebar = page.locator(SELECTORS.sidebar);
    await expect(sidebar).toBeVisible();

    // Verify the connection selector is present and connections are loaded
    await expectConnectionsLoaded(page);

    // Select the connection for this provider
    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer).toBeVisible();
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    // Verify test bucket is visible
    await expectBucketVisible(page, testBucket);

    // Select the test bucket
    await selectBucket(page, testBucket);

    // Verify main content area shows bucket contents
    const mainContent = page.locator(SELECTORS.mainContent);
    await expect(mainContent).toBeVisible();

    // Wait for loading state to complete
    const objectListContainer = page.locator(SELECTORS.objectListContainer);

    // Wait for either object list, empty bucket message, or the no-bucket-selected state
    await expect(
      objectListContainer
        .or(mainContent.getByText('This bucket is empty'))
        .or(mainContent.getByText('This folder is empty'))
    ).toBeVisible({ timeout: 10000 });

    // Verify the toolbar is present when a bucket is selected
    const toolbar = page.locator(SELECTORS.bucketToolbar);
    await expect(toolbar).toBeVisible();

    // Verify search and filter controls are present
    const searchAndFilters = page.locator(SELECTORS.searchAndFilters);
    await expect(searchAndFilters).toBeVisible();
  });

  test('should be able to switch between connections', async ({ page, provider }) => {
    await page.goto('/buckets');

    // Wait for connections to load
    await expectConnectionsLoaded(page);

    const connectionSelector = page.locator(SELECTORS.connectionSelector);
    const selectTrigger = connectionSelector.locator('button[role="combobox"]');
    const selectContent = page.locator(SELECTORS.connectionDropdown);

    // Check if dropdown is already open, if not, open it
    const isOpen = await selectContent.isVisible();
    if (!isOpen) {
      await selectTrigger.click();
    }

    // Wait for the dropdown content to be visible
    await expect(selectContent).toBeVisible();

    // Wait for at least one connection option to be available
    const options = selectContent.locator(SELECTORS.connectionOption);
    await expect(options.first()).toBeVisible({ timeout: 1000 });

    // Get all connection options
    const optionCount = await options.count();

    // Should have at least one connection
    expect(optionCount).toBeGreaterThan(0);

    // Close the dropdown by pressing Escape
    await page.keyboard.press('Escape');
    await expect(selectContent).toBeHidden();
  });

  test('should show filter controls when Filters button is clicked', async ({ page, provider, testBucket }) => {
    await page.goto('/buckets');

    await selectConnection(page, provider);

    // Wait for buckets to load
    const bucketsContainer = page.locator(SELECTORS.bucketListContainer);
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    // Select a bucket to show the toolbar
    await selectBucket(page, testBucket);

    // Verify toolbar is visible
    const toolbar = page.locator(SELECTORS.bucketToolbar);
    await expect(toolbar).toBeVisible();

    // Click on the Filters button
    const filtersButton = page.getByRole('button', { name: /Filters/i });
    await filtersButton.click();

    // Verify filter controls are shown
    const fileTypeFilter = page.locator(SELECTORS.fileTypeFilter);
    await expect(fileTypeFilter).toBeVisible();

    const sizeFilter = page.locator(SELECTORS.sizeFilter);
    await expect(sizeFilter).toBeVisible();

    // Click Filters button again to hide
    await filtersButton.click();
    await expect(fileTypeFilter).toBeHidden();
  });
});
