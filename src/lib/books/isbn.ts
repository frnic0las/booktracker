// Client-safe ISBN helpers, importable from both client components (the barcode
// scanner and manual-entry sheet) and the server-only Google Books client.
// Detection validates the checksum so numeric titles — or barcode misreads —
// are not mistaken for an ISBN.

function isValidIsbn13(isbn: string): boolean {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === Number(isbn[12]);
}

function isValidIsbn10(isbn: string): boolean {
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(isbn[i]) * (10 - i);
  }
  sum += isbn[9] === "X" ? 10 : Number(isbn[9]);
  return sum % 11 === 0;
}

/**
 * Returns the ISBN normalized (hyphens and spaces stripped, uppercased) when
 * `raw` is a checksum-valid ISBN-13 or ISBN-10, or null otherwise.
 */
export function normalizeIsbn(raw: string): string | null {
  const stripped = raw.replace(/[\s-]/g, "").toUpperCase();

  if (/^\d{13}$/.test(stripped) && isValidIsbn13(stripped)) {
    return stripped;
  }

  if (/^\d{9}[\dX]$/.test(stripped) && isValidIsbn10(stripped)) {
    return stripped;
  }

  return null;
}

/** Whether `raw` is a checksum-valid ISBN-13 or ISBN-10. */
export function isValidIsbn(raw: string): boolean {
  return normalizeIsbn(raw) !== null;
}
