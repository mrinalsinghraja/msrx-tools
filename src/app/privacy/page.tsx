import type { Metadata } from "next";

import { LegalPage } from "@/components/shell/legal-page";
import { CONTACT_EMAIL, privacyNotice } from "@/lib/legal";
import { SITE } from "@/lib/site";

const document = privacyNotice(CONTACT_EMAIL);

export const metadata: Metadata = {
  title: document.title,
  description: document.summary,
  alternates: { canonical: `${SITE.url}/privacy` },
  openGraph: { title: document.title, description: document.summary, url: `${SITE.url}/privacy` },
};

export default function Page() {
  return <LegalPage document={document} />;
}
