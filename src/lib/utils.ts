import { stat } from "node:fs/promises";

export function parseFileIds(raw: string | null): string[] {
  if (!raw) return [];

  const parsed: unknown = JSON.parse(raw);

  return Array.isArray(parsed) ? (parsed as string[]) : [];
}

export async function findAvailablePath(paths: string[]): Promise<string | null> {
  for (const path of paths) {
    try {
      await stat(path);
      return path;
    } catch {
      // try next candidate
    }
  }

  return null;
}
