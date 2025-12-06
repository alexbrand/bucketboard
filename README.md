# BucketBoard

A high-performance web-based object storage explorer for managing cloud storage across multiple platforms.

## Overview

BucketBoard is designed to be a fast, intuitive, and powerful interface for exploring and managing object storage across all major cloud providers. Built with performance in mind, it provides a unified experience for working with cloud storage regardless of the underlying platform.

## Goals

### High Performance

- **Fast navigation** through large buckets with millions of objects
- **Efficient data loading** using pagination, virtual scrolling, and lazy loading
- **Optimized transfers** for upload and download operations
- **Minimal latency** with intelligent caching and prefetching strategies

### Full CRUD Operations

- **Create**: Upload files, create folders, and initialize new storage containers
- **Read**: Browse, search, and preview objects with metadata inspection
- **Update**: Modify object metadata, permissions, and storage classes
- **Delete**: Remove objects and containers with batch operations support

### Multi-Cloud Support

Support for all major cloud storage platforms:

- **AWS S3** - Amazon Simple Storage Service
- **Azure Blob Storage** - Microsoft Azure Storage
- **Google Cloud Storage** - GCP object storage
- **MinIO** - Self-hosted S3-compatible storage
- **Backblaze B2** - Cost-effective cloud storage
- **DigitalOcean Spaces** - S3-compatible object storage
- **Wasabi** - Hot cloud storage
- And other S3-compatible storage providers

## Key Features

### Implemented

- 🚀 **High-performance UI** with responsive design and virtual scrolling
- 🔄 **Real-time operations** with progress tracking
- 🔍 **Advanced search** and filtering capabilities
- 📊 **Metadata management** and bulk operations
- 🔐 **Secure authentication** with multiple credential management
- 📁 **Hierarchical folder views** despite flat object structure
- ⚡ **Concurrent operations** for improved throughput
- 📈 **Storage analytics** and usage insights
- 🔄 **Multi-region support** for global deployments
- ⌨️ **Keyboard shortcuts** for efficient navigation and actions ([See full documentation](KEYBOARD_SHORTCUTS.md))
- 💾 **Intelligent caching** with prefetching for optimal performance

### Planned Capabilities

- 🎨 **Enhanced interface** for managing permissions and ACLs
- 🌙 **Dark mode** support (ThemeProvider component exists, needs full implementation)

## Architecture

### Design Principles

- Simple, fast, and local-first
- Single-command startup with `npm run dev`
- Credentials stored securely server-side
- No CORS configuration required on buckets

### Technology Stack

**Framework**

- **Next.js** - Full-stack React framework with API routes
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling

**Cloud SDKs** (server-side)

- **AWS SDK for JavaScript** - S3 and S3-compatible storage
- **@azure/storage-blob** - Azure Blob Storage
- **@google-cloud/storage** - Google Cloud Storage

**Development**

- **ESLint** + **Prettier** - Code quality and formatting

## Getting Started

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run the development server:
   ```bash
   pnpm dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Local Testing with Docker Compose

For local testing without connecting to real cloud services, you can use the included Docker Compose setup with emulators for all three providers:

1. Start the emulators:
   ```bash
   docker compose up -d
   ```

2. Configure credentials (see `DOCKER_SETUP.md` for detailed instructions):
   ```bash
   mkdir -p data
   cp credentials.yaml.example data/credentials.yaml
   ```

3. Start the application and test against the local emulators.

4. Seed buckets with test data (optional):
   ```bash
   pnpm seed localstack-s3 test-bucket --count 100
   ```

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for complete setup instructions and [scripts/README.md](./scripts/README.md) for seeding script documentation.

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Security Checks

This project uses [pre-commit](https://pre-commit.com) to run security checks (like gitleaks) before each commit.

To set it up locally:

1. Install pre-commit: `brew install pre-commit` (or via pip: `pip install pre-commit`)
2. Install the git hooks:
   ```bash
   pre-commit install
   ```

Now checks will run automatically on every commit.

## License

_(License information to be added)_

## Roadmap

See [tasks.md](./tasks.md) for detailed implementation status. Most core features are complete including:

- ✅ Core infrastructure setup
- ✅ AWS S3, Azure Blob Storage, and Google Cloud Storage integration
- ✅ High-performance UI with virtual scrolling
- ✅ Batch operations support
- ✅ Search and filtering capabilities
- ✅ Metadata management
- ✅ Storage analytics dashboard
- ✅ Multi-cloud credential management

**Status**: 🚀 Core features complete, ready for use
