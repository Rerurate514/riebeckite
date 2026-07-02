import fs, { mkdir } from "node:fs/promises";
import path from "node:path";
import { ASSETS_ROOT, CONTENT_DIR } from "../app/constants/paths";
import { IMAGE_EXTENSIONS } from "../app/constants/image_exts";

async function copyImages() {
  const entries = await fs.readdir(CONTENT_DIR, {
    withFileTypes: true,
    recursive: true,
  });

  let copied = 0;
  let failed = 0;

  for (const entry of entries) {
    if (
      entry.isFile() &&
      IMAGE_EXTENSIONS.includes(
        path.extname(entry.name).replace(".", "").toLowerCase(),
      )
    ) {
      try {
        const currentDir = entry.parentPath;
        const relativePath = path.relative(CONTENT_DIR, currentDir);
        const basePath = path.join(currentDir, entry.name).normalize("NFC");
        const targetPath = path
          .join(ASSETS_ROOT, relativePath, entry.name)
          .normalize("NFC");
        await mkdir(path.dirname(targetPath), { recursive: true });
        await fs.copyFile(basePath, targetPath);
        copied++;
      } catch (e) {
        failed++;
        console.error(`Failed to copy ${entry.name}:`, e);
      }
    }
  }

  console.log(`Copied ${copied} image(s), ${failed} failed`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}
