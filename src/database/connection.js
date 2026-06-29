/**
 * 🗄️ Database Connection — SQLite + Sequelize
 * 
 * Initialise la connexion SQLite locale via Sequelize.
 * La base de données est un fichier local (pas de serveur externe).
 * 
 * Ce fichier sera complété à l'Étape 3 avec le chargement des modèles.
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

        // Load and associate models (will be implemented in Step 3)
        // const models = require('./models');
        // models.associate(sequelize);

        // Sync all models with the database
        await sequelize.sync({ alter: false });
        console.log('  \x1b[32m✔ Modèles synchronisés\x1b[0m');

    } catch (error) {
        console.error('\x1b[31m✖ Erreur de connexion à la base de données:\x1b[0m', error);
        throw error;
    }
}

module.exports = { sequelize, initDatabase };
