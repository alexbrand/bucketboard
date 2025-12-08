# Unified E2E Tests Design Document

> **Status:** Draft
> **Author:** Claude
> **Date:** 2025-12-08
> **Last Updated:** 2025-12-08

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Goals & Requirements](#goals--requirements)
4. [Strategy Options](#strategy-options)
5. [Recommended Approach](#recommended-approach)
6. [Implementation Plan](#implementation-plan)
7. [Open Questions](#open-questions)

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

  apiClient: async ({ provider }, use) => {
    const client = new TestAPIClient(provider);
    await use(client);
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
│   ├── seed-fixture.ts       # Test data seeding
│   └── api-client.ts         # Direct API testing utilities
├── helpers/
│   ├── selectors.ts          # Common page selectors
│   ├── actions.ts            # Reusable page actions
│   └── assertions.ts         # Custom assertions
├── tests/
│   ├── connection/
│   │   ├── connection-switching.spec.ts
│   │   └── connection-management.spec.ts
│   ├── bucket/
│   │   ├── bucket-list.spec.ts
│   │   ├── bucket-creation.spec.ts
│   │   └── bucket-deletion.spec.ts
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

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

**Tasks:**
- [ ] Create fixture architecture in `e2e/fixtures/`
- [ ] Implement provider fixture with project integration
- [ ] Create test bucket lifecycle fixture (create/seed/cleanup)
- [ ] Update `playwright.config.ts` with three provider projects
- [ ] Add helper utilities for common operations

**Deliverables:**
- Working fixture system
- Single test running on all three providers

### Phase 2: Core Test Suite (Week 2)

**Tasks:**
- [ ] Migrate existing tests to new fixture system
- [ ] Implement bucket listing tests
- [ ] Implement object listing tests
- [ ] Implement upload/download tests
- [ ] Add object deletion tests

**Deliverables:**
- Complete CRUD test coverage
- All tests passing on all providers

### Phase 3: Advanced Features (Week 3)

**Tasks:**
- [ ] Add metadata management tests
- [ ] Implement folder navigation tests
- [ ] Add error handling tests
- [ ] Implement pagination/virtual scrolling tests
- [ ] Add search/filter tests

**Deliverables:**
- Comprehensive feature coverage
- Edge case handling

### Phase 4: CI/CD Integration (Week 4)

**Tasks:**
- [ ] Update GitHub workflow for parallel provider testing
- [ ] Add test result aggregation
- [ ] Implement flaky test detection
- [ ] Add performance benchmarks
- [ ] Create test coverage reports

**Deliverables:**
- Fully automated CI pipeline
- Dashboard/reporting

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

### API Client Fixture

```typescript
// e2e/fixtures/api-client.ts
export class TestAPIClient {
  constructor(private provider: string, private baseUrl: string) {}

  async listBuckets() {
    const response = await fetch(
      `${this.baseUrl}/api/buckets?connectionId=${this.provider}`
    );
    return response.json();
  }

  async listObjects(bucket: string, prefix?: string) {
    const params = new URLSearchParams({ connectionId: this.provider });
    if (prefix) params.set('prefix', prefix);

    const response = await fetch(
      `${this.baseUrl}/api/buckets/${bucket}/objects?${params}`
    );
    return response.json();
  }

  async uploadObject(bucket: string, key: string, content: Buffer) {
    // Direct API upload for test setup
  }

  async deleteObject(bucket: string, key: string) {
    // Direct API delete for test cleanup
  }
}

export const apiClientFixture = base.extend<{ api: TestAPIClient }>({
  api: async ({ provider, baseURL }, use) => {
    const client = new TestAPIClient(provider, baseURL!);
    await use(client);
  },
});
```

### Combined Fixtures Export

```typescript
// e2e/fixtures/index.ts
import { mergeTests, mergeExpect } from '@playwright/test';
import { providerFixture } from './provider-fixture';
import { bucketFixture } from './bucket-fixture';
import { apiClientFixture } from './api-client';

export const test = mergeTests(
  providerFixture,
  bucketFixture,
  apiClientFixture
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

## Open Questions

### For Discussion

1. **Test data isolation strategy**
   - Option A: Unique bucket per test (slower, full isolation)
   - Option B: Shared bucket with unique prefixes (faster, less isolation)
   - Option C: Shared bucket, cleanup before each test (medium)
   - **Recommendation:** Option A for CI, Option B for local development

2. **Emulator vs real provider testing**
   - Should we support testing against real cloud providers?
   - How to handle credentials securely?
   - Is emulator parity sufficient?

3. **Performance benchmarking**
   - Should we track operation timing per provider?
   - Alert on significant performance regressions?

4. **Provider priority in CI**
   - Run all providers on every PR?
   - Or use a "primary" provider for PR, all providers for main?

5. **Flaky test handling**
   - Current: 2 retries in CI
   - Should we quarantine flaky tests?
   - Provider-specific flakiness tracking?

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

---

## Feedback & Comments

> Add your comments and feedback below. Use the format:
> **[Name] (Date):** Comment

---
