import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "657 — Connexion du bot WhatsApp" },
      {
        name: "description",
        content:
          "Page de pairing du bot WhatsApp 657 : génère ton code de connexion et relie ton numéro en quelques secondes.",
      },
      { property: "og:title", content: "657 — Connexion du bot WhatsApp" },
      {
        property: "og:description",
        content:
          "Page de pairing du bot WhatsApp 657 : génère ton code de connexion et relie ton numéro en quelques secondes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/pairing.html"
      title="657 — Connexion"
      className="h-screen w-full border-0"
    />
  );
}
