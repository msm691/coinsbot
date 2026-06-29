// ─── CoinsBot — Commande: collect ────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

module.exports = {
    name: 'collect',
    aliases: ['salaire', 'salary', 'revenus'],
    category: 'work',
    description: 'Collecter votre salaire passif.',
    usage: '&collect',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

            if (!user.job) {
                return message.reply({ embeds: [createEmbed({
                    color: COLORS.ERROR,
                    title: `${config.emojis.error} Pas de métier`,
                    description: `Achetez un métier avec \`${config.defaultPrefix}job\`.`,
                })] });
            }

            if (user.last_work) {
                const elapsed = Date.now() - new Date(user.last_work).getTime();
                const remaining = config.cooldowns.collect - elapsed;
                if (remaining > 0) {
                    return message.reply({ embeds: [createEmbed({
                        color: COLORS.WARNING,
                        title: `${config.emojis.warning} Pas encore`,
                        description: `Prochain salaire dans **${formatDuration(remaining)}**.`,
                    })] });
                }
            }

            const salary = user.job_salary || 100;
            const bonus = Math.floor(salary * (user.level * 0.05));
            const total = salary + bonus;

            await atomicTransaction(sequelize, async (t) => {
                const newBalance = Number(user.global_balance) + total;
                await User.update({
                    global_balance: newBalance,
                    last_work: new Date(),
                }, { where: { id: message.author.id }, transaction: t });

                await Transaction.create({
                    from_user_id: message.author.id,
                    amount: total,
                    type: 'work',
                    description: `Salaire de ${user.job}`,
                    balance_after: newBalance,
                }, { transaction: t });
            });

            const newBalance = Number(user.global_balance) + total;

            message.reply({ embeds: [createEmbed({
                color: COLORS.SUCCESS,
                title: '💵 Salaire collecté',
                description: `Votre salaire de **${user.job}** a été versé !`,
                thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
                fields: [
                    { name: '💼 Métier', value: user.job, inline: true },
                    { name: '💰 Salaire', value: formatMoney(salary), inline: true },
                    { name: `⭐ Bonus niv.${user.level}`, value: `+${formatMoney(bonus)}`, inline: true },
                    { name: `${config.emojis.coin} Total`, value: `**${formatMoney(total)}**`, inline: true },
                    { name: `${config.emojis.wallet} Solde`, value: formatMoney(newBalance), inline: true },
                ],
            })] });
        });
    },
};
