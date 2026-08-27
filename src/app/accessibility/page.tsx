import type { Metadata } from "next";

import { LegalPage } from "@/components/shell/legal-page";
import { CONTACT_EMAIL, accessibilityStatement } from "@/lib/legal";
import { SITE } from "@/lib/site";

const document = accessibilityStatement(CONTACT_EMAIL);

export const metadata: Metadata = {
  title: document.title,
  description: document.summary,
  alternates: { canonical: `${SITE.url}/accessibility` },
  openGraph: { title: document.title, description: document.summary, url: `${SITE.url}/accessibility` },
};

export default function Page() {
  return <LegalPage document={document} />;
}
