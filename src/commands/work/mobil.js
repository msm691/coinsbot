// ─── CoinsBot — Commande: mobil ──────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom, secureRandomFloat } = require('../../utils/rng');
const config = require('../../config');

const SCENARIOS = [
    { text: 'Vous avez volé un smartphone dans le métro 📱', gain: { min: 200, max: 1500 } },
    { text: 'Vous avez piraté un distributeur automatique 🏧', gain: { min: 500, max: 3000 } },
    { text: 'Vous avez escroqué quelqu\'un par téléphone 📞', gain: { min: 300, max: 2000 } },
    { text: 'Vous avez revendu des téléphones volés 📦', gain: { min: 400, max: 2500 } },
];

module.exports = {
    name: 'mobil',
    aliases: ['mobile', 'pickpocket', 'vol'],
    category: 'work',
    description: 'Commettre un petit larcin (vol à la tire).',
    usage: '&mobil',
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
                if (remaining > 0) return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, title: `${config.emojis.warning} Cooldown`, description: `Attendez **${formatDuration(remaining)}**.` })] });
            }

            const scenario = SCENARIOS[secureRandom(0, SCENARIOS.length)];
            const success = secureRandomFloat() < 0.55; // 55% réussite

            if (success) {
                const gain = secureRandom(scenario.gain.min, scenario.gain.max + 1);
                await atomicTransaction(sequelize, async (t) => {
                    const newBal = Number(user.global_balance) + gain;
                    await User.update({ global_balance: newBal, last_crime: new Date(), xp: user.xp + secureRandom(5, 12) }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: gain, type: 'crime', description: scenario.text, balance_after: newBal }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: '📱 Larcin réussi !',
                    description: scenario.text,
                    fields: [
                        { name: '💰 Butin', value: formatMoney(secureRandom(scenario.gain.min, scenario.gain.max + 1)), inline: true },
                        { name: `${config.emojis.wallet} Solde`, value: formatMoney(Number(user.global_balance) + gain), inline: true },
                    ],
                })] });
            } else {
                const fine = secureRandom(100, 800);
                const prisonMin = secureRandom(3, 15);
                const prisonUntil = new Date(Date.now() + prisonMin * 60000);

                await atomicTransaction(sequelize, async (t) => {
                    const newBal = Math.max(0, Number(user.global_balance) - fine);
                    await User.update({ global_balance: newBal, last_crime: new Date(), in_prison: true, prison_until: prisonUntil }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: fine, type: 'fine', description: 'Arrêté pour vol à la tire', balance_after: newBal }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.ERROR, title: '🚔 Attrapé !',
                    description: 'Un passant vous a repéré et a appelé la police !',
                    fields: [
                        { name: '💸 Amende', value: formatMoney(fine), inline: true },
                        { name: `${config.emojis.prison} Prison`, value: `${prisonMin} minutes`, inline: true },
                    ],
                })] });
            }
        });
    },
};
