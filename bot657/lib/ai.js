const fetch = require("node-fetch");
const config = require("../config");

/**
 * Envoie l'historique de conversation à l'API Claude et retourne la réponse texte.
 * history = [{ role: "user"|"assistant", content: "..." }, ...]
 */
async function askAI(history, systemPrompt = config.AI_SYSTEM_PROMPT) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return "⚠️ Le mode chat n'est pas configuré : ajoute la variable d'environnement ANTHROPIC_API_KEY sur Render.";
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.AI_MODEL,
        max_tokens: 800,
        system: systemPrompt,
        messages: history,
      }),
    });

    const data = await res.json();

    if (data.error) {
      console.error("Erreur API Claude:", data.error);
      return `⚠️ Erreur IA : ${data.error.message || "inconnue"}`;
    }

    const textBlock = data.content?.find((c) => c.type === "text");
    return textBlock?.text || "⚠️ Réponse vide de l'IA.";
  } catch (err) {
    console.error("Erreur appel IA:", err);
    return "⚠️ Impossible de contacter l'IA pour le moment.";
  }
}

module.exports = { askAI };

/**
 * Pose une question avec accès à la recherche web en temps réel
 * (utilise l'outil de recherche intégré de l'API Claude — pas besoin
 * d'une clé d'API de recherche séparée).
 */
async function askAIWithSearch(query) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return "⚠️ Recherche non configurée : ajoute la variable d'environnement ANTHROPIC_API_KEY sur Render.";
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.AI_MODEL,
        max_tokens: 800,
        system:
          "Tu réponds à des questions via WhatsApp. Sois concis (quelques phrases ou une petite liste), en français, et base-toi sur les résultats de recherche web quand c'est pertinent.",
        messages: [{ role: "user", content: query }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    const data = await res.json();

    if (data.error) {
      console.error("Erreur API Claude (search):", data.error);
      return `⚠️ Erreur recherche : ${data.error.message || "inconnue"}`;
    }

    const textBlocks = (data.content || []).filter((c) => c.type === "text");
    const answer = textBlocks.map((b) => b.text).join("\n").trim();
    return answer || "⚠️ Aucune réponse trouvée.";
  } catch (err) {
    console.error("Erreur recherche IA:", err);
    return "⚠️ Impossible de faire la recherche pour le moment.";
  }
}

module.exports.askAIWithSearch = askAIWithSearch;
