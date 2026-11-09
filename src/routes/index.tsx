import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chronosphere — The Atlas of Oddities" },
      { name: "description", content: "A time-travelling map of Earth's strangest true stories." },
      { property: "og:title", content: "Chronosphere — The Atlas of Oddities" },
      { property: "og:description", content: "A time-travelling map of Earth's strangest true stories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const languageRef = useRef("en");
  const [language, setLanguage] = useState("en");

  const applyLanguage = useCallback((nextLanguage: string, attempts = 0) => {
    const frame = frameRef.current;
    const childWindow = frame?.contentWindow;
    const combo = frame?.contentDocument?.querySelector<HTMLSelectElement>(".goog-te-combo");

    if (!childWindow || !combo) {
      if (attempts < 40) window.setTimeout(() => applyLanguage(nextLanguage, attempts + 1), 200);
      return;
    }

    combo.value = nextLanguage;
    combo.dispatchEvent(new childWindow.Event("change", { bubbles: true }));
    if (frame.contentDocument?.documentElement) {
      frame.contentDocument.documentElement.lang = nextLanguage === "sk" ? "sk" : "en";
    }
  }, []);

  const initializeTranslation = useCallback(() => {
    const frame = frameRef.current;
    const childWindow = frame?.contentWindow;
    const childDocument = frame?.contentDocument;
    if (!childWindow || !childDocument || childDocument.getElementById("google_translate_element")) return;

    const host = childDocument.createElement("div");
    host.id = "google_translate_element";
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden";
    childDocument.body.appendChild(host);

    const style = childDocument.createElement("style");
    style.textContent = ".goog-te-banner-frame.skiptranslate{display:none!important}body{top:0!important}.goog-tooltip,.goog-tooltip:hover{display:none!important}";
    childDocument.head.appendChild(style);

    const translatedWindow = childWindow as Window & {
      google?: { translate?: { TranslateElement: new (options: object, elementId: string) => unknown } };
      googleTranslateElementInit?: () => void;
    };
    translatedWindow.googleTranslateElementInit = () => {
      const TranslateElement = translatedWindow.google?.translate?.TranslateElement;
      if (TranslateElement) {
        new TranslateElement({ pageLanguage: "en", includedLanguages: "en,sk", autoDisplay: false }, host.id);
        applyLanguage(languageRef.current);
      }
    };

    const script = childDocument.createElement("script");
    script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    childDocument.head.appendChild(script);
  }, [applyLanguage]);

  const changeLanguage = (nextLanguage: string) => {
    languageRef.current = nextLanguage;
    setLanguage(nextLanguage);
    applyLanguage(nextLanguage);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <iframe
        ref={frameRef}
        src="/chronosphere.html"
        title="Chronosphere"
        onLoad={initializeTranslation}
        className="block h-full w-full border-0"
      />
      <div className="absolute right-4 top-4 z-10 rounded-md border border-black/15 bg-white/90 p-1 shadow-lg backdrop-blur">
        <label htmlFor="language-switch" className="sr-only">Choose language</label>
        <select
          id="language-switch"
          value={language}
          onChange={(event) => changeLanguage(event.target.value)}
          className="cursor-pointer rounded border-0 bg-transparent px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-blue-600"
          aria-label="Choose language / Vyberte jazyk"
        >
          <option value="en">English</option>
          <option value="sk">Slovenčina</option>
        </select>
      </div>
    </div>
  );
}
