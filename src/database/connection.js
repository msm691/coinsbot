/**
 * 🗄️ Database Connection — SQLite + Sequelize
 * 
 * Initialise la connexion SQLite locale via Sequelize.
 * La base de données est un fichier local (pas de serveur externe).
 * 
 * Charge et associe tous les modèles au démarrage.
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const config = require('../config');

// ─── Resolve database path ─────────────────────────────
const dbPath = path.resolve(process.cwd(), config.dbPath);

// ─── Create Sequelize instance ──────────────────────────
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: false,  // Disable SQL logging in production

    // Connection pool (SQLite uses a single connection but this future-proofs)
    pool: {
        max: 1,       // SQLite only supports 1 connection
        min: 0,
        acquire: 30000,
        idle: 10000,
    },

    // Better SQLite performance
    define: {
        timestamps: true,     // Adds createdAt/updatedAt to all models
        underscored: true,    // Use snake_case for DB columns
        freezeTableName: true, // Don't pluralize table names
    },

    // Transaction isolation for data integrity
    transactionType: 'IMMEDIATE',
});

/**
 * Initialize the database connection and sync all models.
 * Called once at bot startup.
 */
async function initDatabase() {
    try {
        // Test connection
        await sequelize.authenticate();
        console.log('  \x1b[32m✔ Connexion SQLite établie\x1b[0m');
        console.log(`  \x1b[90m  → ${dbPath}\x1b[0m`);

        // Enable WAL mode for better concurrent read performance
        await sequelize.query('PRAGMA journal_mode=WAL;');
        await sequelize.query('PRAGMA busy_timeout=5000;');
        await sequelize.query('PRAGMA foreign_keys=ON;');

        // Load and associate all models
        // (importing models/index.js triggers model registration + associations)
        const models = require('./models');
        const modelNames = Object.keys(models).filter(k => k !== 'sequelize');
        console.log(`  \x1b[32m✔ ${modelNames.length} modèles chargés\x1b[0m`);
        console.log(`  \x1b[90m  → ${modelNames.join(', ')}\x1b[0m`);

        // Sync all models with the database (create tables if they don't exist)
        await sequelize.sync({ alter: false });
        console.log('  \x1b[32m✔ Tables synchronisées\x1b[0m');

        // Seed default crypto currencies if table is empty
        await seedCryptos(models.Crypto);

        // Seed default market items if table is empty
        await seedMarket(models.Market);

        // Seed default card pool if table is empty
        await seedCards(models.Card);

    } catch (error) {
        console.error('\x1b[31m✖ Erreur de connexion à la base de données:\x1b[0m', error);
        throw error;
    }
}

/**
 * Seed the crypto table with default currencies.
 * Only runs if the table is empty.
 */
async function seedCryptos(Crypto) {
    const count = await Crypto.count();
    if (count > 0) return;

    const cryptos = [
        { name: 'Bitcoin',   symbol: 'BTC',  current_price: 5000,  previous_price: 5000,  lowest_price: 5000,  highest_price: 5000,  volatility: 0.15, market_cap: 10000000, total_supply: 2000 },
        { name: 'Ethereum',  symbol: 'ETH',  current_price: 2000,  previous_price: 2000,  lowest_price: 2000,  highest_price: 2000,  volatility: 0.20, market_cap: 5000000,  total_supply: 5000 },
        { name: 'DogeCoin',  symbol: 'DOGE', current_price: 50,    previous_price: 50,    lowest_price: 50,    highest_price: 50,    volatility: 0.35, market_cap: 1000000,  total_supply: 50000 },
        { name: 'CoinsBit',  symbol: 'CBIT', current_price: 100,   previous_price: 100,   lowest_price: 100,   highest_price: 100,   volatility: 0.25, market_cap: 2000000,  total_supply: 20000 },
        { name: 'LunaCoin',  symbol: 'LUNA', current_price: 800,   previous_price: 800,   lowest_price: 800,   highest_price: 800,   volatility: 0.30, market_cap: 3000000,  total_supply: 10000 },
    ];

    await Crypto.bulkCreate(cryptos);
    console.log('  \x1b[32m✔ Cryptomonnaies initialisées (5 devises)\x1b[0m');
}

/**
 * Seed the market table with default shop items.
 * Only runs if the table is empty.
 */
async function seedMarket(Market) {
    const count = await Market.count();
    if (count > 0) return;

    const items = [
        // Tools
        { item_name: 'Pioche',           description: 'Augmente vos gains de travail de 10%.',             price: 5000,   sell_price: 2500,  category: 'tool',        emoji: '⛏️',  rarity: 'common',   effects: JSON.stringify({ work_bonus: 0.10 }) },
        { item_name: 'Ordinateur',       description: 'Permet de hacker (+20% de gains illégaux).',       price: 15000,  sell_price: 7500,  category: 'tool',        emoji: '💻',  rarity: 'uncommon', effects: JSON.stringify({ crime_bonus: 0.20 }) },
        { item_name: 'Coffre-fort',      description: 'Augmente la limite de votre banque de 25,000.',    price: 25000,  sell_price: 12500, category: 'tool',        emoji: '🔐',  rarity: 'rare',     effects: JSON.stringify({ bank_limit_bonus: 25000 }) },

        // Weapons
        { item_name: 'Couteau',          description: 'Arme basique pour les braquages.',                  price: 3000,   sell_price: 1500,  category: 'weapon',      emoji: '🔪',  rarity: 'common',   effects: JSON.stringify({ rob_bonus: 0.05 }) },
        { item_name: 'Pistolet',         description: 'Augmente vos chances de braquage de 15%.',         price: 20000,  sell_price: 10000, category: 'weapon',      emoji: '🔫',  rarity: 'rare',     effects: JSON.stringify({ rob_bonus: 0.15 }) },
        { item_name: 'Armure',           description: 'Réduit les amendes de 20% en cas d\'arrestation.', price: 30000,  sell_price: 15000, category: 'weapon',      emoji: '🛡️',  rarity: 'epic',     effects: JSON.stringify({ fine_reduction: 0.20 }) },

        // Consumables
        { item_name: 'Café',             description: 'Réduit le cooldown de work de 50%.',                price: 1000,   sell_price: 500,   category: 'consumable',  emoji: '☕',  rarity: 'common',   effects: JSON.stringify({ cooldown_reduction: { work: 0.50 } }) },
        { item_name: 'Énergie Boost',    description: 'Réduit tous les cooldowns de 25%.',                 price: 8000,   sell_price: 4000,  category: 'consumable',  emoji: '⚡',  rarity: 'uncommon', effects: JSON.stringify({ cooldown_reduction: { all: 0.25 } }) },
        { item_name: 'Passe VIP',        description: 'Double vos gains pendant 1 heure.',                price: 50000,  sell_price: 25000, category: 'consumable',  emoji: '🌟',  rarity: 'epic',     effects: JSON.stringify({ earnings_multiplier: 2.0, duration: 3600000 }) },

        // Collectibles
        { item_name: 'Étoile d\'or',     description: 'Objet rare et brillant. Très prisé des collectionneurs.', price: 100000, sell_price: 80000, category: 'collectible', emoji: '⭐',  rarity: 'legendary', effects: JSON.stringify({}) },
        { item_name: 'Diamant',          description: 'Pierre précieuse d\'une valeur inestimable.',      price: 250000, sell_price: 200000, category: 'collectible', emoji: '💎',  rarity: 'legendary', effects: JSON.stringify({}) },

        // Special
        { item_name: 'Clé de prison',    description: 'Permet de sortir de prison immédiatement.',         price: 10000,  sell_price: 0,     category: 'special',     emoji: '🔑',  rarity: 'rare',     effects: JSON.stringify({ prison_escape: true }), is_sellable: false },
        { item_name: 'Faux passeport',   description: 'Réduit les risques d\'arrestation de 30%.',        price: 35000,  sell_price: 0,     category: 'special',     emoji: '📄',  rarity: 'epic',     effects: JSON.stringify({ arrest_reduction: 0.30 }), is_sellable: false },
    ];

    await Market.bulkCreate(items);
    console.log(`  \x1b[32m✔ Boutique initialisée (${items.length} objets)\x1b[0m`);
}

/**
 * Seed the card pool with default collectible cards.
 * Only runs if the table is empty.
 */
async function seedCards(Card) {
    const count = await Card.count();
    if (count > 0) return;

    const cards = [
        // Common — drop_rate total: 60
        { name: 'Guerrier Commun',   description: 'Un soldat ordinaire des plaines.',        rarity: 'common',    attack: 15, defense: 10, speed: 10, series: 'Série 1', drop_rate: 30 },
        { name: 'Mage Débutant',     description: 'Un apprenti sorcier en quête de pouvoir.', rarity: 'common',    attack: 20, defense:  5, speed: 12, series: 'Série 1', drop_rate: 30 },
        // Uncommon — drop_rate total: 25
        { name: 'Archer Habile',     description: 'Tire avec une précision redoutable.',      rarity: 'uncommon',  attack: 25, defense: 12, speed: 18, series: 'Série 1', drop_rate: 12 },
        { name: 'Paladin Gardien',   description: 'Protège ses alliés au péril de sa vie.',   rarity: 'uncommon',  attack: 18, defense: 25, speed: 10, series: 'Série 1', drop_rate: 13 },
        // Rare — drop_rate total: 10
        { name: "Ninja de l'Ombre", description: "Frappe depuis l'obscurité sans pitié.",    rarity: 'rare',      attack: 30, defense: 15, speed: 25, series: 'Série 1', drop_rate:  5 },
        { name: 'Sorcier Élémental', description: 'Maîtrise les éléments à la perfection.',   rarity: 'rare',      attack: 35, defense:  8, speed: 20, series: 'Série 1', drop_rate:  5 },
        // Epic — drop_rate total: 4
        { name: 'Dragon Rouge',      description: 'Incendie tout sur son passage dévastateur.', rarity: 'epic',    attack: 45, defense: 30, speed: 20, series: 'Série 1', drop_rate:  2 },
        { name: 'Démon des Abysses', description: 'Surgit des profondeurs pour détruire.',     rarity: 'epic',    attack: 50, defense: 20, speed: 22, series: 'Série 1', drop_rate:  2 },
        // Legendary — drop_rate total: 0.9
        { name: 'Titan Légendaire',  description: 'Invincible et majestueux parmi les dieux.', rarity: 'legendary', attack: 60, defense: 50, speed: 30, series: 'Série 1', drop_rate: 0.45 },
        { name: 'Phénix Immortel',   description: 'Renaît de ses cendres, éternel et libre.',  rarity: 'legendary', attack: 55, defense: 45, speed: 40, series: 'Série 1', drop_rate: 0.45 },
        // Mythic — drop_rate total: 0.1
        { name: 'Dieu de la Guerre', description: "L'ultime guerrier. Nul ne lui résiste.",    rarity: 'mythic',   attack: 80, defense: 70, speed: 60, series: 'Série 1', drop_rate:  0.1 },
    ];

    await Card.bulkCreate(cards);
    console.log(`  \x1b[32m✔ Pool de cartes initialisé (${cards.length} cartes)\x1b[0m`);
}

module.exports = { sequelize, initDatabase };
