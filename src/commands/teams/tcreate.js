// ─── CoinsBot — Commande: tcreate ─────────────────────────────────────────────
const { User, Team, TeamMember, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

const CREATE_COST = 10000;

module.exports = {
    name: 'tcreate',
    aliases: ['team-create', 'creer-team', 'alliance-creer'],
    category: 'teams',
    description: 'Créer une nouvelle alliance.',
    usage: '&tcreate <Nom de l\'alliance> <TAG>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (args.length < 2) {
            return message.reply({ embeds: [createEmbed({
                color: COLORS.ERROR, title: `${config.emojis.error} Utilisation`,
                description: `\`${config.defaultPrefix}tcreate <Nom> <TAG>\`\nLe tag doit être **1–5 caractères** (ex: \`GLD\`).`,
            })] });
        }

        const tag = args[args.length - 1].toUpperCase();
        const name = args.slice(0, -1).join(' ');

        if (tag.length < 1 || tag.length > 5) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Le tag doit faire entre 1 et 5 caractères.' })] });
        }
        if (name.length < 2 || name.length > 32) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Le nom doit faire entre 2 et 32 caractères.' })] });
        }

        await lockUser(message.author.id, async () => {
            const existing = await TeamMember.findOne({ where: { user_id: message.author.id } });
            if (existing) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Vous êtes déjà dans une alliance. Quittez-la d\'abord.' })] });

            const nameConflict = await Team.findOne({ where: { name } });
            if (nameConflict) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Le nom **${name}** est déjà pris.` })] });

            const tagConflict = await Team.findOne({ where: { tag } });
            if (tagConflict) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Le tag **[${tag}]** est déjà utilisé.` })] });

            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            if (Number(user.global_balance) < CREATE_COST) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût de création: **${formatMoney(CREATE_COST)}**` })] });
            }

            await atomicTransaction(sequelize, async (t) => {
                await User.update({ global_balance: Number(user.global_balance) - CREATE_COST }, { where: { id: message.author.id }, transaction: t });
                const team = await Team.create({ name, tag, owner_id: message.author.id }, { transaction: t });
                await TeamMember.create({ team_id: team.id, user_id: message.author.id, rank: 'leader' }, { transaction: t });
                await Transaction.create({ from_user_id: message.author.id, amount: CREATE_COST, type: 'shop_buy', description: `Création alliance [${tag}] ${name}`, balance_after: Number(user.global_balance) - CREATE_COST }, { transaction: t });
            });

            message.reply({ embeds: [createEmbed({
                color: COLORS.TEAM, title: `⚔️ Alliance [${tag}] créée !`,
                description: `**${name}** est maintenant opérationnelle !`,
                fields: [
                    { name: '👑 Leader', value: message.author.username, inline: true },
                    { name: '💸 Coût', value: formatMoney(CREATE_COST), inline: true },
                    { name: '📊 Prochaines étapes', value: `\`${config.defaultPrefix}tinvite @membre\` · \`${config.defaultPrefix}tdep <montant>\` · \`${config.defaultPrefix}tarmy tier1 <qté>\``, inline: false },
                ],
                thumbnail: message.author.displayAvatarURL({ dynamic: true }),
            })] });
        });
    },
};
