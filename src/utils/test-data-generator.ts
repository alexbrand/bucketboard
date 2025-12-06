/**
 * Test data generator for virtual scrolling performance testing
 * This utility generates mock storage objects for testing with large datasets
 */

interface MockStorageObject {
  key: string;
  size: number;
  lastModified: string;
  etag?: string;
  storageClass?: string;
  isFolder?: boolean;
}

/**
 * Generates a large number of mock storage objects for testing
 * @param count Number of objects to generate
 * @param prefix Optional prefix for all object keys
 * @param includeFolders Whether to include folder objects
 * @returns Array of mock storage objects
 */
export function generateMockObjects(
  count: number,
  prefix: string = '',
  includeFolders: boolean = true
): MockStorageObject[] {
  const objects: MockStorageObject[] = [];
  const fileExtensions = ['jpg', 'png', 'pdf', 'txt', 'csv', 'json', 'xml', 'mp4', 'zip', 'docx'];
  const storageClasses = ['STANDARD', 'STANDARD_IA', 'INTELLIGENT_TIERING', 'GLACIER'];
  
  // Generate some folders first (10% of count)
  if (includeFolders) {
    const folderCount = Math.floor(count * 0.1);
    for (let i = 0; i < folderCount; i++) {
      objects.push({
        key: `${prefix}folder-${i.toString().padStart(4, '0')}/`,
        size: 0,
        lastModified: randomDate(new Date(2020, 0, 1), new Date()).toISOString(),
        isFolder: true,
      });
    }
  }

  // Generate files
  const fileCount = includeFolders ? count - objects.length : count;
  for (let i = 0; i < fileCount; i++) {
    const ext = fileExtensions[Math.floor(Math.random() * fileExtensions.length)];
    const size = Math.floor(Math.random() * 100000000); // Up to 100MB
    const date = randomDate(new Date(2020, 0, 1), new Date());
    
    objects.push({
      key: `${prefix}file-${i.toString().padStart(6, '0')}.${ext}`,
      size,
      lastModified: date.toISOString(),
      etag: `"${randomETag()}"`,
      storageClass: storageClasses[Math.floor(Math.random() * storageClasses.length)],
      isFolder: false,
    });
  }

  return objects;
}

/**
 * Generates a random date between start and end
 */
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Generates a random ETag (MD5 hash-like string)
 */
function randomETag(): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Performance test for rendering large lists
 * Logs timing information to the console
 */
export function testVirtualScrollingPerformance() {
  console.log('🧪 Virtual Scrolling Performance Test');
  console.log('=====================================');
  
  const testSizes = [100, 500, 1000, 5000, 10000];
  
  testSizes.forEach((size) => {
    const startTime = performance.now();
    const objects = generateMockObjects(size);
    const generateTime = performance.now() - startTime;
    
    console.log(`\n📊 Test with ${size} objects:`);
    console.log(`   Generation time: ${generateTime.toFixed(2)}ms`);
    console.log(`   Memory usage: ~${((JSON.stringify(objects).length / 1024) / 1024).toFixed(2)}MB`);
    console.log(`   Folders: ${objects.filter(o => o.isFolder).length}`);
    console.log(`   Files: ${objects.filter(o => !o.isFolder).length}`);
  });
  
  console.log('\n✅ Performance test complete!');
}

// Example usage in development:
// import { generateMockObjects, testVirtualScrollingPerformance } from '@/utils/test-data-generator';
// 
// In a component:
// const mockObjects = generateMockObjects(10000);
// 
// In console:
// testVirtualScrollingPerformance();
