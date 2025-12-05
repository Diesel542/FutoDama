export function splitSummaryIntoParagraphs(summary: string): string[] {
  if (!summary) return [];

  const trimmed = summary.trim();

  const manualParas = trimmed.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (manualParas.length > 1) {
    return manualParas;
  }

  const sentences = trimmed.match(/[^.!?]+[.!?]/g) || [trimmed];

  const paragraphs: string[] = [];
  let buffer: string[] = [];

  for (const sentence of sentences) {
    buffer.push(sentence.trim());
    if (buffer.join(" ").length > 250) {
      paragraphs.push(buffer.join(" "));
      buffer = [];
    }
  }
  if (buffer.length > 0) {
    paragraphs.push(buffer.join(" "));
  }

  return paragraphs;
}
