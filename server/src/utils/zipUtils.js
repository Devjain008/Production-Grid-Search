const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const AdmZip = require('adm-zip');

/**
 * Robust, cross-platform zip extraction with multi-tier fallback:
 * Tier 1: AdmZip (Pure JS in-memory extractor)
 * Tier 2: bsdtar / system tar (Handles large archives, Zip64, trailing bytes without offset bugs)
 * Tier 3: PowerShell Expand-Archive (Native Windows fallback)
 *
 * @param {string} zipPath - Path to source zip archive
 * @param {string} targetDir - Directory where files should be extracted
 * @returns {{ success: boolean, targetDir: string, method: string }}
 */
function extractZipSafely(zipPath, targetDir) {
  if (!fs.existsSync(zipPath)) {
    throw new Error(`Archive file not found at: ${zipPath}`);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  let extractionSuccess = false;
  let lastError = null;
  let methodUsed = '';

  // Tier 1: Try AdmZip
  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(targetDir, true);

    const files = fs.readdirSync(targetDir);
    if (files.length > 0) {
      extractionSuccess = true;
      methodUsed = 'adm-zip';
    }
  } catch (admErr) {
    lastError = admErr;
    console.warn(`[zipUtils] AdmZip extraction failed (${admErr.message}). Falling back to system extraction...`);
  }

  // Tier 2: Try bsdtar / system tar
  if (!extractionSuccess) {
    try {
      cp.execSync(`tar -xf "${zipPath}" -C "${targetDir}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        timeout: 60000
      });

      const files = fs.readdirSync(targetDir);
      if (files.length > 0) {
        extractionSuccess = true;
        methodUsed = 'bsdtar';
        console.log(`[zipUtils] Successfully extracted archive using system tar.`);
      }
    } catch (tarErr) {
      lastError = tarErr;
      console.warn(`[zipUtils] System tar extraction failed (${tarErr.message}). Falling back to PowerShell Expand-Archive...`);
    }
  }

  // Tier 3: PowerShell Expand-Archive (on Windows)
  if (!extractionSuccess && process.platform === 'win32') {
    try {
      const psZip = zipPath.replace(/'/g, "''");
      const psDest = targetDir.replace(/'/g, "''");
      const psCmd = `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '${psZip}' -DestinationPath '${psDest}' -Force"`;
      cp.execSync(psCmd, {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        timeout: 90000
      });

      const files = fs.readdirSync(targetDir);
      if (files.length > 0) {
        extractionSuccess = true;
        methodUsed = 'powershell';
        console.log(`[zipUtils] Successfully extracted archive using PowerShell Expand-Archive.`);
      }
    } catch (psErr) {
      lastError = psErr;
      console.error(`[zipUtils] PowerShell Expand-Archive failed: ${psErr.message}`);
    }
  }

  if (!extractionSuccess) {
    throw new Error(`Failed to extract project zip archive: ${lastError ? lastError.message : 'Unknown extraction failure'}`);
  }

  return {
    success: true,
    targetDir,
    method: methodUsed
  };
}

module.exports = {
  extractZipSafely
};
