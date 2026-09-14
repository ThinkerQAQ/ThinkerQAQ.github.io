const SUPPORTED_CONTENT_LOCALES = new Set(["zh", "en"]);

export function contentLanguage(collection, id, data = {}) {
  const explicit = String(data.language || "").trim().toLowerCase();
  if (explicit) {
    if (!SUPPORTED_CONTENT_LOCALES.has(explicit)) {
      throw new Error(`Unsupported content language ${explicit} for ${collection}/${id}`);
    }
    return explicit;
  }

  // English articles already live under src/content/articles/en/. Keep this
  // inference so older translated articles without an explicit language field
  // still receive the correct public route during a schema migration.
  if (collection === "articles" && id.startsWith("en/")) return "en";
  return "zh";
}

export function contentSourceUrl(blogOrigin, collection, id, language) {
  const origin = String(blogOrigin || "").replace(/\/$/, "");
  let routeId = id;

  // Article IDs include the locale directory in the content collection, while
  // public localized routes place the locale before /articles/.
  if (collection === "articles" && language !== "zh" && routeId.startsWith(`${language}/`)) {
    routeId = routeId.slice(language.length + 1);
  }

  const encodedId = routeId.split("/").map(encodeURIComponent).join("/");
  const localePrefix = language === "zh" ? "" : `/${language}`;
  return `${origin}${localePrefix}/${collection}/${encodedId}/`;
}
