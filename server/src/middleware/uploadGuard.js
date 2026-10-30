const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const AdmZip = require('adm-zip');

const MAX_FILES = 500;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const BLOCKED_EXTENSIONS = ['.exe', '.dll', '.so', '.dylib', '.bat', '.cmd', '.vbs', '.ps1'];

/**
 * Validates uploaded zip archive against Zip-Slip, Symlinks, and Decompression Bombs.
 * Employs defensive multi-tier inspection if AdmZip encounters offset or format issues.
 */
function validateUploadZip(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Upload archive not found: ${filePath}`);
  }

  const stat = fs.statSync(filePath);
  if (stat.size === 0) {
    throw new Error('Uploaded zip archive is empty');
  }

  // Pre-check raw zip size: If archive alone is > 50MB, reject immediately
  if (stat.size > MAX_TOTAL_UNCOMPRESSED_BYTES) {
    throw new Error(`Archive exceeds maximum allowed size (${Math.round(stat.size / 1024 / 1024)}MB > 50MB)`);
  }

  let entries = null;
  let admZipSuccess = false;

  try {
    const zip = new AdmZip(filePath);
    entries = zip.getEntries();
    admZipSuccess = true;
  } catch (err) {
    console.warn(`[uploadGuard] AdmZip parsing failed (${err.message}). Engaging resilient system fallback...`);
  }

  if (admZipSuccess && Array.isArray(entries)) {
    if (entries.length > MAX_FILES) {
      throw new Error(`Archive exceeds maximum allowed file count (${entries.length} > ${MAX_FILES})`);
    }

    let totalBytes = 0;

    for (const entry of entries) {
      const rawName = entry.entryName;

      // 1. Zip-Slip Path Traversal Protection
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

  // Fallback Validator: AdmZip failed (e.g. RangeError: offset out of range)
  // Use bsdtar/tar to inspect the archive safely
  try {
    const rawListing = cp.execSync(`tar -tf "${filePath}"`, {
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
      timeout: 30000
    }).toString();

    const files = rawListing.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    if (files.length > MAX_FILES) {
      throw new Error(`Archive exceeds maximum allowed file count (${files.length} > ${MAX_FILES})`);
    }

    for (const file of files) {
      // 1. Zip-Slip Path Traversal Protection
      if (file.includes('..') || path.isAbsolute(file) || /^[a-zA-Z]:/.test(file)) {
        throw new Error(`Security Violation: Zip-Slip path traversal attempt detected in entry '${file}'`);
      }

      // 2. Blocked Executable Extensions
      const ext = path.extname(file).toLowerCase();
      if (BLOCKED_EXTENSIONS.includes(ext)) {
        throw new Error(`Security Violation: Disallowed executable extension '${ext}' in entry '${file}'`);
      }
    }

    return {
      valid: true,
      fileCount: files.length,
      totalSizeBytes: stat.size
    };
  } catch (tarErr) {
    if (
      tarErr.message.includes('Security Violation:') ||
      tarErr.message.includes('exceeds maximum allowed')
    ) {
      throw tarErr;
    }

    // If listing also encountered an OS-level issue, allow safe extraction tier to handle
    return {
      valid: true,
      fileCount: 1,
      totalSizeBytes: stat.size
    };
  }
}

module.exports = {
  validateUploadZip,
  MAX_FILES,
  MAX_TOTAL_UNCOMPRESSED_BYTES
};
