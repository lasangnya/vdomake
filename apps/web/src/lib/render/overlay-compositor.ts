import sharp from 'sharp';
import type { TextOverlay } from '@/types/scene';

export interface CompositeOptions {
  width: number;
  height: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Builds an SVG layer containing the text overlays, positioned by percentage
 * and sized relative to the frame. Rendered by sharp — no ffmpeg drawtext
 * dependency required.
 */
export function buildOverlaySvg(overlays: TextOverlay[], options: CompositeOptions): string {
  const { width, height } = options;
  const items = overlays
    .map((overlay) => {
      const x = (overlay.position.x / 100) * width;
      const y = (overlay.position.y / 100) * height;
      const fontSize = Math.max(
        24,
        Math.round((overlay.fontSize / 100) * Math.min(width, height) * 0.9),
      );
      const text = escapeXml(overlay.text);
      return [
        `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-family="${overlay.fontFamily ?? 'sans-serif'}" font-size="${fontSize}" fill="${overlay.color}" text-anchor="middle" dominant-baseline="middle" stroke="rgba(0,0,0,0.5)" stroke-width="${Math.max(1, fontSize / 24)}" paint-order="stroke">${text}</text>`,
      ].join('');
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    items,
    '</svg>',
  ].join('');
}

/**
 * Composites the text overlays onto a screenshot and writes a PNG at the
 * target resolution. Returns the output path.
 */
export async function compositeOverlays(
  screenshotPath: string,
  overlays: TextOverlay[],
  outputPath: string,
  options: CompositeOptions,
): Promise<string> {
  if (overlays.length === 0) {
    await sharp(screenshotPath)
      .resize(options.width, options.height, { fit: 'cover' })
      .png()
      .toFile(outputPath);
    return outputPath;
  }
  const svg = buildOverlaySvg(overlays, options);
  const overlayBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  await sharp(screenshotPath)
    .resize(options.width, options.height, { fit: 'cover' })
    .composite([{ input: overlayBuffer }])
    .png()
    .toFile(outputPath);
  return outputPath;
}
