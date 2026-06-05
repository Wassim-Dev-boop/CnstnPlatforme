export type GedPreviewRenderMode = 'pdf' | 'image' | 'text' | 'fallback';

const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg']);
const TEXT_MIME_TYPES = new Set(['text/plain', 'text/csv']);

export function resolveGedPreviewRenderMode(mimeType?: string | null, fileName?: string | null): GedPreviewRenderMode {
  const normalizedMime = (mimeType || '').toLowerCase().split(';')[0].trim();
  const extension = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const hasReliableMime =
    normalizedMime.length > 0 &&
    normalizedMime !== 'application/octet-stream' &&
    !normalizedMime.startsWith('application/octet-stream');

  if (hasReliableMime) {
    if (normalizedMime === 'application/pdf') {
      return 'pdf';
    }
    if (IMAGE_MIME_TYPES.has(normalizedMime)) {
      return 'image';
    }
    if (TEXT_MIME_TYPES.has(normalizedMime)) {
      return 'text';
    }
    return 'fallback';
  }

  if (normalizedMime === 'application/pdf' || extension === 'pdf') {
    return 'pdf';
  }
  if (IMAGE_MIME_TYPES.has(normalizedMime) || extension === 'png' || extension === 'jpg' || extension === 'jpeg') {
    return 'image';
  }
  if (TEXT_MIME_TYPES.has(normalizedMime) || extension === 'txt' || extension === 'csv') {
    return 'text';
  }
  return 'fallback';
}

export function supportsGedPrint(renderMode: GedPreviewRenderMode): boolean {
  return renderMode === 'pdf' || renderMode === 'image' || renderMode === 'text';
}
