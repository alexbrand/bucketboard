import { providerFixture } from './provider-fixture';
import { createTestBucket, cleanupBucket, seedTestData, SeedOptions } from './seed-utils';

export type BucketFixtures = {
  testBucket: string;
  testObjects: string[];
};

export const bucketFixture = providerFixture.extend<BucketFixtures>({
  testBucket: async ({ provider }, use, testInfo) => {
    // Create unique bucket for this test
    // Use testId (which includes file path and test name) plus timestamp for uniqueness
    const testId = testInfo.testId.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const timestamp = Date.now();
    const bucketName = `test-${testId}-${timestamp}`.substring(0, 63); // Bucket names have length limits

    await createTestBucket(provider, bucketName);

    await use(bucketName);

    // Cleanup after test
    await cleanupBucket(provider, bucketName);
  },

  testObjects: async ({ provider, testBucket }, use) => {
    // Seed standard test objects
    const options: SeedOptions = {
      count: 10,
      includeFolders: true,
      includeNested: true,
    };

    const objects = await seedTestData(provider, testBucket, options);

    await use(objects.map((o) => o.key));
  },
});
