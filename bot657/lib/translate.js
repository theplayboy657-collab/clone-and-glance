const fetch = require("node-fetch");
const config = require("../config");

const SKIP_MARKER = "FR_SKIP";

/**
 * Traduit un texte vers le français si besoin.
 * Retourne null si le texte est déjà en français (ou trop court pour être fiable).
 */
async function translateIfNeeded(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!text || text.trim().length < 3) return null;

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
        max_tokens: 400,
        system: `Tu es un détecteur+traducteur. Si le message fourni est déjà en français, réponds EXACTEMENT "${SKIP_MARKER}" et rien d'autre. Sinon, réponds uniquement avec sa traduction en français, sans commentaire ni guillemets.`,
        messages: [{ role: "user", content: text }],
      }),
    });

    const data = await res.json();
    if (data.error) return null;

    const textBlock = data.content?.find((c) => c.type === "text");
    const result = textBlock?.text?.trim();

    if (!result || result === SKIP_MARKER) return null;
    return result;
  } catch (e) {
    console.error("Erreur traduction:", e);
    return null;
  }
}

module.exports = { translateIfNeeded };
