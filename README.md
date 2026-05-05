# 🎯 Calastu — Calcul mental gamifié

PWA mobile, 1 seule app, **2 modes** au choix au lancement :

- 🎒 **Junior** — 6 à 8 ans (GS, CP, CE1, CE2). Lecture vocale, clavier simplifié, exos adaptés (compter, additions, doubles, tables ×2/×5/×10...).
- 🎓 **Pro** — 8 ans et plus (CE2 → 4ème). Astuces avancées (×0,1, ×11, carrés, fractions, distributivité, calculs longs).

Multi-profil, hors-ligne, sans Play Store. Les profils sont **isolés par mode** : un même appareil peut avoir des profils Junior ET Pro indépendants.

Bouton "Changer de mode" disponible dans l'espace parent.

---

## ⚡ Lancer en local (test sur ton ordi)

Tu as besoin d'un mini serveur local. Le plus simple sur Mac :

```bash
cd /Users/gregorymittelette/Dev/Calastu
python3 -m http.server 8080
```

Puis ouvre **http://localhost:8080** dans ton navigateur.

> 💡 Le service worker et le manifest PWA n'ont pas le droit de tourner depuis `file://`, donc le serveur local est obligatoire.

### Générer les icônes PNG (une fois, juste après le clone)

1. Ouvre **http://localhost:8080/gen-icons.html**
2. Clique "⚡ Générer & télécharger"
3. Place les 3 PNG téléchargés dans le dossier Calastu
4. Recharge `index.html`

---

## 📲 Installer sur le téléphone des enfants (sans Play Store)

### Option A — Le plus simple : héberger sur Internet (gratuit)

#### Avec **Netlify Drop** (zéro config, en 30 secondes)

1. Va sur **https://app.netlify.com/drop**
2. Glisse-dépose le dossier `Calastu` entier
3. Tu obtiens une URL du genre `https://radiant-pikachu-1234.netlify.app`
4. Sur le téléphone Android : ouvre cette URL dans Chrome
5. Menu (⋮ en haut à droite) → **"Ajouter à l'écran d'accueil"**
6. Boom, l'icône Calastu apparaît comme une vraie appli !

> Avantages : marche partout, mises à jour faciles (re-drop le dossier), même URL pour tous les enfants.

#### Avec **GitHub Pages** (si tu as déjà GitHub)

1. Crée un repo public, push le contenu
2. Settings → Pages → Source: branche `main`
3. URL : `https://<user>.github.io/<repo>/`

#### Avec **Cloudflare Pages**, **Vercel**, etc.

Idem, drag & drop ou git push, c'est gratuit.

### Option B — Sans hébergement (réseau Wi-Fi local uniquement)

Si tes enfants sont sur le même Wi-Fi que ton ordi :

```bash
cd /Users/gregorymittelette/Dev/Calastu
python3 -m http.server 8080 --bind 0.0.0.0
```

Trouve l'IP de ton Mac : `ipconfig getifaddr en0` (ex: `192.168.1.42`).
Sur le téléphone, ouvre `http://192.168.1.42:8080` (faut être sur le même Wi-Fi).

> ⚠️ Limite : ça ne marchera que quand ton ordi est allumé et sur ce Wi-Fi.

---

## 📲 Installation finale sur Android

Une fois l'URL ouverte dans **Chrome** sur le téléphone :

1. Menu **⋮** (3 points en haut à droite)
2. **"Installer l'application"** ou **"Ajouter à l'écran d'accueil"**
3. Confirmer

L'icône Calastu apparaît sur l'écran d'accueil. L'appli s'ouvre en plein écran, fonctionne hors ligne, et chaque enfant a son profil.

> Sur iPhone : Safari → Partager → "Sur l'écran d'accueil". Ça marche aussi mais l'expérience PWA est légèrement plus limitée que sur Android.

---

## 🌍 Les 9 Mondes

1. 🌍 **Le Monde des Zéros** — ×10, ×100, ×0,1, ÷100... (déplacement de virgule)
2. ⚡ **Compléments Express** — à 10, 100, 1000, à un entier (décimaux)
3. 💎 **Astuces Multiplication** — ×5, ×9, ×11, ×25, ×50, ×4, ×8, ×15...
4. 🔥 **Décomposition** — additions/soustractions par la dizaine
5. 🌟 **Compensation** — 98×5, soustractions équivalentes
6. 🚀 **Distributivité** — distribuer / factoriser
7. 🎯 **Carrés Magiques** — le truc des nombres en 5, près de 100
8. 👑 **Mix Boss** — toutes les astuces, en rafale
9. 🧠 **Calculs Longs** — chaînes multi-étapes, multi-astuces

Chaque monde a une **leçon illustrée**, plusieurs **niveaux** (avec étapes "Marathon" pour les plus avancés), et un **boss** final.

## 🎮 Modes de jeu

- **Aventure** par monde / niveau (étoiles 1-3 selon perf)
- **Défi du jour** — 10 exos chronométrés (15 sec/exo), bonus XP
- **Mode Survie** — 3 vies, 10 sec/exo, combien tu tiens ?
- **Boss du Monde** — 12 questions piochées dans tous les niveaux du monde

## 🏆 Progression

- XP, niveaux, étoiles
- 20 trophées à débloquer (Sans-Faute, Combo x10, Boss Suprême, Légende...)
- Multi-profil : chaque enfant son avatar et sa progression
- Sauvegarde locale (rien n'est envoyé sur Internet)

## 📖 Pédagogie

À chaque exercice, **l'explication détaillée** apparaît avec la décomposition pas à pas, qu'on ait juste ou faux. L'objectif n'est pas juste de réussir, mais de **comprendre la méthode**.

---

## 🔧 Variété des exercices

Pas de banque fixe : tous les exercices sont **générés à la volée** avec des nombres aléatoires + **anti-répétition** dans la session (les 8 dernières questions ne se répètent pas). Pas besoin d'IA.

## 🔐 Vie privée

100% local. Aucune donnée envoyée nulle part. La progression est stockée dans `localStorage` du navigateur du téléphone.

---

## 🛠 Stack

- HTML/CSS/JS purs, zéro dépendance
- PWA (manifest + service worker)
- Web Audio API pour les sons
- LocalStorage pour la persistance

## 📁 Fichiers

```
Calastu/
├── index.html        # structure
├── styles.css        # design
├── app.js            # logique de jeu
├── exercises.js      # générateurs + leçons
├── manifest.json     # PWA
├── sw.js             # service worker (offline)
├── icon.svg          # icône vectorielle
├── icon-192.png      # à générer via gen-icons.html
├── icon-512.png      # à générer via gen-icons.html
├── icon-maskable.png # à générer via gen-icons.html
├── gen-icons.html    # outil pour générer les PNG
└── README.md
```

---

Bon entraînement ! 🚀
