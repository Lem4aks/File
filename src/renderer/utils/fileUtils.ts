// Utility functions for file operations

/**
 * Formats bytes into human-readable format
 */
export const formatBytes = (bytes: number | null, decimals = 2): string => {
  if (bytes === null) return '-';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Extracts folder name from a path
 */
export const getFolderNameFromPath = (path: string, pathSeparator: string): string => {
  const trimmed = path.endsWith(pathSeparator) ? path.slice(0, -1) : path;
  const parts = trimmed.split(pathSeparator);
  return parts[parts.length - 1] || trimmed;
};

/**
 * Splits a filename into base name and extension
 */
export const splitFileName = (fileName: string): { base: string; ext: string } => {
  const trimmedName = fileName.replace(/\/$/, '');
  const dotIndex = trimmedName.lastIndexOf('.');
  if (dotIndex > 0) {
    return {
      base: trimmedName.substring(0, dotIndex),
      ext: trimmedName.substring(dotIndex),
    };
  }
  return { base: trimmedName, ext: '' };
};
