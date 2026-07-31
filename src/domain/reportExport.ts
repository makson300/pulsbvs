export type DelimitedValue = string | number | null | undefined;

function escapeDelimitedValue(value: DelimitedValue, separator: string) {
  const text = value === null || value === undefined ? '' : String(value);
  return /["\r\n]/.test(text) || text.includes(separator)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

export function toDelimitedText(rows: DelimitedValue[][], separator = ';') {
  return rows.map((row) => row.map((value) => escapeDelimitedValue(value, separator)).join(separator)).join('\r\n');
}
