// ─── CoinsBot — Commande: daily ──────────────────────────────────────────────
// Récompense quotidienne avec cooldown de 24h.

const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom } = require('../../utils/rng');
const config = require('../../config');

module.exports = {
    name: 'daily',
    aliases: ['quotidien', 'jour'],
    category: 'economy',
    description: 'Réclamez votre récompense quotidienne.',
    usage: '&daily',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

            // Vérifier le cooldown du daily
            if (user.last_daily) {
                const elapsed = Date.now() - new Date(user.last_daily).getTime();
                const remaining = config.cooldowns.daily - elapsed;

                if (remaining > 0) {
                    return message.reply({
                        embeds: [createEmbed({
                            color: COLORS.WARNING,
                            title: `${config.emojis.warning} Déjà réclamé`,
                            description: `Vous avez déjà réclamé votre récompense quotidienne.\nRevenez dans **${formatDuration(remaining)}**.`,
                            thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
                        })],
                    });
                }
            }

            // Générer le montant aléatoire (RNG sécurisé)
            const { min, max } = config.economy.dailyAmount;
            const amount = secureRandom(min, max + 1);

            // Bonus de niveau (1% par niveau)
            const levelBonus = Math.floor(amount * (user.level * 0.01));
            const totalAmount = amount + levelBonus;

            await atomicTransaction(sequelize, async (t) => {
                const newBalance = Number(user.global_balance) + totalAmount;

                await User.update(
                    {
                        global_balance: newBalance,
                        last_daily: new Date(),
                    },
                    { where: { id: message.author.id }, transaction: t }
                );

                await Transaction.create({
                    from_user_id: message.author.id,
                    amount: totalAmount,
                    type: 'daily',
                    description: `Récompense quotidienne (base: ${amount}, bonus niv.${user.level}: ${levelBonus})`,
                    balance_after: newBalance,
                }, { transaction: t });
            });

            const newBalance = Number(user.global_balance) + totalAmount;

            const fields = [
                { name: '🎁 Récompense', value: formatMoney(amount), inline: true },
            ];

            if (levelBonus > 0) {
                fields.push({ name: `⭐ Bonus niveau ${user.level}`, value: `+ ${formatMoney(levelBonus)}`, inline: true });
            }

            fields.push(
                { name: `${config.emojis.coin} Total reçu`, value: `**${formatMoney(totalAmount)}**`, inline: true },
                { name: `${config.emojis.wallet} Nouveau solde`, value: formatMoney(newBalance), inline: true },
                { name: `${config.emojis.loading} Prochain daily`, value: 'Dans **24 heures**', inline: true },
            );

            message.reply({
                embeds: [createEmbed({
                    color: COLORS.SUCCESS,
                    title: '🎁 Récompense quotidienne',
                    description: `Vous avez reçu **${formatMoney(totalAmount)}** !`,
                    thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
                    fields,
                })],
            });
        });
    },
};
