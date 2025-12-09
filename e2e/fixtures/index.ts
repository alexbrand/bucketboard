import { mergeTests } from '@playwright/test';
import { providerFixture } from './provider-fixture';
import { bucketFixture } from './bucket-fixture';

export const test = mergeTests(providerFixture, bucketFixture);

export { expect } from '@playwright/test';
