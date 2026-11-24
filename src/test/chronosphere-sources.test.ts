import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, describe, expect, it } from "vitest";

const openApps: JSDOM[] = [];

afterEach(() => {
  for (const app of openApps.splice(0)) app.window.close();
});

function loadMap(file: string) {
  const app = new JSDOM(readFileSync(path.resolve(__dirname, "../..", file), "utf8"), {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "http://localhost/",
    beforeParse(window) {
      window.localStorage.setItem("chronosphere:myvotes", '["emu:b"]');
    },
  });
  openApps.push(app);

  const document = app.window.document;
  const openFact = (id: string) => {
    const marker = document.querySelector(`#markers .marker[data-id="${id}"]`);
    if (!marker) throw new Error(`Missing fact: ${id}`);
    marker.dispatchEvent(new app.window.MouseEvent("click", { bubbles: true }));
  };
  const sourceLinks = () => Array.from(document.querySelectorAll<HTMLAnchorElement>("#dossier .sources a"));

  return { app, document, openFact, sourceLinks };
}

describe.each(["public/chronosphere.html", "index.html"])("fact sources: %s", (file) => {
  it("provides direct external references for all 53 facts", () => {
    const { document, openFact, sourceLinks } = loadMap(file);
    const factIds = Array.from(document.querySelectorAll<HTMLElement>("#markers .marker"), (marker) => {
      const id = marker.dataset["id"];
      if (!id) throw new Error("Fact has no identifier");
      return id;
    });
    expect(factIds).toHaveLength(53);

    for (const id of factIds) {
      openFact(id);
      const links = sourceLinks();
      expect(links.length, `References for ${id}`).toBeGreaterThan(0);
      for (const link of links) {
        const url = new URL(link.href);
        expect(url.protocol, id).toBe("https:");
        expect(url.hostname, id).not.toBe("localhost");
        expect(url.pathname, id).not.toBe("/");
        expect(url.pathname, id).not.toMatch(/\/search\/?$/);
      }
    }
  });

  it("updates reference destinations when following a related fact", () => {
    const { app, document, openFact, sourceLinks } = loadMap(file);
    openFact("emu");
    const originalUrls = sourceLinks().map((link) => link.href);
    const related = document.querySelector<HTMLElement>("#dossier [data-go]");
    const relatedId = related?.dataset["go"];
    if (!related || !relatedId) throw new Error("Missing related fact");
    related.dispatchEvent(new app.window.MouseEvent("click", { bubbles: true }));

    const relatedUrls = sourceLinks().map((link) => link.href);
    expect(relatedUrls.length).toBeGreaterThan(0);
    expect(relatedUrls).not.toEqual(originalUrls);
    openFact(relatedId);
    expect(sourceLinks().map((link) => link.href)).toEqual(relatedUrls);
  });

  it("does not modify previously saved votes when opening facts", () => {
    const { app, openFact } = loadMap(file);
    openFact("emu");
    openFact("bloop");
    expect(app.window.localStorage.getItem("chronosphere:myvotes")).toBe('["emu:b"]');
  });
});