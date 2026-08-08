export function parseFileIds(raw: string | null): string[] {
  if (!raw) return [];

  const parsed: unknown = JSON.parse(raw);

  return Array.isArray(parsed) ? (parsed as string[]) : [];
}
