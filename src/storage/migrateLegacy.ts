/**
 * Copia claves localStorage de Lectura Fiel → Lektor (una sola vez).
 * No borra las viejas por si hace falta recuperar.
 */
export function migrateLegacyLocalStorage(
  storage: Storage = localStorage,
): void {
  try {
    if (storage.getItem('lektor:migrated-from-lectura-fiel') === '1') return
    const keys: string[] = []
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i)
      if (k) keys.push(k)
    }
    for (const key of keys) {
      if (!key.startsWith('lectura-fiel:')) continue
      const next = `lektor:${key.slice('lectura-fiel:'.length)}`
      if (storage.getItem(next) == null) {
        const value = storage.getItem(key)
        if (value != null) storage.setItem(next, value)
      }
    }
    storage.setItem('lektor:migrated-from-lectura-fiel', '1')
  } catch {
    /* ignore quota / private mode */
  }
}
