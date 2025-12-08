# End-to-End Testing

This project uses [Playwright](https://playwright.dev/) for end-to-end testing.

## Prerequisites

1. **Install Playwright browsers** (first time only):

   ```bash
   pnpm exec playwright install chromium
   ```

2. **Start Docker Compose services**:

   ```bash
   docker compose up -d
   ```

3. **Set up connections configuration**:

   ```bash
   mkdir -p data
   cp connections.yaml.example data/connections.yaml
   ```

4. **(Optional) Seed test data**:

   ```bash
   pnpm seed localstack-s3 test-bucket --count 100
   ```

## Running Tests

### Headless Mode (CI/default)

```bash
pnpm test:e2e
```

Runs all tests in headless mode. The Next.js dev server starts automatically.

### Headed Mode

```bash
pnpm test:e2e:headed
```

Runs tests with a visible browser window for debugging.

### Interactive UI Mode

```bash
pnpm test:e2e:ui
```

Opens the Playwright Test UI for interactive test development and debugging. This mode allows you to:

- Watch tests run in real-time
- Step through tests
- View test traces and screenshots
- Re-run individual tests

## Test Structure

Tests are located in the `e2e/` directory:

```
e2e/
└── bucket-browsing.spec.ts   # Core bucket browsing flow tests
```

## Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Browser**: Chromium (Desktop Chrome)
- **Base URL**: `http://localhost:3000`
- **Web Server**: Automatically starts `pnpm dev` before tests
- **Reporter**: HTML report (view with `pnpm exec playwright show-report`)

## Debugging Failed Tests

### View Test Report

After running tests, view the HTML report:

```bash
pnpm exec playwright show-report
```

### View Traces

Failed tests automatically capture traces. Open them with:

```bash
pnpm exec playwright show-trace test-results/<test-name>/trace.zip
```

### Run Specific Test

```bash
pnpm test:e2e -g "should display connections"
```

### Debug Mode

```bash
pnpm exec playwright test --debug
```

Opens the Playwright Inspector for step-by-step debugging.

## Writing New Tests

Create new test files in the `e2e/` directory with the `.spec.ts` extension:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#element')).toBeVisible();
  });
});
```

### Best Practices

1. **Use semantic locators**: Prefer `getByRole`, `getByText`, or `getByTestId` over CSS selectors
2. **Wait for elements**: Use `await expect(locator).toBeVisible()` instead of arbitrary waits
3. **Keep tests independent**: Each test should work in isolation
4. **Use descriptive test names**: Describe what the test verifies

## CI Integration

Tests run automatically in CI. The configuration ensures:

- Retries on failure (2 retries in CI)
- Single worker for stability
- Traces captured on first retry for debugging
