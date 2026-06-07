import { KeysetCursor, OffsetCursor, PaginationCursor } from '../types';

export function encodeCursor(cursor: PaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export function decodeCursor(raw: string): PaginationCursor | null {
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (parsed.kind === 'keyset' && parsed.date && parsed.createdAt && parsed.id) {
      return parsed as KeysetCursor;
    }
    if (parsed.kind === 'offset' && typeof parsed.offset === 'number') {
      return parsed as OffsetCursor;
    }
    return null;
  } catch {
    return null;
  }
}
