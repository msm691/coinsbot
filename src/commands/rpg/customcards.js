// ─── CoinsBot — Commande: customcards ────────────────────────────────────────
const { User, Card, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

const CREATION_COSTS = { common: 10000, uncommon: 25000, rare: 50000, epic: 100000, legendary: 250000 };
const DROP_RATES     = { common: 1.0, uncommon: 0.5, rare: 0.2, epic: 0.05, legendary: 0.01 };
const VALID_RARITIES = Object.keys(CREATION_COSTS);
const STAT_MAX       = { common: 30, uncommon: 45, rare: 65, epic: 90, legendary: 120 };

module.exports = {
    name: 'customcards',
    aliases: ['createcard', 'carteperso', 'cardcreate', 'creercarte'],
    category: 'rpg',
    description: 'Créer une carte personnalisée.',
    usage: '&customcards create <nom> <rareté> <atk> <def> <spd> [description]',
    cooldown: 10000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (args[0]?.toLowerCase() !== 'create') {
            return message.reply({ embeds: [createEmbed({
                color: COLORS.RPG,
                title: '🎨 Créateur de cartes personnalisées',
                description: `\`${config.defaultPrefix}customcards create <nom> <rareté> <atk> <def> <spd> [description]\``,
                fields: VALID_RARITIES.map(r => ({
                    name: `✦ ${r.charAt(0).toUpperCase() + r.slice(1)}`,
                    value: `Coût: **${formatMoney(CREATION_COSTS[r])}** | Stats max: **${STAT_MAX[r]}** par stat`,
                    inline: true,
                })),
                footer: 'Les cartes créées rejoignent le pool global de carddrop.',
            })] });
        }

        // &customcards create <nom> <rareté> <atk> <def> <spd> [desc...]
        // args: [create, nom, rareté, atk, def, spd, ...desc]
        if (args.length < 6) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Usage: \`${config.defaultPrefix}customcards create <nom> <rareté> <atk> <def> <spd> [description]\`` })] });
        }

        const name    = args[1];
        const rarity  = args[2]?.toLowerCase();
        const atk     = parseInt(args[3]);
        const def     = parseInt(args[4]);
        const spd     = parseInt(args[5]);
        const desc    = args.slice(6).join(' ') || `Carte créée par ${message.author.username}.`;

        if (!VALID_RARITIES.includes(rarity)) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Rareté invalide. Choisissez: \`${VALID_RARITIES.join('`, `')}\`` })] });
        }

        const maxStat = STAT_MAX[rarity];
        if ([atk, def, spd].some(v => isNaN(v) || v < 1 || v > maxStat)) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Stats invalides. Chaque stat doit être entre **1** et **${maxStat}** pour la rareté **${rarity}**.` })] });
        }

        if (name.length < 2 || name.length > 32) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Le nom doit faire entre 2 et 32 caractères.' })] });
        }

        const existing = await Card.findOne({ where: { name } });
        if (existing) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Une carte nommée **${name}** existe déjà.` })] });

        const cost = CREATION_COSTS[rarity];
        const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

        if (Number(user.global_balance) < cost) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût: **${formatMoney(cost)}** | Disponible: **${formatMoney(Number(user.global_balance))}**` })] });
        }

        let createdCard;
        await lockUser(message.author.id, async () => {
            await atomicTransaction(sequelize, async (t) => {
                await User.update(
                    { global_balance: Number(user.global_balance) - cost },
                    { where: { id: message.author.id }, transaction: t },
                );
                createdCard = await Card.create({
                    name, description: desc, rarity, attack: atk, defense: def, speed: spd,
                    series: 'Customs', drop_rate: DROP_RATES[rarity],
                    is_custom: true, creator_id: message.author.id,
                }, { transaction: t });
            });

            const RARITY_EMOJI = { common:'⚪', uncommon:'🟢', rare:'🔵', epic:'🟣', legendary:'🟡' };
            message.reply({ embeds: [createEmbed({
                color: COLORS.SUCCESS,
                title: '🎨 Carte créée et ajoutée au pool !',
                description: `**${createdCard.name}** — ${RARITY_EMOJI[rarity]} ${rarity.charAt(0).toUpperCase()+rarity.slice(1)}\n*${desc}*`,
                fields: [
                    { name: '⚔️ Attaque',  value: `${atk}`, inline: true },
                    { name: '🛡️ Défense', value: `${def}`, inline: true },
                    { name: '💨 Vitesse',  value: `${spd}`, inline: true },
                    { name: '💸 Coût payé',        value: formatMoney(cost), inline: true },
                    { name: '👛 Solde restant',     value: formatMoney(Number(user.global_balance) - cost), inline: true },
                    { name: '🎴 Pool carddrop',     value: 'La carte est maintenant droppable par tous.', inline: false },
                ],
            })] });
        });
    },
};
