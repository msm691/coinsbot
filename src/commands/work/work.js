// ─── CoinsBot — Commande: work ───────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom } = require('../../utils/rng');
const config = require('../../config');

const WORK_SCENARIOS = [
    { text: 'Vous avez livré des pizzas 🍕', emoji: '🛵' },
    { text: 'Vous avez réparé un ordinateur 💻', emoji: '🔧' },
    { text: 'Vous avez tondu une pelouse 🌿', emoji: '🏡' },
    { text: 'Vous avez conduit un taxi 🚕', emoji: '🚗' },
    { text: 'Vous avez fait du baby-sitting 👶', emoji: '🍼' },
    { text: 'Vous avez nettoyé un bureau 🧹', emoji: '🏢' },
    { text: 'Vous avez donné des cours particuliers 📚', emoji: '👨‍🏫' },
    { text: 'Vous avez peint une clôture 🎨', emoji: '🖌️' },
    { text: 'Vous avez promené des chiens 🐕', emoji: '🦮' },
    { text: 'Vous avez vendu des glaces 🍦', emoji: '🛒' },
    { text: 'Vous avez récolté des fruits 🍎', emoji: '🧑‍🌾' },
    { text: 'Vous avez trié du courrier 📬', emoji: '📮' },
];

module.exports = {
    name: 'work',
    aliases: ['travail', 'travailler', 'w'],
    category: 'work',
    description: 'Travailler pour gagner de l\'argent.',
    usage: '&work',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

            // Prison check
            if (user.in_prison && user.prison_until && new Date(user.prison_until) > new Date()) {
                const remaining = new Date(user.prison_until).getTime() - Date.now();
                return message.reply({ embeds: [createEmbed({
                    color: COLORS.ERROR,
                    title: `${config.emojis.prison} En prison`,
                    description: `Vous êtes en prison. Sortie dans **${formatDuration(remaining)}**.`,
                })] });
            }

            // Cooldown check
            if (user.last_work) {
                const elapsed = Date.now() - new Date(user.last_work).getTime();
                const remaining = config.cooldowns.work - elapsed;
                if (remaining > 0) {
                    return message.reply({ embeds: [createEmbed({
                        color: COLORS.WARNING,
                        title: `${config.emojis.warning} Repos nécessaire`,
                        description: `Vous devez attendre **${formatDuration(remaining)}** avant de retravailler.`,
                    })] });
                }
            }

            const { min, max } = config.economy.workAmount;
            let amount = secureRandom(min, max + 1);

            // Job bonus
            if (user.job) {
                amount += user.job_salary || 0;
            }

            const scenario = WORK_SCENARIOS[secureRandom(0, WORK_SCENARIOS.length)];

            await atomicTransaction(sequelize, async (t) => {
                const newBalance = Number(user.global_balance) + amount;
                const newXp = user.xp + secureRandom(5, 15);

                await User.update({
                    global_balance: newBalance,
                    last_work: new Date(),
                    xp: newXp,
                }, { where: { id: message.author.id }, transaction: t });

                await Transaction.create({
                    from_user_id: message.author.id,
                    amount,
                    type: 'work',
                    description: scenario.text,
                    balance_after: newBalance,
                }, { transaction: t });
            });

            const newBalance = Number(user.global_balance) + amount;
            const fields = [
                { name: `${config.emojis.coin} Gagné`, value: formatMoney(amount), inline: true },
                { name: `${config.emojis.wallet} Solde`, value: formatMoney(newBalance), inline: true },
            ];
            if (user.job) {
                fields.push({ name: '💼 Métier', value: `${user.job} (+${formatMoney(user.job_salary || 0)})`, inline: true });
            }

            message.reply({ embeds: [createEmbed({
                color: COLORS.SUCCESS,
                title: `${scenario.emoji} Travail terminé`,
                description: scenario.text,
                thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
                fields,
            })] });
        });
    },
};
