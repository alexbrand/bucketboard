import { test, expect } from '@playwright/test';

/**
 * End-to-end test for the core bucket browsing flow.
 *
 * Prerequisites:
 * - Docker Compose services are running (LocalStack, Azurite, fake-gcs)
 * - connections.yaml is set up with at least the LocalStack S3 connection
 * - A test bucket with some objects exists (use `pnpm seed` to create test data)
 */
test.describe('Bucket Browsing', () => {
  test('should display connections, buckets, and allow browsing objects', async ({ page }) => {
    // Navigate to the app - it redirects from / to /buckets
    await page.goto('/');

    // Wait for the page to load and redirect to /buckets
    await expect(page).toHaveURL(/\/buckets/);

    // Verify the sidebar is visible
    const sidebar = page.locator('#app-sidebar');
    await expect(sidebar).toBeVisible();

    // Verify the connection selector is present
    const connectionSelector = page.locator('#connection-selector');
    await expect(connectionSelector).toBeVisible();

    // Wait for connections to load - the select should have a value
    const selectTrigger = connectionSelector.locator('button[role="combobox"]');
    await expect(selectTrigger).toBeVisible();

    // Wait for either buckets to load or "No buckets found" message
    const bucketsContainer = page.locator('#buckets-list-container');
    await expect(bucketsContainer).toBeVisible();

    // Wait for loading to complete
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    // Check if we have buckets or need to show "no buckets" state
    const bucketsList = page.locator('#buckets-list');
    const noBucketsMessage = bucketsContainer.getByText('No buckets found');

    // Either buckets are displayed or "No buckets found" is shown
    const hasBuckets = await bucketsList.isVisible();
    const hasNoBucketsMessage = await noBucketsMessage.isVisible();

    expect(hasBuckets || hasNoBucketsMessage).toBe(true);

    if (hasBuckets) {
      // Get all bucket buttons
      const bucketButtons = bucketsList.locator('button');
      const bucketCount = await bucketButtons.count();

      expect(bucketCount).toBeGreaterThan(0);

      // Click on the first bucket if not already selected
      const firstBucket = bucketButtons.first();
      await firstBucket.click();

      // Verify main content area shows bucket contents
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();

      // Wait for loading state to complete
      // The page might show a loading skeleton or the object list
      const objectListContainer = page.locator('#object-list-container');

      // Wait for either object list, empty bucket message, or the no-bucket-selected state
      await expect(
        objectListContainer
          .or(mainContent.getByText('This bucket is empty'))
          .or(mainContent.getByText('This folder is empty'))
      ).toBeVisible({ timeout: 10000 });

      // Verify the toolbar is present when a bucket is selected
      const toolbar = page.locator('#bucket-toolbar');
      await expect(toolbar).toBeVisible();

      // Verify search and filter controls are present
      const searchAndFilters = page.locator('#bucket-toolbar-search-and-filters');
      await expect(searchAndFilters).toBeVisible();
    }
  });

  test('should be able to switch between connections', async ({ page }) => {
    await page.goto('/buckets');

    // Wait for the page to load
    const connectionSelector = page.locator('#connection-selector');
    await expect(connectionSelector).toBeVisible();

    // Wait for connections to load - wait for at least one option to be available
    // This ensures the API call has completed and options are rendered
    const selectContent = page.locator('[role="listbox"]');
    const selectTrigger = connectionSelector.locator('button[role="combobox"]');

    // Check if dropdown is already open, if not, open it
    const isOpen = await selectContent.isVisible();
    if (!isOpen) {
      await selectTrigger.click();
    }

    // Wait for the dropdown content to be visible
    await expect(selectContent).toBeVisible();

    // Wait for at least one connection option to be available
    const options = selectContent.locator('[role="option"]');
    await expect(options.first()).toBeVisible({ timeout: 1000 });

    // Get all connection options
    const optionCount = await options.count();

    // Should have at least one connection
    expect(optionCount).toBeGreaterThan(0);

    // Close the dropdown by pressing Escape
    await page.keyboard.press('Escape');
    await expect(selectContent).toBeHidden();
  });

  test('should show filter controls when Filters button is clicked', async ({ page }) => {
    await page.goto('/buckets');

    // Wait for buckets to load
    const bucketsContainer = page.locator('#buckets-list-container');
    await expect(bucketsContainer.getByText('Loading...')).toBeHidden({ timeout: 10000 });

    // Check if we have a bucket selected (toolbar should be visible)
    const toolbar = page.locator('#bucket-toolbar');
    const hasToolbar = await toolbar.isVisible();

    if (hasToolbar) {
      // Click on the Filters button
      const filtersButton = page.getByRole('button', { name: /Filters/i });
      await filtersButton.click();

      // Verify filter controls are shown
      const fileTypeFilter = page.locator('#file-type-filter');
      await expect(fileTypeFilter).toBeVisible();

      const sizeFilter = page.locator('#size-filter');
      await expect(sizeFilter).toBeVisible();

      // Click Filters button again to hide
      await filtersButton.click();
      await expect(fileTypeFilter).toBeHidden();
    }
  });
});
