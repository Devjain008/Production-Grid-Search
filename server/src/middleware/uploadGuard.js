const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const MAX_FILES = 500;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const BLOCKED_EXTENSIONS = ['.exe', '.dll', '.so', '.dylib', '.bat', '.cmd', '.vbs', '.ps1'];

/**
 * Validates uploaded zip archive against Zip-Slip, Symlinks, and Decompression Bombs
 */
function validateUploadZip(filePath) {
  let zip;
  try {
    zip = new AdmZip(filePath);
  } catch (err) {
    throw new Error(`Corrupted or unreadable zip archive: ${err.message}`);
  }

  const entries = zip.getEntries();

  if (entries.length > MAX_FILES) {
    throw new Error(`Archive exceeds maximum allowed file count (${entries.length} > ${MAX_FILES})`);
  }

  let totalBytes = 0;

  for (const entry of entries) {
    const rawName = entry.entryName;

    // 1. Zip-Slip Path Traversal Protection
    const normalized = path.normalize(rawName).replace(/^(\.\.(\/|\\|$))+/, '');
    if (rawName.includes('..') || path.isAbsolute(rawName) || /^[a-zA-Z]:/.test(rawName)) {
      throw new Error(`Security Violation: Zip-Slip path traversal attempt detected in entry '${rawName}'`);
    }

    // 2. Symlink Protection
    // Unix file mode stored in upper 16 bits of externalFileAttributes
    const unixMode = (entry.header.attr >> 16) & 0xffff;
    const isSymlink = (unixMode & 0o120000) === 0o120000;
    if (isSymlink) {
      throw new Error(`Security Violation: Symbolic links are forbidden in project uploads (${rawName})`);
    }

    // 3. Decompression Bomb & Size Limit Checks
    const uncompressedSize = entry.header.size || 0;
    if (uncompressedSize > MAX_SINGLE_FILE_BYTES) {
      throw new Error(`File '${rawName}' exceeds single file size limit (10MB)`);
    }

    totalBytes += uncompressedSize;
    if (totalBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error(`Archive exceeds total uncompressed decompression limit (${Math.round(totalBytes / 1024 / 1024)}MB > 50MB)`);
    }

    // 4. Blocked Executable Extensions
    const ext = path.extname(rawName).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      throw new Error(`Security Violation: Disallowed executable extension '${ext}' in entry '${rawName}'`);
    }
  }

  return {
    valid: true,
    fileCount: entries.length,
    totalSizeBytes: totalBytes
  };
}

module.exports = {
  validateUploadZip,
  MAX_FILES,
  MAX_TOTAL_UNCOMPRESSED_BYTES
};
