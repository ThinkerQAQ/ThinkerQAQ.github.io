import { SITE } from "../config/site";

export const SITE_WEBSITE_ID = new URL("/#website", SITE.url).toString();
export const SITE_AUTHOR_ID = new URL(`${SITE.authorProfilePath}#person`, SITE.url).toString();

export function siteAuthorSchema() {
  return {
    "@type": "Person",
    "@id": SITE_AUTHOR_ID,
    name: SITE.author,
    alternateName: [...SITE.alternateNames],
    url: new URL(SITE.authorProfilePath, SITE.url).toString(),
    sameAs: [...SITE.profiles],
  };
}

export function siteWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": SITE_WEBSITE_ID,
    name: SITE.title,
    alternateName: [...SITE.alternateNames],
    url: new URL("/", SITE.url).toString(),
    creator: siteAuthorSchema(),
  };
}

export function profilePageSchema({
  path,
  name,
  description,
  inLanguage,
}: {
  path: string;
  name: string;
  description: string;
  inLanguage: string;
}) {
  const url = new URL(path, SITE.url).toString();
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${url}#profile`,
    url,
    name,
    description,
    inLanguage,
    isPartOf: { "@id": SITE_WEBSITE_ID },
    mainEntity: siteAuthorSchema(),
  };
}
