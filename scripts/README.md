# Bucket Seeding Script

The `seed-bucket.ts` script allows you to quickly populate buckets/containers with test files for local development and testing.

## Usage

```bash
pnpm seed <connectionId> <bucketName> [options]
```

### Arguments

- `connectionId` - The ID of the connection from your `data/connections.yaml` file
- `bucketName` - The name of the bucket/container to seed

### Options

- `--count, -c <number>` - Number of files to create (default: 100)
- `--prefix, -p <string>` - Prefix for file keys (default: '')
- `--size, -s <number>` - Fixed file size in bytes (default: random 1KB-1MB)
- `--no-folders` - Disable folder objects (default: folders are included)

## Examples

### Basic usage - seed 100 files

```bash
pnpm seed localstack-s3 test-bucket
```

### Seed 1000 files with a prefix

```bash
pnpm seed localstack-s3 test-bucket --count 1000 --prefix "uploads/"
```

### Seed files with fixed size

```bash
pnpm seed azurite-blob test-container --count 500 --size 10240
```

### Seed without folders

```bash
pnpm seed fake-gcs test-bucket --count 200 --no-folders
```

### Seed with custom prefix and count

```bash
pnpm seed localstack-s3 my-bucket -c 5000 -p "data/2024/"
```

## File Generation

The script generates files with:

- **Random file extensions**: jpg, png, pdf, txt, csv, json, xml, mp4, zip, docx
- **Random content**: Generated text content (not actual file formats)
- **Random sizes**: 1KB to 1MB (unless `--size` is specified)
- **Folder structure**: 10% of files are placed in folders (if enabled)
- **Proper content types**: Automatically set based on file extension

## Performance

The script uploads files in batches of 10 for optimal performance. Progress is displayed in real-time, and a summary is shown at the end with:

- Total files uploaded
- Number of errors (if any)
- Total duration
- Average upload rate (files/second)

## Notes

- The script will automatically create the bucket/container if it doesn't exist
- Files are uploaded in parallel batches for better performance
- The script uses the same connection system as the main application
- Works with all three providers: AWS S3 (LocalStack), Azure Blob (Azurite), and GCP Storage (fake-gcs-server)
