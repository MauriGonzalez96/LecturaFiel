/** Huella estable de un archivo local para retomar progreso. */
export function bookIdFromFile(file: File): string {
  return `file:${file.name}|${file.size}|${file.lastModified}`
}

export function attachBookIdentity<T extends { sourceName: string }>(
  book: T,
  file: File,
): T & { id: string; sourceSize: number; sourceModified: number } {
  return {
    ...book,
    id: bookIdFromFile(file),
    sourceSize: file.size,
    sourceModified: file.lastModified,
  }
}
