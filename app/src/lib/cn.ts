/** Tiny class-name joiner — avoids pulling in a dependency for four lines. */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(' ')
}
