import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "657 — Connexion du bot WhatsApp" },
      {
        name: "description",
        content:
          "Console du bot WhatsApp 657 : vérifie l'état du backend, génère ton code de pairing et déploie sur Render en quelques clics.",
      },
      { property: "og:title", content: "657 — Connexion du bot WhatsApp" },
      {
        property: "og:description",
        content:
          "Console du bot WhatsApp 657 : état du backend, code de pairing et déploiement Render.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type BackendStatus = "idle" | "checking" | "online" | "offline" | "notready";

const STORAGE_KEY = "bot657.backendUrl";
const DEFAULT_BACKEND = (import.meta.env["VITE_BOT_BACKEND_URL"] as string) || "";

function normalizeUrl(url: string) {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function Index() {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_BACKEND);
  const [status, setStatus] = useState<BackendStatus>("idle");
  const [statusDetail, setStatusDetail] = useState("");
  const [number, setNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [repo, setRepo] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setBackendUrl(saved);
  }, []);

  const checkStatus = useCallback(async (url: string) => {
    const base = normalizeUrl(url);
    if (!base) {
      setStatus("idle");
      setStatusDetail("Aucune URL de backend renseignée.");
      return;
    }
    setStatus("checking");
    setStatusDetail("");
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${base}/status`, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        setStatus("offline");
        setStatusDetail(`Le serveur a répondu ${res.status}. Vérifie le déploiement Render.`);
        return;
      }
      const data = (await res.json()) as { connected?: boolean };
      if (data.connected) {
        setStatus("online");
        setStatusDetail("Le bot est connecté à WhatsApp.");
      } else {
        setStatus("notready");
        setStatusDetail("Le serveur répond, mais WhatsApp n'est pas encore jumelé.");
      }
    } catch {
      setStatus("offline");
      setStatusDetail(
        "Impossible de joindre le backend (service endormi, URL incorrecte, ou CORS non autorisé).",
      );
    }
  }, []);

  useEffect(() => {
    if (DEFAULT_BACKEND) void checkStatus(DEFAULT_BACKEND);
  }, [checkStatus]);

  useEffect(() => {
    if (status !== "notready") return;
    const id = setInterval(() => void checkStatus(backendUrl), 15000);
    return () => clearInterval(id);
  }, [status, backendUrl, checkStatus]);

  function saveBackend() {
    const base = normalizeUrl(backendUrl);
    setBackendUrl(base);
    localStorage.setItem(STORAGE_KEY, base);
    void checkStatus(base);
  }

  async function requestCode() {
    setError("");
    setCode("");
    const base = normalizeUrl(backendUrl);
    if (!base) return setError("Renseigne d'abord l'URL de ton service Render.");
    if (!/^\d{8,15}$/.test(number.trim()))
      return setError("Entre un numéro au format international, sans le + (ex : 33612345678).");

    setLoading(true);
    try {
      const res = await fetch(`${base}/request-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: number.trim() }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (res.ok && data.code) setCode(data.code);
      else setError(data.error || "Le backend n'a pas pu générer de code.");
    } catch {
      setError("Backend injoignable. Lance une vérification d'état ci-dessus.");
    } finally {
      setLoading(false);
    }
  }

  const deployUrl = repo.trim()
    ? `https://render.com/deploy?repo=${encodeURIComponent(normalizeUrl(repo))}`
    : "https://render.com/deploy";

  const badge = {
    idle: { label: "Non configuré", cls: "bg-muted text-muted-foreground" },
    checking: { label: "Vérification…", cls: "bg-muted text-muted-foreground" },
    online: { label: "En ligne", cls: "bg-primary text-primary-foreground" },
    notready: { label: "Backend prêt, WhatsApp non jumelé", cls: "bg-secondary text-secondary-foreground" },
    offline: { label: "Hors ligne", cls: "bg-destructive text-white" },
  }[status];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-5 py-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">657 — Console du bot</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page pilote le bot WhatsApp hébergé sur Render : état du backend, code de pairing
          et déploiement.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">1. Backend</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
        <label className="mb-1 block text-sm text-muted-foreground" htmlFor="backend">
          URL du service Render
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="backend"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="https://bot657.onrender.com"
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={saveBackend}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Vérifier
          </button>
        </div>
        {statusDetail && <p className="mt-3 text-sm text-muted-foreground">{statusDetail}</p>}
        {status === "offline" && (
          <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
            <li>Le plan gratuit Render endort le service : recharge et attends ~50 s.</li>
            <li>Vérifie que <code>ALLOWED_ORIGINS</code> autorise cette page (ou vaut <code>*</code>).</li>
            <li>Vérifie les logs Render (build <code>npm install</code>, start <code>npm start</code>).</li>
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">2. Code de jumelage</h2>
        {status !== "notready" && status !== "online" ? (
          <p className="text-sm text-muted-foreground">
            Connecte d'abord un backend en ligne pour générer un code.
          </p>
        ) : status === "online" ? (
          <p className="text-sm text-muted-foreground">
            Le bot est déjà jumelé — aucun code nécessaire.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="33612345678"
                inputMode="numeric"
                className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => void requestCode()}
                disabled={loading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {loading ? "Génération…" : "Obtenir le code"}
              </button>
            </div>
            {code && (
              <div className="mt-4">
                <div className="text-3xl font-bold tracking-[0.4em] text-primary">{code}</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  WhatsApp → Appareils connectés → Connecter un appareil → Connecter avec un numéro
                  de téléphone, puis entre ce code. Le bot t'enverra ensuite{" "}
                  <code>session-key.txt</code> à coller dans la variable <code>SESSION_KEY</code>.
                </p>
              </div>
            )}
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">3. Déployer sur Render</h2>
        <p className="text-sm text-muted-foreground">
          Le dépôt contient un blueprint <code>bot657/render.yaml</code> (build{" "}
          <code>npm install</code>, start <code>npm start</code>, health check <code>/status</code>).
        </p>
        <label className="mt-4 mb-1 block text-sm text-muted-foreground" htmlFor="repo">
          URL de ton dépôt GitHub
        </label>
        <input
          id="repo"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          placeholder="https://github.com/ton-compte/bot657"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <a
          href={deployUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Déployer sur Render
        </a>
        <h3 className="mt-5 text-sm font-semibold">Variables d'environnement</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          <li>
            <code>PORT</code> — fourni par Render (3000 en local).
          </li>
          <li>
            <code>ANTHROPIC_API_KEY</code> — requis pour <code>.chat</code>, <code>.search</code>,{" "}
            <code>.translate</code>.
          </li>
          <li>
            <code>SESSION_KEY</code> — reconnexion automatique sans repasser par le pairing.
          </li>
          <li>
            <code>ALLOWED_ORIGINS</code> — origines autorisées à appeler l'API (<code>*</code> par
            défaut).
          </li>
        </ul>
      </section>
    </main>
  );
}
