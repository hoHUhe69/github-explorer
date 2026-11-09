import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const HTML = readFileSync(path.resolve(__dirname, "../../public/chronosphere.html"), "utf8");

function loadApp() {
  const dom = new JSDOM(HTML, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "http://localhost/",
  });
  const doc = dom.window.document;
  const marker = doc.querySelector("#markers .marker") as HTMLElement;
  const id = marker.dataset["id"]!;
  marker.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  const reacts = () => Array.from(doc.querySelectorAll(".reacts button")) as HTMLElement[];
  const btnOf = (key: string) => reacts().find((b) => b.dataset["r"] === key)!;
  const countOf = (key: string) => {
    const btn = btnOf(key);
    return Number(btn.textContent!.match(/(\d+)\s*$/)![1]);
  };
  const clickEmoji = (key: string) => {
    btnOf(key).dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  };
  return { dom, doc, id, btnOf, countOf, clickEmoji };
}

describe("emoji reactions", () => {
  it("adds exactly one vote on the first click and removes it on the second", () => {
    const { countOf, clickEmoji } = loadApp();
    const start = countOf("b");

    clickEmoji("b");
    expect(countOf("b")).toBe(start + 1);

    clickEmoji("b");
    expect(countOf("b")).toBe(start);

    clickEmoji("b");
    expect(countOf("b")).toBe(start + 1);
  });

  it("marks the emoji as voted while the vote is held", () => {
    const { btnOf, clickEmoji } = loadApp();
    expect(btnOf("w").classList.contains("active")).toBe(false);
    clickEmoji("w");
    expect(btnOf("w").classList.contains("active")).toBe(true);
    clickEmoji("w");
    expect(btnOf("w").classList.contains("active")).toBe(false);
  });

  it("keeps each emoji's vote independent", () => {
    const { countOf, clickEmoji } = loadApp();
    const bStart = countOf("b");
    const qStart = countOf("q");

    clickEmoji("b");
    expect(countOf("q")).toBe(qStart);

    clickEmoji("q");
    expect(countOf("b")).toBe(bStart + 1);
    expect(countOf("q")).toBe(qStart + 1);
  });

  it("remembers the visitor's votes across a reload", () => {
    const first = loadApp();
    first.clickEmoji("b");
    const stored = first.dom.window.localStorage.getItem("chronosphere:myvotes");
    expect(stored).toContain(`${first.id}:b`);

    const second = new JSDOM(HTML, {
      runScripts: "dangerously",
      pretendToBeVisual: true,
      url: "http://localhost/",
      storageQuota: 10_000,
      beforeParse(win: { localStorage: { setItem(key: string, value: string): void } }) {
        win.localStorage.setItem("chronosphere:myvotes", stored!);
      },
    });
    const doc = second.window.document;
    (doc.querySelector("#markers .marker") as HTMLElement).dispatchEvent(
      new second.window.MouseEvent("click", { bubbles: true }),
    );
    const btn = doc.querySelector(".reacts button[data-r='b']") as HTMLElement;
    expect(btn.classList.contains("active")).toBe(true);
  });
});
