const CJK_CHARACTER_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const WORD_PATTERN = /[\p{L}\p{N}_]+(?:['’.-][\p{L}\p{N}_]+)*/gu;

export function estimateReadingMinutes(text) {
  const source = String(text ?? "");
  const cjkCharacters = source.match(CJK_CHARACTER_PATTERN)?.length ?? 0;
  const nonCjkText = source.replace(CJK_CHARACTER_PATTERN, " ");
  const latinWords = nonCjkText.match(WORD_PATTERN)?.length ?? 0;
  const minutes = (cjkCharacters / 500) + (latinWords / 265);
  return Math.max(1, Math.ceil(minutes));
}

export default function readingTimeMarkdown() {
  return {
    name: "reading-time",
    after(root, context) {
      const text = context.textContent(root);
      const readingMinutes = estimateReadingMinutes(text);
      const astroData = context.data?.astro;
      if (astroData?.frontmatter) {
        astroData.frontmatter.readingMinutes = readingMinutes;
      }
    },
  };
}
