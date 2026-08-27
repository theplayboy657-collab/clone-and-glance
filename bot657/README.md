# 657 — Bot WhatsApp personnel

## Fonctionnalités
- `.chat mode` / `.chat off` — conversation libre avec l'IA
- `.memory show` / `.memory clear` — mémoire persistante par discussion
- `.jeux`, `.jeu devinette`, `.jeu rp {personnage}`, `.quitter`
- `.stickers` (pack = ton nom WhatsApp), `.setsticker {nom}`
- `.vv` — récupère un média vue unique, envoyé sur ton numéro
- `.translate on/off` (owner uniquement) — traduit en privé tout message
  reçu qui n'est pas en français, dans toutes tes discussions/groupes
- `.search {question}` — recherche web en temps réel
- `.play {titre}` / `.video {titre}` — téléchargement musique/vidéo
- `.pair {numéro}` — autoriser un nouvel utilisateur
- `.owner`, `.menu`, `.busy on/off`, `.on`/`.off`/`.kick` (groupes)

## Architecture — comment ça tourne réellement

**Render est l'hébergeur permanent du bot**, pas seulement la page de pairing.
GitHub Actions n'est **pas utilisé** pour faire tourner le bot en continu :
chaque job Actions est tué après 6h maximum, ce n'est pas fait pour héberger
un service persistant (et c'est contraire à l'usage prévu par GitHub).

Ce qui se passe réellement, et qui répond au besoin ("le bot redémarre
automatiquement quand je mets ma clé, puis reste en ligne") :

1. Render tourne en continu et sert la page de pairing (`/`)
2. Premier lancement : tu récupères le pairing code, tu connectes ton
   WhatsApp — aucune clé n'existe encore
3. Une fois connecté, le bot **t'envoie directement en message WhatsApp**
   un fichier `session-key.txt` : une seule chaîne qui encode toute ta
   session
4. Tu colles cette chaîne dans `SESSION_KEY` (`config.js` sur GitHub, ou —
   plus sûr — variable d'environnement `SESSION_KEY` sur Render) et tu push
5. **Render redéploie automatiquement à chaque push** (comportement natif,
   pas besoin de GitHub Actions) : au redémarrage, le bot lit `SESSION_KEY`,
   restaure la session directement, se reconnecte sans repasser par le
   pairing, et t'écrit à nouveau "en ligne"

Résultat : plus besoin de Persistent Disk payant sur Render (la session
survit aux redéploiements via la clé), et le comportement "je mets ma clé,
ça redémarre tout seul, le bot m'écrit" fonctionne — porté par Render, pas
par GitHub Actions.

⚠️ **Sécurité** : `SESSION_KEY` donne un accès complet à ton compte
WhatsApp. Si ton repo GitHub est **public**, ne la mets jamais dans
`config.js` — utilise uniquement la variable d'environnement Render (elle
n'est jamais visible dans le code). Si le repo est privé, les deux options
sont possibles.

## Déploiement

1. Pousse ce code sur GitHub (via Copilot).
2. Sur [render.com](https://render.com) → **New +** → **Web Service** → connecte
   le repo.
   - **Build command** : `npm install`
   - **Start command** : `npm start`
   - **Auto-Deploy** : activé (c'est la valeur par défaut)
   - Plan payant recommandé si tu veux un vrai "toujours en ligne" (le plan
     gratuit met le service en veille après 15 min sans requête HTTP, ce qui
     coupe la connexion WhatsApp).
3. Ouvre `https://ton-service.onrender.com`, entre ton numéro, récupère le
   code de pairing, connecte-le dans WhatsApp (Appareils connectés →
   Connecter avec un numéro de téléphone).
4. Regarde WhatsApp : le bot t'envoie `session-key.txt`.
5. Colle son contenu dans `SESSION_KEY` (`config.js`, ou variable
   d'environnement Render) → push (ou sauvegarde sur Render) → redéploiement
   automatique → le bot revient en ligne directement, sans repasser par le
   pairing.

## Configuration (`config.js`, modifiable sur GitHub)
- `BOT_NAME`, `OWNER_NAME`, `OWNER_NUMBER`
- `SESSION_KEY` (voir ci-dessus)

## Variables d'environnement (Render → Settings → Environment)
- `ANTHROPIC_API_KEY` — requis pour `.chat`, `.jeu rp`, `.search`, `.translate`
- `SESSION_KEY` — optionnel mais recommandé (voir sécurité ci-dessus)
