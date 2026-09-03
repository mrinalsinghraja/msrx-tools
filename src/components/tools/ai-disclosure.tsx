import { ServerCog } from "lucide-react";

/**
 * The AI category's standing disclosure.
 *
 * Rendered from the registry on every tool whose engine is `ai`, rather than
 * written into each of their pages. Two reasons, and the second is the one that
 * matters. It is a fact about the category, so twenty-three copies of it would
 * be twenty-three places for it to drift out of date. And a promise that is
 * repeated by hand tends to get softened by hand — the version on the page
 * nobody reread would be the vaguest one. This is the only copy.
 */
export function AiDisclosure() {
  return (
    <aside className="plate mt-8 rounded-lg border-pen-rev/30 p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-pen-rev-wash text-pen-rev">
          <ServerCog className="size-4" aria-hidden />
        </span>
        <h2 className="stamp text-base font-semibold text-graphite">Where this one is different</h2>
      </div>

      <div className="mt-3 flex flex-col gap-3 text-[14px] leading-relaxed text-graphite-soft">
        <p>
          Every other tool on this site does its work inside the tab you have open. Files are read
          by your own browser, nothing is uploaded, and the page keeps working with the network
          disconnected. That is not true here. The AI tools need a language model, a language model
          is far too large to run in a browser tab, so the text you put in the box is sent to our
          server and passed to an AI provider to be worked on.
        </p>
        <p>
          What is sent is the text you typed and the settings you chose. Nothing else — no file you
          have used elsewhere on this site, no record of other tools you have opened, and no
          identifier, because there are no accounts here to identify you with. Your text is not
          written to any database, log or file that we keep. The provider&rsquo;s own retention is
          the provider&rsquo;s, which is the honest limit of what anyone can promise about text sent
          off a device.
        </p>
        <p>
          So the practical advice is the plain one:{" "}
          <strong className="font-medium text-graphite">
            do not paste anything here you would not paste into someone else&rsquo;s website
          </strong>{" "}
          — client data, credentials, unpublished work, medical or legal details. For everything
          else, use it freely. And read what comes back: it is generated, it can be wrong, and it is
          confident either way.
        </p>
      </div>
    </aside>
  );
}
