const CHOME_NUMERALS: Record<string, string> = {
  一: "１",
  二: "２",
  三: "３",
  四: "４",
  五: "５",
  六: "６",
  七: "７",
  八: "８",
  九: "９",
  十: "１０",
};

/** 公開資料ごとに異なる「五丁目」「５丁目」などの表記をそろえます。 */
export function normalizeAreaName(name: string) {
  return name
    .trim()
    .replace(
      /[一二三四五六七八九十](?=丁目)/g,
      (numeral) => CHOME_NUMERALS[numeral] ?? numeral,
    );
}
