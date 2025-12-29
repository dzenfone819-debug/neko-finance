import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = path.resolve(__dirname, '..', 'dist');
const dest = path.resolve(__dirname, '..', '..', 'server', 'public');

async function copy() {
  try {
    await fs.promises.access(src);
  } catch (err) {
    console.error(`Source folder not found: ${src}`);
    process.exit(1);
  }

  try {
    // Clean destination directory to avoid stale artifacts
    try {
      const destEntries = await fs.promises.readdir(dest, { withFileTypes: true });
      for (const entry of destEntries) {
        // Preserve uploads folder and git keep/ignore files to avoid removing user-uploaded files
        if (entry.name === 'uploads' || entry.name === '.gitignore' || entry.name === '.gitkeep') continue;
        const entryPath = path.join(dest, entry.name);
        await fs.promises.rm(entryPath, { recursive: true, force: true });
      }
    } catch (e) {
      // If dest doesn't exist, create it
      await fs.promises.mkdir(dest, { recursive: true });
    }

    // Ensure dest exists
    await fs.promises.mkdir(dest, { recursive: true });

    if (fs.promises.cp) {
      await fs.promises.cp(src, dest, { recursive: true });
    } else {
      // Fallback for older Node: simple recursive copy
      await copyRecursive(src, dest);
    }

    console.log(`Cleaned and copied ${src} -> ${dest}`);
  } catch (err) {
    console.error('Copy failed:', err);
    process.exit(1);
  }
}

async function copyRecursive(srcDir, destDir) {
  const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await fs.promises.mkdir(destPath, { recursive: true });
      await copyRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

copy();
