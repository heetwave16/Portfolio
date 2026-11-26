/** Split heading copy into words and literal whitespace text nodes without losing spaces. */
export function splitTextWithWhitespace(text: string): string[] {
  return text.match(/\s+|\S+/gu) ?? [];
}
