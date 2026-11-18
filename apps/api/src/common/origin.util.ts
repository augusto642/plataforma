const DEFAULT_CORS_ORIGIN = 'http://localhost:3001';

export function parseCorsOrigins(value: string | undefined): string[] {
  const entries = (value ?? DEFAULT_CORS_ORIGIN)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const origins = new Set<string>();
  for (const entry of entries) {
    let url: URL;
    try {
      url = new URL(entry);
    } catch {
      throw new Error(`Invalid CORS_ORIGIN entry "${entry}".`);
    }

    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        `Invalid CORS_ORIGIN entry "${entry}": expected an HTTP(S) origin without credentials or a path.`,
      );
    }

    origins.add(url.origin);
  }

  return [...origins];
}
