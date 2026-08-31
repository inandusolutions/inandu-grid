/** Quotes `value` for a CSV cell (doubling internal quotes) only if it contains a comma, quote, or newline. */
export function escapeCsvValue(value: string): string {
  return /[",\r\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
}
