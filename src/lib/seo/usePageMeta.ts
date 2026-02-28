import { useEffect } from "react";
import { SITE_NAME } from "./constants";

export interface PageMeta {
  title: string;
  description?: string;
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  ogUrl?: string;
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Sets document.title, meta description, OG tags, and canonical link.
 * Call once per page with the relevant data.
 */
export function usePageMeta(meta: PageMeta) {
  useEffect(() => {
    document.title = meta.title.includes(SITE_NAME)
      ? meta.title
      : `${meta.title} | ${SITE_NAME}`;

    if (meta.description) setMeta("description", meta.description);

    setMeta("og:title", meta.ogTitle ?? meta.title, "property");
    setMeta("og:type", meta.ogType ?? "website", "property");
    if (meta.ogDescription ?? meta.description)
      setMeta("og:description", (meta.ogDescription ?? meta.description)!, "property");
    if (meta.ogImage) setMeta("og:image", meta.ogImage, "property");
    if (meta.ogUrl ?? meta.canonicalUrl)
      setMeta("og:url", (meta.ogUrl ?? meta.canonicalUrl)!, "property");

    if (meta.canonicalUrl) setLink("canonical", meta.canonicalUrl);
  }, [meta.title, meta.description, meta.canonicalUrl, meta.ogTitle, meta.ogDescription, meta.ogImage, meta.ogType, meta.ogUrl]);
}
