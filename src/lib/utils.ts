import { stat } from "node:fs/promises";

export async function findAvailablePath(paths: string[]): Promise<string | null> {
  const exists = await Promise.all(
    paths.map((path) =>
      stat(path).then(
        () => true,
        () => false,
      ),
    ),
  );

  return paths.find((_, i) => exists[i]) ?? null;
}
