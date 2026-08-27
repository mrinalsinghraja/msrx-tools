import type { Metadata } from "next";

import { LegalPage } from "@/components/shell/legal-page";
import { CONTACT_EMAIL, termsOfUse } from "@/lib/legal";
import { SITE } from "@/lib/site";

const document = termsOfUse(CONTACT_EMAIL);

export const metadata: Metadata = {
  title: document.title,
  description: document.summary,
  alternates: { canonical: `${SITE.url}/terms` },
  openGraph: { title: document.title, description: document.summary, url: `${SITE.url}/terms` },
};

export default function Page() {
  return <LegalPage document={document} />;
}
