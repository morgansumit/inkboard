/**
 * Transforms a Cloudinary URL to serve an optimized version.
 * - f_auto: serves WebP/AVIF automatically based on browser support
 * - q_auto: Cloudinary picks the best quality/size trade-off
 * - w_<width>: resizes to the requested width
 *
 * Leaves non-Cloudinary URLs untouched.
 */
export function optimizeCloudinaryUrl(
  url: string | null | undefined,
  width: number = 800,
): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com')) return url;

  const uploadMarker = '/upload/';
  const uploadIndex = url.indexOf(uploadMarker);
  if (uploadIndex === -1) return url;

  const before = url.substring(0, uploadIndex + uploadMarker.length);
  const after = url.substring(uploadIndex + uploadMarker.length);

  // Avoid double-transforming if transformations already present
  // Transformations look like "c_fill,w_800/" — they contain commas or start with known prefixes
  if (/^[cfghlqrstuwxy]_/.test(after)) return url;

  return `${before}f_auto,q_auto,w_${width}/${after}`;
}

/** Small avatar images — 64px wide */
export function avatarUrl(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, 64);
}

/** Card cover images — 900px wide (fits 2-column masonry on retina) */
export function cardImageUrl(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, 900);
}

/** Hero / detail page images — 1400px wide */
export function heroImageUrl(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, 1400);
}
