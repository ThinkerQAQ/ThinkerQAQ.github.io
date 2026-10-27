/**
 * Article IDs already include the translation directory (for example en/intro).
 * Encode each segment without losing that identity.
 * @param {string} articleId
 * @returns {string}
 */
export function articleSourceHref(articleId) {
  if (!articleId || articleId.startsWith("/") || articleId.endsWith("/") || articleId.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new TypeError("An article source URL requires a non-empty relative article ID");
  }
  return `/article-source/${articleId.split("/").map(encodeURIComponent).join("/")}.md`;
}
