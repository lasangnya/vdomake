import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const TILE_WIDTH = 320;
const TILE_HEIGHT = 200;
const COLUMNS = 2;
const GAP = 8;
const BACKGROUND = '#ffffff';

/**
 * Composes local screenshot files into a single contact-sheet PNG so the
 * vision model can see the full page flow in one call. Each tile is scaled to
 * fit (TILE_WIDTH × TILE_HEIGHT) and centered in its grid cell; the sheet
 * reads left-to-right, top-to-bottom matching the capture order.
 *
 * Returns a PNG buffer with a mimeType of "image/png".
 */
export async function buildContactSheet(filePaths: string[]): Promise<Buffer> {
  if (filePaths.length === 0) {
    throw new Error('No screenshots to compose into a contact sheet');
  }

  const thumbs = await Promise.all(
    filePaths.map(async (filePath) => {
      const data = await fs.readFile(path.resolve(filePath)).catch(() => null);
      if (data === null) {
        return null;
      }
      return sharp(data)
        .resize({ width: TILE_WIDTH, height: TILE_HEIGHT, fit: 'inside' })
        .png()
        .toBuffer();
    }),
  );

  const valid: Buffer[] = [];
  for (const thumb of thumbs) {
    if (thumb !== null) valid.push(thumb);
  }
  if (valid.length === 0) {
    throw new Error('None of the screenshots could be read for the contact sheet');
  }

  const cols = Math.min(COLUMNS, valid.length);
  const rows = Math.ceil(valid.length / cols);
  const canvasWidth = cols * TILE_WIDTH + (cols - 1) * GAP;
  const canvasHeight = rows * TILE_HEIGHT + (rows - 1) * GAP;

  const composites = valid.map((thumb, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      input: thumb,
      left: col * (TILE_WIDTH + GAP),
      top: row * (TILE_HEIGHT + GAP),
    };
  });

  return sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: BACKGROUND,
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

/**
 * Resolves an API-relative screenshot URL (/api/files/...) to a local disk
 * path under the uploads directory. Returns null for non-relative URLs.
 */
export function screenshotToDiskPath(screenshotUrl: string, uploadsRoot: string): string | null {
  if (!screenshotUrl.startsWith('/api/files/')) {
    return null;
  }
  const relative = screenshotUrl.replace(/^\/api\/files\//, '');
  return path.join(uploadsRoot, relative);
}
