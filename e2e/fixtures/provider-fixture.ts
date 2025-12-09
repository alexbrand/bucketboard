import { test as base } from '@playwright/test';

export type ProviderFixtures = {
  provider: string;
};

export const providerFixture = base.extend<ProviderFixtures>({
  provider: async ({}, use, testInfo) => {
    // Get provider from project configuration
    // TypeScript doesn't know about custom properties, so we need to access it via index
    const provider = (testInfo.project.use as any).provider as string | undefined;
    if (!provider) {
      throw new Error('Provider not configured for this project. Make sure the project has `use: { provider: "<connection-id>" }` set.');
    }
    await use(provider);
  },
});
