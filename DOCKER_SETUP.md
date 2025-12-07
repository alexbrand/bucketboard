# Docker Compose Setup for Local Testing

This Docker Compose setup provides local emulators for all three cloud storage providers, allowing you to test BucketBoard without connecting to real cloud services.

## Services

The setup includes three emulator services:

1. **LocalStack** - AWS S3 emulator (port 4566)
2. **Azurite** - Azure Blob Storage emulator (ports 10000-10002)
3. **fake-gcs-server** - Google Cloud Storage emulator (port 4443)

## Quick Start

1. **Start the emulators:**
   ```bash
   docker compose up -d
   ```

2. **Verify services are running:**
   ```bash
   docker compose ps
   ```

3. **Check service health:**
   ```bash
   # LocalStack
   curl http://localhost:4566/_localstack/health
   
   # Azurite
   curl http://localhost:10000/devstoreaccount1
   
   # fake-gcs-server
   curl http://localhost:4443/storage/v1/b
   ```

4. **Stop the emulators:**
   ```bash
   docker compose down
   ```

5. **Stop and remove all data:**
   ```bash
   docker compose down -v
   ```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize as needed:

```bash
cp .env.example .env
```

The `.env` file contains default credentials for each emulator that you can use in your `data/connections.yaml` file.

### Connections Configuration

You can use `connections.yaml.example` as a template. Copy it to `data/connections.yaml` and customize as needed:

```bash
mkdir -p data
cp connections.yaml.example data/connections.yaml
```


Or add connections manually to your `data/connections.yaml` file using the following templates:

#### AWS S3 (LocalStack)

```yaml
connections:
  localstack-s3:
    id: localstack-s3
    provider: aws-s3
    name: LocalStack S3
    config:
      accessKeyId: ${AWS_ACCESS_KEY_ID:-test}
      secretAccessKey: ${AWS_SECRET_ACCESS_KEY:-test}
      region: ${AWS_REGION:-us-east-1}
      endpoint: ${LOCALSTACK_ENDPOINT:-http://localhost:4566}
    createdAt: "2024-01-01T00:00:00.000Z"
    updatedAt: "2024-01-01T00:00:00.000Z"
```

#### Azure Blob Storage (Azurite)

```yaml
connections:
  azurite-blob:
    id: azurite-blob
    provider: azure-blob
    name: Azurite Blob Storage
    config:
      accountName: ${AZURE_STORAGE_ACCOUNT_NAME:-devstoreaccount1}
      accountKey: ${AZURE_STORAGE_ACCOUNT_KEY:-Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==}
      endpoint: http://localhost:10000/devstoreaccount1
    createdAt: "2024-01-01T00:00:00.000Z"
    updatedAt: "2024-01-01T00:00:00.000Z"
```

#### Google Cloud Storage (fake-gcs-server)

```yaml
connections:
  fake-gcs:
    id: fake-gcs
    provider: gcp-storage
    name: Fake GCS Server
    config:
      projectId: ${GCP_PROJECT_ID:-test-project}
      clientEmail: ${GCP_SERVICE_ACCOUNT_EMAIL:-test@test-project.iam.gserviceaccount.com}
      privateKey: ${GCP_PRIVATE_KEY:------BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n}
      apiEndpoint: http://localhost:4443
    createdAt: "2024-01-01T00:00:00.000Z"
    updatedAt: "2024-01-01T00:00:00.000Z"
```

**Note:** For fake-gcs-server, you need to provide a valid service account JSON structure. The emulator doesn't validate credentials, but the GCP SDK requires a properly formatted private key. You can generate a dummy key or use the example format above.

## Creating Test Buckets/Containers

### Using the Seeding Script (Recommended)

The easiest way to create buckets and populate them with test data is using the included seeding script:

```bash
# Seed a bucket with 100 files (bucket will be created automatically)
pnpm seed localstack-s3 test-bucket

# Seed with more files
pnpm seed azurite-blob test-container --count 1000

# Seed with a prefix
pnpm seed fake-gcs test-bucket --count 500 --prefix "uploads/"
```

See [scripts/README.md](./scripts/README.md) for complete documentation.

### Manual Creation

#### LocalStack (S3)

```bash
# Using AWS CLI (if installed)
aws --endpoint-url=http://localhost:4566 s3 mb s3://test-bucket

# Or using curl
curl -X PUT http://localhost:4566/test-bucket
```

#### Azurite (Azure Blob)

```bash
# Using Azure CLI (if installed)
az storage container create \
  --name test-container \
  --connection-string "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://localhost:10000/devstoreaccount1;"

# Or using curl
curl -X PUT "http://localhost:10000/devstoreaccount1/test-container?restype=container"
```

#### fake-gcs-server (GCS)

```bash
# Using gsutil (if installed with custom endpoint)
gsutil -o "Credentials:gs_json_host=localhost" -o "Credentials:gs_json_port=4443" mb gs://test-bucket

# Or using curl
curl -X POST "http://localhost:4443/storage/v1/b?project=test-project" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-bucket"}'
```

## Provider-Specific Notes

### AWS S3 (LocalStack)

- **Endpoint:** `http://localhost:4566`
- **Region:** Any region works (e.g., `us-east-1`)
- **Connection Details:** Any values work (e.g., `test`/`test`)
- **Path-style URLs:** Required (already configured in the provider)

### Azure Blob Storage (Azurite)

- **Account Name:** `devstoreaccount1` (default development account)
- **Account Key:** `Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==`
- **Endpoint:** `http://localhost:10000/devstoreaccount1` (must be set in connection config)

### Google Cloud Storage (fake-gcs-server)

- **API Endpoint:** `http://localhost:4443` (must be set in connection config as `apiEndpoint`)
- **Project ID:** Any value works (e.g., `test-project`)
- **Connection Details:** The emulator doesn't validate credentials, but the SDK requires a valid JSON structure with `client_email` and `private_key` fields

## Troubleshooting

### Services won't start

- Check if ports are already in use:
  ```bash
  lsof -i :4566  # LocalStack
  lsof -i :10000 # Azurite
  lsof -i :4443  # fake-gcs-server
  ```

### Connection errors

- Ensure services are healthy:
  ```bash
  docker compose ps
  ```

- Check service logs:
  ```bash
  docker compose logs localstack
  docker compose logs azurite
  docker compose logs fake-gcs
  ```

### Data persistence

Data is stored in Docker volumes and persists between container restarts. To reset all data:

```bash
docker compose down -v
docker compose up -d
```

## Additional Resources

- [LocalStack Documentation](https://docs.localstack.cloud/)
- [Azurite Documentation](https://github.com/Azure/Azurite)
- [fake-gcs-server Documentation](https://github.com/fsouza/fake-gcs-server)
