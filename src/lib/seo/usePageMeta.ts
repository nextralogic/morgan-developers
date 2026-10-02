import { useEffect } from "react";
import { DEFAULT_OG_IMAGE_ALT, SITE_NAME, serializeJsonLd, type MetaTags } from "./core";
import { DEFAULT_OG_IMAGE } from "./constants";

export type PageMeta = MetaTags;

function setMeta(name: string, content: string | undefined, attr: "name" | "property" = "name") {
  let el = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string | undefined) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!href) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(blocks: MetaTags["jsonLd"]) {
  document.head.querySelectorAll('script[type="application/ld+json"][data-seo]').forEach((el) => el.remove());
  for (const data of blocks ?? []) {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo", "");
    script.textContent = serializeJsonLd(data);
    document.head.appendChild(script);
  }
}

/**
 * Keeps document.title, description, robots, canonical, Open Graph, Twitter
 * and JSON-LD in sync with the current page. The same tags are rendered into
 * the initial HTML by the edge function, so this only updates them in place.
 * Pass null while data is loading to leave the current tags untouched.
 */
export function usePageMeta(meta: PageMeta | null) {
  const jsonLdKey = JSON.stringify(meta?.jsonLd ?? []);

  useEffect(() => {
    if (!meta) return;
    const title = meta.title;
    const ogImage = meta.ogImage ?? DEFAULT_OG_IMAGE;

    document.title = title;
    setMeta("description", meta.description);
    setMeta("robots", meta.robots);
    setLink("canonical", meta.canonical);

    setMeta("og:site_name", SITE_NAME, "property");
    setMeta("og:type", meta.ogType ?? "website", "property");
    setMeta("og:title", title, "property");
    setMeta("og:description", meta.description, "property");
    setMeta("og:url", meta.canonical, "property");
    setMeta("og:image", ogImage, "property");
    setMeta("og:image:alt", meta.ogImageAlt ?? DEFAULT_OG_IMAGE_ALT, "property");

    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", meta.description);
    setMeta("twitter:image", ogImage);

    setJsonLd(meta.jsonLd);
    // jsonLdKey stands in for the jsonLd array so a new array with the same content does not re-run this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta?.title, meta?.description, meta?.robots, meta?.canonical, meta?.ogType, meta?.ogImage, meta?.ogImageAlt, jsonLdKey]);
}
