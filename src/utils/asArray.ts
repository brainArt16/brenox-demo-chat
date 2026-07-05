/** Go APIs may JSON-encode empty slices as `null`; keep UI lists safe. */
export function asArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
