// ─── CoinsBot — Commande: braquage ───────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom, secureRandomFloat } = require('../../utils/rng');
const config = require('../../config');

const SUCCESS_MSGS = [
    'Vous avez braqué une banque avec brio ! 💰',
    'Braquage d\'une bijouterie réussi ! 💎',
    'Vous avez dévalisé un transport de fonds ! 🚛',
    'Cambriolage d\'un coffre-fort réussi ! 🔐',
];
const FAIL_MSGS = [
    'La police vous a attrapé ! 🚔',
    'Un témoin vous a dénoncé ! 👁️',
    'Les caméras vous ont repéré ! 📹',
    'L\'alarme s\'est déclenchée ! 🚨',
];

module.exports = {
    name: 'braquage',
    aliases: ['rob', 'braquer', 'voler'],
    category: 'work',
    description: 'Tenter un braquage (risqué).',
    usage: '&braquage',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

            if (user.in_prison && user.prison_until && new Date(user.prison_until) > new Date()) {
                const rem = new Date(user.prison_until).getTime() - Date.now();
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.prison} En prison`, description: `Sortie dans **${formatDuration(rem)}**.` })] });
            }

            if (user.last_crime) {
                const elapsed = Date.now() - new Date(user.last_crime).getTime();
                const remaining = config.cooldowns.crime - elapsed;
                if (remaining > 0) {
                    return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: `${config.emojis.warning} Cooldown`, description: `Attendez **${formatDuration(remaining)}**.` })] });
                }
            }

            const successRate = 0.45; // 45% de réussite
            const success = secureRandomFloat() < successRate;

            if (success) {
                const gain = secureRandom(500, 5001);
                const msg = SUCCESS_MSGS[secureRandom(0, SUCCESS_MSGS.length)];

                await atomicTransaction(sequelize, async (t) => {
                    const newBal = Number(user.global_balance) + gain;
                    await User.update({ global_balance: newBal, last_crime: new Date(), xp: user.xp + secureRandom(10, 25) }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: gain, type: 'crime', description: msg, balance_after: newBal }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: '🔫 Braquage réussi !',
                    description: msg, thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
                    fields: [
                        { name: '💰 Butin', value: formatMoney(gain), inline: true },
                        { name: `${config.emojis.wallet} Solde`, value: formatMoney(Number(user.global_balance) + gain), inline: true },
                    ],
                })] });
            } else {
                const fine = secureRandom(200, 2001);
                const prisonMinutes = secureRandom(5, 31);
                const prisonUntil = new Date(Date.now() + prisonMinutes * 60000);
                const msg = FAIL_MSGS[secureRandom(0, FAIL_MSGS.length)];

                await atomicTransaction(sequelize, async (t) => {
                    const newBal = Math.max(0, Number(user.global_balance) - fine);
                    await User.update({ global_balance: newBal, last_crime: new Date(), in_prison: true, prison_until: prisonUntil }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: fine, type: 'fine', description: `Amende — ${msg}`, balance_after: newBal }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.ERROR, title: '🚔 Braquage échoué !',
                    description: msg, thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
                    fields: [
                        { name: '💸 Amende', value: formatMoney(fine), inline: true },
                        { name: `${config.emojis.prison} Prison`, value: `${prisonMinutes} minutes`, inline: true },
                    ],
                })] });
            }
        });
    },
};
