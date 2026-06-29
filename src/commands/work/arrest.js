// ─── CoinsBot — Commande: arrest ─────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom, secureRandomFloat } = require('../../utils/rng');
const config = require('../../config');

module.exports = {
    name: 'arrest',
    aliases: ['arreter', 'arrêter', 'police'],
    category: 'work',
    description: 'Arrêter un criminel pour une prime.',
    usage: '&arrest <@utilisateur>',
    cooldown: 10000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Cible requise`, description: `\`${config.defaultPrefix}arrest <@utilisateur>\`` })] });
        if (target.id === message.author.id) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Impossible`, description: 'Vous ne pouvez pas vous arrêter vous-même.' })] });
        if (target.bot) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Impossible`, description: 'Impossible d\'arrêter un bot.' })] });

        const [targetUser] = await User.findOrCreate({ where: { id: target.id }, defaults: {} });

        if (!targetUser.in_prison || !targetUser.prison_until || new Date(targetUser.prison_until) <= new Date()) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: '👮 Pas un criminel', description: `**${target.displayName || target.username}** n'est pas recherché.` })] });
        }

        const bounty = secureRandom(100, 1001);

        await lockUser(message.author.id, async () => {
            await atomicTransaction(sequelize, async (t) => {
                const [arrester] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {}, transaction: t });
                const newBal = Number(arrester.global_balance) + bounty;
                await User.update({ global_balance: newBal }, { where: { id: message.author.id }, transaction: t });
                await Transaction.create({ from_user_id: message.author.id, amount: bounty, type: 'reward', description: `Prime d'arrestation de ${target.username}`, balance_after: newBal }, { transaction: t });
            });
        });

        message.reply({ embeds: [createEmbed({
            color: COLORS.SUCCESS, title: '👮 Arrestation réussie !',
            description: `Vous avez confirmé l'arrestation de **${target.displayName || target.username}** !`,
            fields: [
                { name: '💰 Prime', value: formatMoney(bounty), inline: true },
            ],
        })] });
    },
};
