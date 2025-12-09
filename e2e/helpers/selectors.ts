/**
 * Common UI selectors for e2e tests
 * Uses data-testid attributes where available, falls back to ARIA roles
 */
export const SELECTORS = {
  // Connection selector
  connectionSelector: '#connection-selector',
  connectionDropdown: '[role="listbox"]',
  connectionOption: '[role="option"]',

  // Bucket list
  bucketListContainer: '#buckets-list-container',
  bucketList: '#buckets-list',
  bucketListItem: '[data-testid="bucket-list-item"]',
  noBucketsMessage: 'text=No buckets found',

  // Object list
  objectListContainer: '#object-list-container',
  objectList: '[data-testid="object-list"]',
  objectRow: '[data-testid="object-row"]',
  objectName: '[data-testid="object-name"]',
  emptyBucketMessage: 'text=This bucket is empty',
  emptyFolderMessage: 'text=This folder is empty',

  // Breadcrumb navigation
  breadcrumb: '[data-testid="breadcrumb"]',
  breadcrumbItem: '[data-testid="breadcrumb-item"]',

  // Toolbar
  bucketToolbar: '#bucket-toolbar',
  searchAndFilters: '#bucket-toolbar-search-and-filters',
  uploadButton: '[data-testid="upload-button"]',
  deleteButton: '[data-testid="delete-button"]',
  filtersButton: 'button:has-text("Filters")',

  // Filters
  fileTypeFilter: '#file-type-filter',
  sizeFilter: '#size-filter',

  // Metadata panel
  metadataPanel: '[data-testid="metadata-panel"]',
  metadataCloseButton: '[data-testid="metadata-close"]',

  // Main content
  mainContent: '#main-content',
  sidebar: '#app-sidebar',
} as const;
