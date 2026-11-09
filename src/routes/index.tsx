import { createFileRoute } from "@tanstack/react-router";

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
  return (
    <iframe
      src="/chronosphere.html"
      title="Chronosphere"
      className="block h-screen w-full border-0"
    />
  );
}
