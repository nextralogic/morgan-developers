import { buildBreadcrumbJsonLd, PRIVACY_POLICY_PATH, withBrand, type MetaTags } from "./seo/core.ts";

/**
 * Privacy policy text for /privacy-policy. Shared by the React page and the
 * Netlify edge function, so imports keep their .ts extension. Plain text only;
 * each renderer escapes it.
 */

export const PRIVACY_POLICY_UPDATED = "2026-10-03";

/** "October 3, 2026" for an ISO date, read as UTC so the day never shifts. */
export function formatPolicyDate(isoDate: string, locale = "en-US"): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export interface PolicySection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
  /** Shown after the list. */
  note?: string;
}

export function privacyPolicySections(email: string): PolicySection[] {
  return [
    {
      heading: "Who we are",
      paragraphs: [
        "Morgan Developers runs morgandevelopers.com, a property listing website based in Kathmandu, Nepal. " +
          "This policy explains what information we collect when you use the website, how we use it and the choices you have.",
        `If you have a question about this policy or your information, email us at ${email}.`,
      ],
    },
    {
      heading: "Information we collect",
      items: [
        "Account details: if you create an account, your email address, your password (stored only in hashed form by our sign-in provider), your name and, if you add it, your phone number.",
        "Google sign-in: if you sign in with Google, your name, email address and profile picture from your Google account. We never receive your Google password.",
        "Enquiries: when you ask about a property, your name, email address, phone number and message, any budget or preferred contact time you choose to share, and the property you asked about.",
        "Listings: if you list a property, the details and photos you upload.",
        "Property views: when you open a property page, a random identifier stored in your browser, your account ID if you are signed in, your browser type, and which property you viewed and when. We use this to count views. We do not store your IP address.",
      ],
    },
    {
      heading: "How we use your information",
      items: [
        "To reply to your enquiries and help you buy, sell or rent property.",
        "To run your account and publish the listings you submit.",
        "To show how many people viewed a property and which properties are popular.",
        "To keep the website secure, prevent misuse and keep a record of changes made by our staff.",
      ],
      note: "We do not sell your personal information or use it for advertising.",
    },
    {
      heading: "Who can see your information",
      paragraphs: [
        "Listing details and photos you publish are visible to everyone. Your enquiries and account details are only visible to you and to the Morgan Developers staff who handle them.",
        "We use these service providers, who process information for us and only as needed to run the website:",
      ],
      items: [
        "Supabase, for our database, sign-in and photo storage. Its servers for this website are in Mumbai, India.",
        "Netlify, which hosts the website.",
        "Google, only if you choose to sign in with Google.",
      ],
    },
    {
      heading: "Cookies and browser storage",
      paragraphs: [
        "We do not use advertising or tracking cookies. The website stores a few things in your browser so it works: your sign-in session, your language choice, the random identifier used to count property views and, for staff, whether the admin menu is open. Clearing your browser's site data removes them.",
      ],
    },
    {
      heading: "How long we keep information",
      paragraphs: [
        "We keep your account details until you delete your account or ask us to delete them. We keep enquiries for as long as we need them to follow up with you, and delete them sooner if you ask. Property view records are kept for statistics.",
      ],
    },
    {
      heading: "Your choices",
      paragraphs: [
        `To get a copy of your information, correct it or have it deleted, including your whole account, email us at ${email}. We will reply as soon as we can.`,
      ],
    },
    {
      heading: "Security",
      paragraphs: [
        "The website is only served over HTTPS, and access to stored information is limited by account role, so members of the public cannot see other people's details. No system is completely secure, but we work to protect your information.",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        `This website is not meant for children under 16. If you believe a child has given us personal information, email us at ${email} and we will delete it.`,
      ],
    },
    {
      heading: "Changes to this policy",
      paragraphs: [
        "If we change how we handle your information, we will update this page and the date at the top.",
      ],
    },
  ];
}

export function buildPrivacyPolicyMeta(siteUrl: string): MetaTags {
  const url = `${siteUrl}${PRIVACY_POLICY_PATH}`;
  return {
    title: withBrand("Privacy Policy"),
    description:
      "How Morgan Developers collects, uses and protects your information, " +
      "including accounts, Google sign-in, property enquiries and view counts.",
    canonical: url,
    ogType: "website",
    jsonLd: [
      buildBreadcrumbJsonLd([
        { name: "Home", url: `${siteUrl}/` },
        { name: "Privacy Policy", url },
      ]),
    ],
  };
}
