// ─── CoinsBot — Centralized Configuration ───────────────────────────────────
// All tuneable values live here. Override via environment variables where noted.

module.exports = {
  // ── Core ───────────────────────────────────────────────────────────────────
  token: process.env.BOT_TOKEN,
  defaultPrefix: process.env.DEFAULT_PREFIX || '&',
  botName: process.env.BOT_NAME || 'CoinsBot',
  dbPath: process.env.DB_PATH || './database.sqlite',
  inviteLink:
    'https://discord.com/oauth2/authorize?client_id=1520980231480021123&permissions=8&integration_type=0&scope=bot+applications.commands',

  // ── Economy defaults ───────────────────────────────────────────────────────
  economy: {
    startingBalance: 0,
    startingBank: 0,
    bankLimitBase: 10000,
    defaultTaxRate: 0.05,
    dailyAmount: { min: 200, max: 800 },
    workAmount: { min: 100, max: 500 },
    maxTransfer: 1_000_000_000,
  },

  // ── Cooldowns (milliseconds) ───────────────────────────────────────────────
  cooldowns: {
    daily: 86_400_000,   // 24 h
    work: 600_000,       // 10 min
    crime: 1_800_000,    // 30 min
    collect: 3_600_000,  // 1 h
    rob: 900_000,        // 15 min
  },

  // ── Casino ─────────────────────────────────────────────────────────────────
  casino: {
    houseEdge: 0.03,
    minBet: 100,
    maxBet: 1_000_000,
  },

  // ── Emojis used in embeds ──────────────────────────────────────────────────
  emojis: {
    coin: '🪙',
    bank: '🏦',
    wallet: '👛',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '⏳',
    star: '⭐',
    fire: '🔥',
    trophy: '🏆',
    dice: '🎲',
    cards: '🃏',
    sword: '⚔️',
    shield: '🛡️',
    chart: '📈',
    lock: '🔒',
    key: '🔑',
    crown: '👑',
    gem: '💎',
    prison: '⛓️',
    rocket: '🚀',
  },
};
