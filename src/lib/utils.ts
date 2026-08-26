import { stat } from "node:fs/promises";

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
