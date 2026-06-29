// ─── CoinsBot — Commande: recolt ─────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom, secureRandomFloat } = require('../../utils/rng');
const config = require('../../config');

const PLANTS = [
    { name: 'Cannabis', emoji: '🌿', gain: { min: 300, max: 2000 }, risk: 0.30 },
    { name: 'Champignons', emoji: '🍄', gain: { min: 500, max: 3000 }, risk: 0.35 },
    { name: 'Pavot', emoji: '🌺', gain: { min: 800, max: 5000 }, risk: 0.40 },
];

module.exports = {
    name: 'recolt',
    aliases: ['recolte', 'récolte', 'plantation'],
    category: 'work',
    description: 'Récolter des plantations illégales.',
    usage: '&recolt',
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

            const plant = PLANTS[secureRandom(0, PLANTS.length)];
            const caught = secureRandomFloat() < plant.risk;

            if (!caught) {
                const gain = secureRandom(plant.gain.min, plant.gain.max + 1);
                await atomicTransaction(sequelize, async (t) => {
                    const newBal = Number(user.global_balance) + gain;
                    await User.update({ global_balance: newBal, last_crime: new Date(), xp: user.xp + secureRandom(8, 20) }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: gain, type: 'crime', description: `Récolte de ${plant.name}`, balance_after: newBal }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: `${plant.emoji} Récolte réussie !`,
                    description: `Vous avez récolté du **${plant.name}** et l'avez revendu !`,
                    fields: [
                        { name: '💰 Gains', value: formatMoney(secureRandom(plant.gain.min, plant.gain.max + 1)), inline: true },
                        { name: `${config.emojis.wallet} Solde`, value: formatMoney(Number(user.global_balance) + gain), inline: true },
                    ],
                })] });
            } else {
                const fine = secureRandom(300, 1501);
                const prisonMin = secureRandom(5, 20);
                const prisonUntil = new Date(Date.now() + prisonMin * 60000);

                await atomicTransaction(sequelize, async (t) => {
                    const newBal = Math.max(0, Number(user.global_balance) - fine);
                    await User.update({ global_balance: newBal, last_crime: new Date(), in_prison: true, prison_until: prisonUntil }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: fine, type: 'fine', description: `Arrêté pour culture de ${plant.name}`, balance_after: newBal }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.ERROR, title: '🚔 Plantation saisie !',
                    description: `La brigade des stups a découvert votre plantation de **${plant.name}** !`,
                    fields: [
                        { name: '💸 Amende', value: formatMoney(fine), inline: true },
                        { name: `${config.emojis.prison} Prison`, value: `${prisonMin} minutes`, inline: true },
                    ],
                })] });
            }
        });
    },
};
