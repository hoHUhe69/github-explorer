import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";

const openApps: JSDOM[] = [];

afterEach(() => {
  for (const app of openApps.splice(0)) app.window.close();
});

function loadMap(file: string, savedLanguage?: string) {
  const app = new JSDOM(readFileSync(path.resolve(__dirname, "../..", file), "utf8"), {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "http://localhost/",
    beforeParse(window) {
      if (savedLanguage) window.localStorage.setItem("chronosphere:lang", savedLanguage);
    },
  });
  openApps.push(app);

  const document = app.window.document;
  const selector = document.querySelector<HTMLSelectElement>("#lang");
  if (!selector) throw new Error("Missing language selector");

  const requestedLanguages: string[] = [];
  const translator = document.createElement("select");
  translator.className = "goog-te-combo";
  for (const language of ["en", "sk"]) {
    const option = document.createElement("option");
    option.value = language;
    translator.appendChild(option);
  }
  translator.addEventListener("change", () => requestedLanguages.push(translator.value));

  const translationWindow = app.window as unknown as {
    google: { translate: { TranslateElement: new () => object } };
    googleTranslateElementInit: () => void;
  };
  translationWindow.google = {
    translate: {
      TranslateElement: class {
        constructor() {
          document.body.appendChild(translator);
        }
      },
    },
  };
  translationWindow.googleTranslateElementInit();

  const choose = (language: string) => {
    selector.value = language;
    selector.dispatchEvent(new app.window.Event("change", { bubbles: true }));
  };

  return { app, document, selector, requestedLanguages, choose };
}

describe.each(["public/chronosphere.html", "index.html"])("bilingual map: %s", (file) => {
  it("requests Slovak and English when the visitor changes languages", () => {
    const { app, document, requestedLanguages, choose } = loadMap(file);

    choose("sk");
    expect(requestedLanguages).toEqual(["sk"]);
    expect(document.documentElement.lang).toBe("sk");
    expect(app.window.localStorage.getItem("chronosphere:lang")).toBe("sk");

    choose("en");
    expect(requestedLanguages).toEqual(["sk", "en"]);
    expect(document.documentElement.lang).toBe("en");
    expect(app.window.localStorage.getItem("chronosphere:lang")).toBe("en");
  });

  it("restores the saved Slovak choice when the translator becomes available", () => {
    const { selector, document, requestedLanguages } = loadMap(file, "sk");

    expect(selector.value).toBe("sk");
    expect(requestedLanguages).toEqual(["sk"]);
    expect(document.documentElement.lang).toBe("sk");
  });
});