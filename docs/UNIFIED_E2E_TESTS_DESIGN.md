# Unified E2E Tests Design Document

> **Status:** Draft
> **Author:** Claude
> **Date:** 2025-12-08
> **Last Updated:** 2025-12-09

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Goals & Requirements](#goals--requirements)
4. [Strategy Options](#strategy-options)
5. [Recommended Approach](#recommended-approach)
6. [Implementation Tasks](#implementation-tasks)
7. [Decisions](#decisions)

---

## Executive Summary

This document explores strategies for maintaining a **single set of e2e tests** that work across all three connection providers (AWS S3, Azure Blob Storage, GCP Storage) in the bucketbrowser application.

The core challenge: Write tests once, run them against any provider, and ensure consistent behavior across all storage backends.

---

## Current State Analysis

### Existing Architecture

The application already has excellent abstractions for multi-provider support:

| Component | Location | Purpose |
|-----------|----------|---------|
| `StorageProvider` interface | `src/lib/storage/interface.ts` | Unified API contract |
| Provider implementations | `src/lib/storage/providers/*.ts` | AWS, Azure, GCP |
| Factory pattern | `src/lib/storage/provider-factory.ts` | Dynamic provider instantiation |
| Connection store | `src/lib/storage/connection-store.ts` | YAML-based config |

### Existing Test Infrastructure

| Component | Status | Notes |
|-----------|--------|-------|
| Playwright setup | ✅ Exists | Basic configuration |
| Docker emulators | ✅ Exists | LocalStack, Azurite, fake-gcs |
| E2E tests | ⚠️ Limited | Basic UI tests only |
| Seed script | ✅ Exists | `scripts/seed-bucket.ts` |
| CI workflow | ✅ Exists | Starts all emulators |

### Current Gaps

1. **No provider-specific test execution** - Tests don't run against specific providers
2. **No test data isolation** - Tests share state, no cleanup between runs
3. **No parameterized testing** - Can't run same test across providers
4. **Limited coverage** - Only basic navigation tests exist

---

## Goals & Requirements

### Primary Goals

1. **Write once, run everywhere** - Single test suite works for all providers
2. **Provider parity validation** - Ensure consistent behavior across providers
3. **Fast feedback loop** - Quick test execution during development
4. **CI/CD integration** - Automated testing in pipelines

### Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Same test code for all providers | Must Have | Core requirement |
| Isolated test data per run | Must Have | Prevent flaky tests |
| Parallel provider execution | Should Have | Faster CI |
| Provider-specific skip conditions | Should Have | Handle edge cases |
| Local development support | Must Have | Easy to run locally |
| Clear failure attribution | Must Have | Know which provider failed |

---

## Strategy Options

### Option 1: Playwright Projects with Provider Fixtures

**Concept:** Use Playwright's project feature to run the same tests with different provider configurations.

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'aws-s3',
      use: {
        ...devices['Desktop Chrome'],
        storageProvider: 'localstack-s3',
      },
    },
    {
      name: 'azure-blob',
      use: {
        ...devices['Desktop Chrome'],
        storageProvider: 'azurite-blob',
      },
    },
    {
      name: 'gcp-storage',
      use: {
        ...devices['Desktop Chrome'],
        storageProvider: 'fake-gcs',
      },
    },
  ],
});
```

```typescript
// e2e/fixtures.ts
export const test = base.extend<{ provider: string }>({
  provider: async ({ storageProvider }, use) => {
    // Setup: seed test data for this provider
    await seedTestBucket(storageProvider);

    await use(storageProvider);

    // Teardown: cleanup test data
    await cleanupTestBucket(storageProvider);
  },
});
```

**Pros:**
- Native Playwright feature - well supported
- Parallel execution out of the box
- Clear reporting per provider
- Easy to add/remove providers

**Cons:**
- Requires custom fixture setup
- All providers must be available to run full suite
- Longer CI times (3x tests)

---

### Option 2: Environment Variable-Driven Provider Selection

**Concept:** Single test configuration that reads the target provider from environment variables.

```bash
# Run tests against S3
PROVIDER=localstack-s3 pnpm test:e2e

# Run tests against Azure
PROVIDER=azurite-blob pnpm test:e2e

# Run tests against GCP
PROVIDER=fake-gcs pnpm test:e2e
```

```typescript
// e2e/helpers/provider.ts
export function getTestProvider(): string {
  return process.env.PROVIDER || 'localstack-s3';
}

export function getTestConnection(): string {
  return process.env.CONNECTION_ID || getTestProvider();
}
```

**Pros:**
- Simple implementation
- Flexible CI matrix configuration
- Can test single provider locally
- Easy to debug specific provider issues

**Cons:**
- Requires multiple CI jobs
- No single-command "test all providers"
- Manual coordination needed

---

### Option 3: Test-Time Provider Loop (Parameterized Tests)

**Concept:** Each test internally loops through providers or uses `test.describe.each()`.

```typescript
const providers = ['localstack-s3', 'azurite-blob', 'fake-gcs'];

for (const provider of providers) {
  test.describe(`[${provider}] Bucket Operations`, () => {
    test.beforeAll(async () => {
      await seedTestBucket(provider);
    });

    test.afterAll(async () => {
      await cleanupTestBucket(provider);
    });

    test('can list buckets', async ({ page }) => {
      await selectConnection(page, provider);
      await expect(page.getByRole('listbox')).toContainText('test-bucket');
    });
  });
}
```

**Pros:**
- All providers tested in single run
- Clear per-provider test names
- Easy to understand structure

**Cons:**
- Tests run sequentially per provider
- All tests must support all providers
- Harder to run single provider locally

---

### Option 4: Abstract Base Test Class with Provider Injection

**Concept:** Create a base test class that abstracts provider details, with concrete implementations for each provider.

```typescript
// e2e/base/storage-tests.ts
export abstract class StorageTests {
  abstract getConnectionId(): string;
  abstract getTestBucketName(): string;

  async setupTestData() {
    // Common setup logic
  }

  defineTests() {
    test('can browse bucket contents', async ({ page }) => {
      await this.selectProvider(page);
      // Test implementation
    });
  }
}

// e2e/providers/aws.spec.ts
class AWSStorageTests extends StorageTests {
  getConnectionId() { return 'localstack-s3'; }
  getTestBucketName() { return 'test-bucket'; }
}
new AWSStorageTests().defineTests();
```

**Pros:**
- OOP approach - familiar pattern
- Easy to add provider-specific tests
- Clear separation of concerns

**Cons:**
- More boilerplate code
- Playwright doesn't naturally support class-based tests
- Harder to leverage Playwright's fixture system

---

### Option 5: Hybrid Approach (Projects + Shared Fixtures + Skip Conditions)

**Concept:** Combine Playwright projects with shared fixtures and conditional test execution.

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'aws-s3', use: { provider: 'localstack-s3' } },
    { name: 'azure-blob', use: { provider: 'azurite-blob' } },
    { name: 'gcp-storage', use: { provider: 'fake-gcs' } },
  ],
});

// e2e/fixtures/index.ts
export const test = base.extend<TestFixtures>({
  provider: async ({}, use, testInfo) => {
    const providerId = testInfo.project.use.provider;
    await use(providerId);
  },

  testBucket: async ({ provider }, use) => {
    const bucket = await createTestBucket(provider);
    await seedTestData(provider, bucket);
    await use(bucket);
    await cleanupBucket(provider, bucket);
  },
});

// e2e/tests/bucket-operations.spec.ts
import { test, expect, skipIfProvider } from '../fixtures';

test('can list objects in bucket', async ({ page, provider, testBucket }) => {
  await page.goto(`/?connection=${provider}`);
  await page.getByRole('button', { name: testBucket }).click();
  await expect(page.locator('[data-testid="object-list"]')).toBeVisible();
});

test('can update object metadata', async ({ page, provider, testBucket }) => {
  // Skip for GCP - metadata update behavior differs
  test.skip(provider === 'fake-gcs', 'GCP has different metadata model');

  // Test implementation
});
```

**Pros:**
- Best of multiple approaches
- Full Playwright integration
- Provider-specific skip conditions
- Clean fixture-based setup/teardown
- Parallel execution support

**Cons:**
- Most complex setup
- Learning curve for contributors
- Requires comprehensive fixtures

---

## Recommended Approach

### Recommendation: Option 5 (Hybrid Approach)

The hybrid approach is recommended because it:

1. **Leverages Playwright's strengths** - Projects, fixtures, parallel execution
2. **Provides flexibility** - Skip conditions, provider-specific behavior
3. **Ensures isolation** - Per-test bucket creation and cleanup
4. **Enables clear reporting** - Separate results per provider
5. **Supports local development** - Can run single provider easily

### Architecture Overview

```
e2e/
├── fixtures/
│   ├── index.ts              # Main fixture exports
│   ├── provider-fixture.ts   # Provider selection logic
│   ├── bucket-fixture.ts     # Test bucket lifecycle
│   └── seed-fixture.ts       # Test data seeding
├── helpers/
│   ├── selectors.ts          # Common page selectors
│   ├── actions.ts            # Reusable UI actions (click, navigate, etc.)
│   └── assertions.ts         # Custom UI assertions
├── tests/
│   ├── connection/
│   │   ├── connection-switching.spec.ts
│   │   └── connection-management.spec.ts
│   ├── bucket/
│   │   └── bucket-list.spec.ts
│   ├── object/
│   │   ├── object-list.spec.ts
│   │   ├── object-upload.spec.ts
│   │   ├── object-download.spec.ts
│   │   ├── object-delete.spec.ts
│   │   └── object-metadata.spec.ts
│   └── navigation/
│       ├── folder-navigation.spec.ts
│       └── breadcrumb.spec.ts
└── playwright.config.ts
```

> **Note:** All tests are browser/UI level tests using Playwright. We do not test at the API level directly - all interactions go through the UI.

---

## Implementation Tasks

### 1. Playwright Configuration

- [ ] **Update `playwright.config.ts` with provider projects**
  - Add three projects: `aws-s3`, `azure-blob`, `gcp-storage`
  - Each project should set `use: { provider: '<connection-id>' }` in its configuration
  - Keep existing configuration for base URL, reporters, retries, and web server
  - Example structure:
    ```typescript
    projects: [
      { name: 'aws-s3', use: { ...devices['Desktop Chrome'], provider: 'localstack-s3' } },
      { name: 'azure-blob', use: { ...devices['Desktop Chrome'], provider: 'azurite-blob' } },
      { name: 'gcp-storage', use: { ...devices['Desktop Chrome'], provider: 'fake-gcs' } },
    ]
    ```

### 2. Fixture System

- [ ] **Create `e2e/fixtures/provider-fixture.ts`**
  - Export a Playwright fixture that extracts `provider` from `testInfo.project.use.provider`
  - Throw an error if provider is not configured
  - This fixture makes the current provider available to all tests

- [ ] **Create `e2e/fixtures/bucket-fixture.ts`**
  - Create a `testBucket` fixture that:
    1. Generates a unique bucket name using `testInfo.testId` and timestamp
    2. Calls the existing seed script (`scripts/seed-bucket.ts`) via child process or imports its logic
    3. Provides the bucket name to the test via `use(bucketName)`
    4. Cleans up the bucket after the test completes
  - Create a `testObjects` fixture that seeds standard test objects and returns their keys

- [ ] **Create `e2e/fixtures/seed-utils.ts`**
  - Implement `createTestBucket(provider: string, bucketName: string)` - creates bucket via provider SDK
  - Implement `seedTestData(provider: string, bucket: string, options)` - uploads test files
  - Implement `cleanupBucket(provider: string, bucketName: string)` - deletes all objects and bucket
  - Import provider factory from `src/lib/storage/provider-factory.ts` for direct SDK access
  - Options should support: `count`, `includeFolders`, `includeNested`, `fileTypes`

- [ ] **Create `e2e/fixtures/index.ts`**
  - Use `mergeTests` from `@playwright/test` to combine provider and bucket fixtures
  - Export the combined `test` and `expect` from this file
  - Export a `skipForProvider(providers: string[], reason: string)` helper function

### 3. UI Helper Utilities

- [ ] **Create `e2e/helpers/selectors.ts`**
  - Define constants for common UI selectors:
    - `SELECTORS.connectionSelector` - the connection dropdown
    - `SELECTORS.bucketList` - bucket list container
    - `SELECTORS.objectList` - object list/table
    - `SELECTORS.breadcrumb` - breadcrumb navigation
    - `SELECTORS.uploadButton` - upload button
    - `SELECTORS.deleteButton` - delete button
    - `SELECTORS.metadataPanel` - metadata side panel
  - Use `data-testid` attributes where available, fall back to ARIA roles

- [ ] **Create `e2e/helpers/actions.ts`**
  - `selectConnection(page: Page, connectionId: string)` - selects a connection from dropdown
  - `selectBucket(page: Page, bucketName: string)` - clicks on a bucket in the list
  - `navigateToFolder(page: Page, folderPath: string)` - navigates into a folder
  - `uploadFile(page: Page, filePath: string)` - uploads a file via UI
  - `deleteObject(page: Page, objectKey: string)` - deletes an object via UI
  - `openMetadataPanel(page: Page, objectKey: string)` - opens metadata for an object

- [ ] **Create `e2e/helpers/assertions.ts`**
  - `expectBucketVisible(page: Page, bucketName: string)` - asserts bucket appears in list
  - `expectObjectVisible(page: Page, objectKey: string)` - asserts object appears in list
  - `expectObjectCount(page: Page, count: number)` - asserts number of visible objects
  - `expectBreadcrumb(page: Page, path: string[])` - asserts breadcrumb shows expected path
  - `expectEmptyState(page: Page)` - asserts empty bucket/folder message shown

### 4. Test Implementation

- [ ] **Migrate existing `e2e/bucket-browsing.spec.ts`**
  - Update imports to use new fixtures from `e2e/fixtures`
  - Replace hardcoded connection IDs with `provider` fixture
  - Ensure tests work with dynamically created test buckets

- [ ] **Create `e2e/tests/connection/connection-switching.spec.ts`**
  - Test: User can switch between connections via dropdown
  - Test: Bucket list updates when connection changes
  - Test: Selected connection persists after page refresh (if applicable)

- [ ] **Create `e2e/tests/bucket/bucket-list.spec.ts`**
  - Test: Bucket list loads and displays test bucket
  - Test: Clicking a bucket shows its contents
  - Test: Empty bucket shows appropriate empty state

- [ ] **Create `e2e/tests/object/object-list.spec.ts`**
  - Test: Objects display with correct names in the list
  - Test: Object metadata (size, last modified) displays correctly
  - Test: Folders are visually distinguished from files
  - Test: List handles large number of objects (virtual scrolling)

- [ ] **Create `e2e/tests/object/object-upload.spec.ts`**
  - Test: User can upload a file via the upload button
  - Test: Uploaded file appears in the object list
  - Test: Upload progress indicator shows during upload
  - Test: Multiple file upload works correctly

- [ ] **Create `e2e/tests/object/object-download.spec.ts`**
  - Test: User can download a file by clicking download action
  - Test: Downloaded file has correct content (compare with seeded data)
  - Use Playwright's download handling to verify downloads

- [ ] **Create `e2e/tests/object/object-delete.spec.ts`**
  - Test: User can delete a single object
  - Test: Deleted object disappears from the list
  - Test: User can select and delete multiple objects (bulk delete)
  - Test: Delete confirmation dialog appears before deletion

- [ ] **Create `e2e/tests/object/object-metadata.spec.ts`**
  - Test: Clicking an object opens metadata panel
  - Test: Metadata panel shows object size, content type, last modified
  - Test: User can edit custom metadata (skip for providers that don't support)
  - Use `test.skip(provider === 'fake-gcs', 'reason')` for provider-specific skips

- [ ] **Create `e2e/tests/navigation/folder-navigation.spec.ts`**
  - Test: Clicking a folder navigates into it
  - Test: Nested folder navigation works (folder within folder)
  - Test: Back button returns to parent folder
  - Test: URL updates to reflect current path

- [ ] **Create `e2e/tests/navigation/breadcrumb.spec.ts`**
  - Test: Breadcrumb shows current path
  - Test: Clicking breadcrumb segment navigates to that level
  - Test: Root breadcrumb returns to bucket root

### 5. CI/CD Updates

- [ ] **Update `.github/workflows/e2e-tests.yml`**
  - Add matrix strategy with `provider: [aws-s3, azure-blob, gcp-storage]`
  - Set `fail-fast: false` so all providers run even if one fails
  - Pass `--project=${{ matrix.provider }}` to playwright command
  - Update artifact upload to include provider name: `playwright-report-${{ matrix.provider }}`

- [ ] **Add `test:e2e` script variants to `package.json`**
  - `test:e2e` - runs all provider projects
  - `test:e2e:s3` - runs only `--project=aws-s3`
  - `test:e2e:azure` - runs only `--project=azure-blob`
  - `test:e2e:gcs` - runs only `--project=gcp-storage`

### 6. Data Test IDs

- [ ] **Add `data-testid` attributes to UI components**
  - Review components in `src/app/` and `src/components/`
  - Add testids to: connection selector, bucket list items, object list rows, action buttons
  - Follow naming convention: `<component>-<element>` (e.g., `bucket-list-item`, `object-row`)
  - Document added testids in `e2e/helpers/selectors.ts`

---

## Detailed Design: Fixture System

### Provider Fixture

```typescript
// e2e/fixtures/provider-fixture.ts
import { test as base } from '@playwright/test';
import { ProviderConfig, getProviderConfig } from './provider-config';

export type ProviderFixtures = {
  provider: string;
  providerConfig: ProviderConfig;
};

export const providerFixture = base.extend<ProviderFixtures>({
  provider: async ({}, use, testInfo) => {
    // Get provider from project configuration
    const provider = testInfo.project.use.provider as string;
    if (!provider) {
      throw new Error('Provider not configured for this project');
    }
    await use(provider);
  },

  providerConfig: async ({ provider }, use) => {
    const config = getProviderConfig(provider);
    await use(config);
  },
});
```

### Test Bucket Fixture

```typescript
// e2e/fixtures/bucket-fixture.ts
import { test as base } from '@playwright/test';
import { createTestBucket, deleteTestBucket, seedTestData } from './bucket-utils';

export type BucketFixtures = {
  testBucket: string;
  testObjects: string[];
};

export const bucketFixture = base.extend<BucketFixtures>({
  testBucket: async ({ provider }, use, testInfo) => {
    // Create unique bucket for this test
    const bucketName = `test-${testInfo.testId}-${Date.now()}`;

    await createTestBucket(provider, bucketName);

    await use(bucketName);

    // Cleanup after test
    await deleteTestBucket(provider, bucketName);
  },

  testObjects: async ({ provider, testBucket }, use) => {
    // Seed standard test objects
    const objects = await seedTestData(provider, testBucket, {
      count: 10,
      includeFolders: true,
      includeNested: true,
    });

    await use(objects.map(o => o.key));
  },
});
```

### Combined Fixtures Export

```typescript
// e2e/fixtures/index.ts
import { mergeTests } from '@playwright/test';
import { providerFixture } from './provider-fixture';
import { bucketFixture } from './bucket-fixture';

export const test = mergeTests(
  providerFixture,
  bucketFixture
);

export { expect } from '@playwright/test';

// Helper for provider-specific skipping
export function skipForProvider(
  test: typeof import('@playwright/test').test,
  providers: string[],
  reason: string
) {
  test.skip(
    ({ provider }) => providers.includes(provider),
    reason
  );
}
```

---

## Provider-Specific Considerations

### Known Differences

| Feature | AWS S3 | Azure Blob | GCP Storage |
|---------|--------|------------|-------------|
| Object tags | ✅ Native | ✅ Blob tags | ❌ Not supported |
| Folder creation | Virtual (/) | Virtual (/) | Virtual (/) |
| Batch delete | ✅ Atomic | Sequential | Parallel |
| Metadata format | Key-value | Key-value | Labels |
| Storage classes | Standard, IA, etc. | Hot, Cool, Archive | Standard, Nearline, etc. |

### Skip Condition Examples

```typescript
test('can set object tags', async ({ page, provider, testBucket }) => {
  // GCP doesn't support object-level tags
  test.skip(provider === 'fake-gcs', 'GCP Storage does not support object tags');

  // Test implementation
});

test('can set storage class', async ({ page, provider, testBucket }) => {
  // All providers support this but with different values
  const storageClasses = {
    'localstack-s3': 'STANDARD_IA',
    'azurite-blob': 'Cool',
    'fake-gcs': 'NEARLINE',
  };

  const targetClass = storageClasses[provider];
  // Test implementation using targetClass
});
```

---

## CI/CD Configuration

### Updated GitHub Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        provider: [aws-s3, azure-blob, gcp-storage]

    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Start emulators
        run: docker-compose up -d

      - name: Wait for services
        run: |
          # Wait for all emulators to be healthy
          ./scripts/wait-for-services.sh

      - name: Setup test connections
        run: cp connections.yaml.example data/connections.yaml

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm exec playwright test --project=${{ matrix.provider }}

      - name: Upload results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ matrix.provider }}
          path: |
            playwright-report/
            test-results/
```

---

## Decisions

The following decisions have been finalized:

### 1. Test Data Isolation Strategy

**Decision:** Option A - Unique bucket per test

Each test creates its own bucket with a unique name (using `testInfo.testId` and timestamp), seeds test data, runs the test, and cleans up afterward. This provides full isolation and eliminates flaky tests from data bleed between tests.

### 2. Emulator vs Real Provider Testing

**Decision:** Emulators only

E2E tests will run exclusively against emulators (LocalStack, Azurite, fake-gcs-server). Real cloud provider testing is out of scope for browser e2e tests. The existing docker-compose setup provides sufficient coverage for UI interaction paths.

### 3. Performance Benchmarking

**Decision:** Skip for now

No performance tracking in e2e tests. E2E tests focus on correctness, not performance. Performance metrics would be unreliable due to CI runner variability. Can revisit if needed in the future.

### 4. Provider Priority in CI

**Decision:** All 3 providers on every PR

Run all provider projects (aws-s3, azure-blob, gcp-storage) on every pull request. Tests run in parallel via matrix strategy, so wall-clock time impact is minimal. This catches provider-specific regressions before merge.

### 5. Flaky Test Handling

**Decision:** Keep current retry approach

Maintain the existing 2 retries in CI configuration. No quarantine system needed at this time. Focus on writing stable tests from the start. Revisit if flakiness becomes a recurring issue.

---

## Appendix

### A. Provider Configuration Reference

```yaml
# connections.yaml.example
localstack-s3:
  name: LocalStack S3
  provider: aws-s3
  config:
    accessKeyId: ${AWS_ACCESS_KEY_ID:-test}
    secretAccessKey: ${AWS_SECRET_ACCESS_KEY:-test}
    region: ${AWS_REGION:-us-east-1}
    endpoint: ${LOCALSTACK_ENDPOINT:-http://localhost:4566}
    forcePathStyle: true

azurite-blob:
  name: Azurite Blob Storage
  provider: azure-blob
  config:
    accountName: ${AZURE_STORAGE_ACCOUNT:-devstoreaccount1}
    accountKey: ${AZURE_STORAGE_KEY:-Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==}
    endpoint: ${AZURITE_ENDPOINT:-http://127.0.0.1:10000}

fake-gcs:
  name: Fake GCS Server
  provider: gcp-storage
  config:
    projectId: ${GCP_PROJECT_ID:-test-project}
    clientEmail: ${GCP_CLIENT_EMAIL:-test@test-project.iam.gserviceaccount.com}
    privateKey: ${GCP_PRIVATE_KEY:-}
    apiEndpoint: ${FAKE_GCS_ENDPOINT:-http://localhost:4443}
```

### B. Useful Commands

```bash
# Run all provider tests
pnpm test:e2e

# Run specific provider
pnpm test:e2e --project=aws-s3

# Run specific test file on all providers
pnpm test:e2e tests/bucket/bucket-list.spec.ts

# Run with UI mode for debugging
pnpm test:e2e --ui

# Generate HTML report
pnpm test:e2e --reporter=html
```

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-08 | 0.1.0 | Initial draft |
| 2025-12-09 | 0.2.0 | Focus on UI-level testing, replace weekly plan with detailed tasks |
| 2025-12-09 | 0.3.0 | Finalize decisions on isolation, emulators, CI strategy, flaky tests |

---

## Feedback & Comments

> Add your comments and feedback below. Use the format:
> **[Name] (Date):** Comment

---
