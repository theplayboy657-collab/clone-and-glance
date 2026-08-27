const fs = require("fs");
const path = require("path");
const config = require("../config");

function sessionDirPath() {
  return path.resolve(__dirname, "..", config.SESSION_DIR.replace(/^\.\//, ""));
}

/**
 * Lit tous les fichiers de session (identifiants + clés Baileys) et les
 * encode en une seule chaîne base64, facile à copier-coller.
 */
function encodeSessionToKey() {
  const dir = sessionDirPath();
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  if (files.length === 0) return null;

  const bundle = {};
  for (const file of files) {
    bundle[file] = fs.readFileSync(path.join(dir, file), "utf-8");
  }

  return Buffer.from(JSON.stringify(bundle)).toString("base64");
}

/**
 * Reconstruit le dossier de session à partir d'une clé générée par encodeSessionToKey().
 * Retourne true si la clé était valide et exploitable.
 */
function writeKeyToSession(key) {
  try {
    const bundle = JSON.parse(Buffer.from(key, "base64").toString("utf-8"));
    const dir = sessionDirPath();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    for (const [filename, content] of Object.entries(bundle)) {
      fs.writeFileSync(path.join(dir, filename), content, "utf-8");
    }
    return true;
  } catch (e) {
    console.error("Clé de session invalide :", e.message);
    return false;
  }
}

function hasLocalSession() {
  const dir = sessionDirPath();
  return fs.existsSync(dir) && fs.readdirSync(dir).some((f) => f.endsWith(".json"));
}

module.exports = { encodeSessionToKey, writeKeyToSession, hasLocalSession };
