import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "657 — Connexion" },
      {
        name: "description",
        content:
          "Connecte ton WhatsApp au bot 657 : entre ton numéro pour recevoir un code de jumelage.",
      },
      { property: "og:title", content: "657 — Connexion" },
      {
        property: "og:description",
        content: "Connecte ton WhatsApp au bot 657 via un code de jumelage.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PairingPage,
});

const BACKEND_URL_KEY = "bot657.backendUrl";
const DEFAULT_BACKEND = (import.meta.env["VITE_BOT_BACKEND_URL"] as string) || "";

function normalizeBackend(url: string) {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function PairingPage() {
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  const [showBackendConfig, setShowBackendConfig] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(BACKEND_URL_KEY);
    if (saved) setBackendUrl(saved);
  }, []);

  function saveBackend(url: string) {
    const normalized = normalizeBackend(url);
    setBackendUrl(normalized);
    localStorage.setItem(BACKEND_URL_KEY, normalized);
    setShowBackendConfig(false);
  }

  async function requestCode() {
    setError("");
    setCode("");
    const cleanNumber = number.replace(/[^0-9]/g, "");
    if (!cleanNumber || cleanNumber.length < 8) {
      setError("Entre un numéro valide au format international, sans le +.");
      return;
    }

    setLoading(true);
    try {
      const base = normalizeBackend(backendUrl);
      const url = base ? `${base}/request-code` : "/request-code";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: cleanNumber }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (res.ok && data.code) {
        setCode(data.code);
      } else {
        setError(data.error || "Impossible de générer le code.");
      }
    } catch {
      setError("Erreur de connexion au serveur. Vérifie que le backend est en ligne.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b141a] p-4 text-[#e9edef]">
      <div className="w-full max-w-[380px] rounded-2xl bg-[#202c33] p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.4)]">
        <h1 className="mb-2 text-2xl font-bold">657</h1>
        <p className="mb-6 text-sm text-[#8696a0]">
          Entre ton numéro WhatsApp (format international, sans le +) pour obtenir ton code de jumelage.
        </p>

        <input
          type="text"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Ex: 33612345678"
          className="mb-4 w-full rounded-lg border border-[#2a3942] bg-[#2a3942] px-4 py-3.5 text-base text-[#e9edef] outline-none placeholder:text-[#8696a0]"
        />

        <button
          onClick={() => void requestCode()}
          disabled={loading}
          className="w-full rounded-lg bg-[#00a884] px-4 py-3.5 text-base font-semibold text-white transition-opacity disabled:opacity-60"
        >
          {loading ? "Génération..." : "Obtenir le code"}
        </button>

        {code && (
          <div className="mt-6">
            <div className="text-3xl font-bold tracking-[6px] text-[#00a884]">{code}</div>
            <p className="mt-3 text-xs text-[#8696a0]">
              Va dans WhatsApp → Paramètres → Appareils connectés → Connecter un appareil →
              Connecter avec un numéro de téléphone, puis entre ce code.
            </p>
            <p className="mt-2 text-xs text-[#8696a0]">
              Une fois connecté, le bot t'enverra un fichier session-key.txt à coller dans
              SESSION_KEY pour éviter de repasser par cette page.
            </p>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-[#f15c6d]">{error}</p>}

        {!backendUrl && (
          <div className="mt-6 border-t border-[#2a3942] pt-4">
            {!showBackendConfig ? (
              <button
                onClick={() => setShowBackendConfig(true)}
                className="text-xs text-[#8696a0] underline hover:text-[#e9edef]"
              >
                Configurer l'URL du backend Render
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://bot657.onrender.com"
                  className="flex-1 rounded border border-[#2a3942] bg-[#2a3942] px-2 py-1.5 text-xs text-[#e9edef] outline-none placeholder:text-[#8696a0]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveBackend(e.currentTarget.value);
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                    saveBackend(input.value);
                  }}
                  className="rounded bg-[#00a884] px-3 py-1.5 text-xs text-white"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
