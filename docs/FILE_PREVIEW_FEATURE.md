# File Preview Feature

## Overview

The file preview feature allows users to quickly preview images and text files directly in the browser without needing to download them first. This enhances the user experience by providing instant visual feedback for supported file types.

## Implementation Details

### 1. API Endpoint (`/api/buckets/[bucket]/preview`)

**Location**: `src/app/api/buckets/[bucket]/preview/route.ts`

**Features**:
- Serves files with `Content-Disposition: inline` for browser preview
- Automatically detects content type from file extension and metadata
- Supports caching with `Cache-Control` headers (1 hour)
- Returns appropriate error messages for unsupported file types

**Supported File Types**:

#### Images
- JPG/JPEG, PNG, GIF, WebP, SVG, BMP, ICO

#### Text Files
- Plain text: `.txt`, `.log`
- Markup: `.html`, `.htm`, `.xml`, `.md`, `.csv`
- Stylesheets: `.css`
- Data: `.json`, `.yaml`, `.yml`
- Code files: `.js`, `.ts`, `.tsx`, `.jsx`, `.py`, `.java`, `.cpp`, `.c`, `.h`, `.cs`, `.go`, `.rs`, `.rb`, `.php`, `.sh`, `.bash`

### 2. FilePreview Component

**Location**: `src/components/FilePreview.tsx`

**Features**:
- Modal-based interface with overlay
- Responsive design that works on all screen sizes
- Automatic content type detection
- Loading states with spinner
- Error handling with retry functionality
- Keyboard support (Escape to close)
- Download button for quick file download
- Image viewer with automatic sizing
- Text viewer with syntax-aware formatting

**UI Elements**:
- Header with file name and type indicator
- Close button (X icon)
- Content area with scrolling for large files
- Footer with Download and Close buttons

### 3. Integration in Buckets Page

**Location**: `src/app/buckets/page.tsx`

**Features Added**:
- Preview button in the metadata panel (green button with eye icon)
- Shows only for previewable file types
- Keyboard shortcut: `p` key to preview selected file
- Automatic state management for preview modal

**User Flow**:
1. User selects a file in the object list
2. If the file is previewable, a "Preview" button appears in the metadata panel
3. User clicks "Preview" or presses `p` key
4. Modal opens showing the file content
5. User can view, download, or close the preview

## Keyboard Shortcuts

- `p` - Preview the currently selected file (only works for previewable files)
- `Escape` - Close the preview modal

## Technical Implementation

### Content Type Detection

The system uses a two-tier approach for content type detection:

1. **Primary**: Check object metadata for content-type
2. **Fallback**: Determine from file extension

This ensures maximum compatibility across different cloud storage providers.

### Lazy Loading

The FilePreview component is dynamically imported to reduce initial bundle size:

```typescript
const FilePreview = dynamic(
  () => import('@/components/FilePreview').then((mod) => mod.FilePreview),
  { ssr: false }
);
```

### Security Considerations

- Preview endpoint validates credentials before serving files
- Uses the existing authentication system
- No direct file access without proper credentials
- Content-Type validation prevents serving potentially dangerous files

## Usage Examples

### Previewing an Image

1. Browse to a bucket containing images
2. Click on an image file (e.g., `photo.jpg`)
3. Click the green "Preview" button in the details panel
4. The image appears in a modal window
5. Press Escape or click Close to exit

### Previewing a Text File

1. Browse to a bucket containing code or text files
2. Click on a text file (e.g., `config.json`)
3. Click the "Preview" button
4. The file content appears in a formatted code block
5. Scroll through the content if needed
6. Download or close when done

## Benefits

1. **Faster Workflow**: No need to download files to view them
2. **Better UX**: Instant visual feedback for file content
3. **Bandwidth Savings**: Preview without full download
4. **Improved Productivity**: Quick verification of file contents
5. **Keyboard Friendly**: Full keyboard navigation support

## Future Enhancements

Potential improvements for future versions:

- PDF preview support
- Video/audio playback
- Syntax highlighting for code files
- Full-screen mode for images
- Zoom controls for images
- Side-by-side comparison mode
- File editing capabilities
- Preview thumbnails in object list
