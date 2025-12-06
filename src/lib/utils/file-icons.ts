import {
  File,
  Image,
  Video,
  Music,
  FileText,
  Code,
  Archive,
  Folder,
  type LucideIcon,
} from 'lucide-react';

export function getFileExtension(key: string): string {
  const fileName = key.split('/').filter(Boolean).pop() || '';
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

export function getFileType(key: string): string {
  const ext = getFileExtension(key);
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
  const documentExts = ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx'];
  const codeExts = [
    'js',
    'ts',
    'tsx',
    'jsx',
    'py',
    'java',
    'cpp',
    'c',
    'h',
    'cs',
    'go',
    'rs',
    'rb',
    'php',
    'sh',
    'bash',
    'zsh',
    'fish',
    'html',
    'css',
    'scss',
    'sass',
    'less',
    'json',
    'xml',
    'yaml',
    'yml',
    'md',
    'vue',
    'svelte',
  ];
  const archiveExts = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2', 'xz'];

  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (documentExts.includes(ext)) return 'document';
  if (codeExts.includes(ext)) return 'code';
  if (archiveExts.includes(ext)) return 'archive';
  return 'other';
}

export function getFileIcon(key: string, isFolder: boolean = false): LucideIcon {
  if (isFolder) {
    return Folder;
  }

  const fileType = getFileType(key);

  switch (fileType) {
    case 'image':
      return Image;
    case 'video':
      return Video;
    case 'audio':
      return Music;
    case 'document':
      return FileText;
    case 'code':
      return Code;
    case 'archive':
      return Archive;
    default:
      return File;
  }
}
