/**
 * A PostgREST `or` filter that matches `term` anywhere in any of `columns`.
 * The value is quoted, so commas, dots and brackets in what a visitor types
 * cannot break the filter.
 */
export function ilikeAny(columns: string[], term: string): string {
  const value = `"%${term.replace(/[\\"]/g, "\\$&")}%"`;
  return columns.map((column) => `${column}.ilike.${value}`).join(",");
}
