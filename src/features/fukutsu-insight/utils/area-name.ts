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

const AREA_NAME_ALIASES: Record<string, string> = {
  手光南１丁目: "手光南",
};

/** 公開資料ごとに異なる「五丁目」「５丁目」などの表記をそろえます。 */
export function normalizeAreaName(name: string) {
  const normalized = name
    .trim()
    .replace(
      /[一二三四五六七八九十](?=丁目)/g,
      (numeral) => CHOME_NUMERALS[numeral] ?? numeral,
    );
  return AREA_NAME_ALIASES[normalized] ?? normalized;
}

interface BoundaryIdentity {
  areaCode: string;
  name: string;
}

/**
 * 最新統計と国勢調査では地域コードの体系が異なるため、同じ条件では照合しません。
 * 最新統計は地域名、国勢調査は地域コードで境界を特定します。
 */
export function matchesBoundarySelection(
  boundary: BoundaryIdentity,
  selected: BoundaryIdentity,
  mode: "latest" | "census",
) {
  return mode === "latest"
    ? normalizeAreaName(boundary.name) === normalizeAreaName(selected.name)
    : boundary.areaCode === selected.areaCode;
}
