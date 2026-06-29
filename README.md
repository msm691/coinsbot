<div align="center">

# 🪙 CoinsBot

**Bot Discord d'Économie, RPG et Gestion Massivement Multijoueur**

[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Local-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)](LICENSE)

[📩 Inviter le Bot](https://discord.com/oauth2/authorize?client_id=1520980231480021123&permissions=8&integration_type=0&scope=bot+applications.commands)

</div>

---

## 📖 À propos

CoinsBot est un bot Discord complet combinant :

- 💰 **Économie réaliste** — Portefeuille, banque, transactions taxées
- 🎰 **Casino & Mini-jeux** — Blackjack, Roulette, Slots, Mines, Crash, Poker...
- 💼 **Travail & Métiers** — Métiers légaux et activités illégales (avec risques !)
- 🏭 **Entreprises & Tycoon** — Créez et développez votre empire
- 📈 **Bourse & Crypto** — Marché fluctuant avec algorithme réaliste
- ⚔️ **Alliances & Guerre** — Créez votre team, recrutez, attaquez
- 🃏 **Cartes à collectionner** — Drop, raretés, duels
- 🛡️ **RPG** — XP, niveaux, compétences, profil

## 🏗️ Architecture

```
coinsbot/
├── .env                      # Configuration sensible (token)
├── .gitignore
├── package.json
├── README.md
│
├── src/
│   ├── index.js              # Point d'entrée
│   ├── config.js             # Configuration centralisée
│   │
│   ├── database/
│   │   ├── connection.js     # Connexion SQLite + Sequelize
│   │   └── models/           # 12 modèles relationnels
│   │
│   ├── handlers/
│   │   ├── commandHandler.js # Chargement commandes + alias
│   │   └── eventHandler.js   # Chargement événements
│   │
│   ├── events/               # Événements Discord
│   ├── commands/             # Commandes par catégorie
│   │   ├── economy/          # 💰 Économie & Banque
│   │   ├── work/             # 💼 Travail & Illégal
│   │   ├── casino/           # 🎰 Casino & Mini-Jeux
│   │   ├── enterprise/       # 🏭 Entreprises & Tycoon
│   │   ├── crypto/           # 📈 Bourse & Crypto
│   │   ├── teams/            # ⚔️ Alliances & Guerre
│   │   ├── rpg/              # 🃏 RPG & Cartes
│   │   ├── admin/            # 🛡️ Administration
│   │   └── utils/            # 🔧 Utilitaires
│   │
│   ├── utils/                # Utilitaires partagés
│   └── tasks/                # Tâches planifiées
│
└── data/                     # Données statiques (items, etc.)
```

## ⚙️ Installation

```bash
# Cloner le dépôt
git clone git@github.com:msm691/coinsbot.git
cd coinsbot

# Installer les dépendances
npm install

# Configurer le fichier .env
cp .env.example .env
# Remplir BOT_TOKEN avec votre token Discord

# Lancer le bot
node src/index.js
```

## 🎮 Commandes

| Catégorie | Commandes | Description |
|---|---|---|
| 💰 Économie | `&balance` `&dep` `&with` `&pay` `&daily` | Gestion d'argent et banque |
| 💼 Travail | `&work` `&job` `&collect` | Métiers légaux et salaires |
| 🔫 Illégal | `&braquage` `&hack` `&recolt` `&mobil` | Activités risquées |
| 🎰 Casino | `&blackjack` `&roulette` `&slots` `&mines` `&crash` | Jeux d'argent |
| 🏭 Entreprise | `&entreprise` `&tycoon` `&modules` | Gestion d'entreprise |
| 📈 Crypto | `&crypto` `&printer` | Marché de cryptomonnaie |
| ⚔️ Alliances | `&tcreate` `&tinvite` `&tattack` | Système d'équipes |
| 🃏 Cartes | `&carddrop` `&mycards` `&duel` | Collection de cartes |
| 🛡️ Admin | `&setprefix` `&settax` `&perm` | Configuration serveur |

> **Alias supportés** : `&bal` → `&balance`, `&wh` → `&withdraw`, `&bank` → `&balance`, etc.

## 📊 Avancement

- [x] 🏗️ Architecture & Fondations
- [x] ⚙️ Configuration de base (handlers, events, utils)
- [x] 🗄️ Modèles de base de données (Sequelize)
- [ ] 💰 Module Économie & Banque
- [ ] 💼 Module Travail & Illégal
- [ ] 🎰 Module Casino & Mini-Jeux
- [ ] 🏭 Module Entreprises & Tycoon
- [ ] 📈 Module Bourse & Crypto
- [ ] ⚔️ Module Alliances & Guerre
- [ ] 🃏 Module RPG & Cartes
- [ ] 🛡️ Module Administration

## 🔒 Sécurité

- 🔐 Token stocké dans `.env` (exclu de Git)
- 🛡️ Transactions SQL atomiques contre les race conditions
- ⏱️ Cooldowns anti-spam sur toutes les commandes
- 🔒 Mutex applicatif pour les opérations économiques
- ✅ Validation stricte des montants et permissions
- 🎲 RNG cryptographique pour le casino

## 📄 Licence

Projet privé — Tous droits réservés.

---

<div align="center">

**Développé avec ❤️ pour Discord**

[📩 Inviter CoinsBot](https://discord.com/oauth2/authorize?client_id=1520980231480021123&permissions=8&integration_type=0&scope=bot+applications.commands)

</div>
