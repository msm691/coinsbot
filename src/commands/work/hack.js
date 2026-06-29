// ─── CoinsBot — Commande: hack ───────────────────────────────────────────────
const { User, Transaction, Inventory, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatDuration } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom, secureRandomFloat } = require('../../utils/rng');
const config = require('../../config');

module.exports = {
    name: 'hack',
    aliases: ['hacker', 'pirate', 'pirater'],
    category: 'work',
    description: 'Pirater un système pour voler de l\'argent (nécessite un Ordinateur).',
    usage: '&hack',
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

            // Check for Ordinateur in inventory
            const pc = await Inventory.findOne({ where: { user_id: message.author.id, item_name: 'Ordinateur' } });
            if (!pc || pc.quantity < 1) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: '💻 Ordinateur requis', description: `Achetez un **Ordinateur** dans la boutique (\`${config.defaultPrefix}shop\`).` })] });
            }

            const success = secureRandomFloat() < 0.50;

            if (success) {
                const gain = secureRandom(1000, 8001);
                await atomicTransaction(sequelize, async (t) => {
                    const newBal = Number(user.global_balance) + gain;
                    await User.update({ global_balance: newBal, last_crime: new Date(), xp: user.xp + secureRandom(15, 30) }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: gain, type: 'crime', description: 'Piratage réussi', balance_after: newBal }, { transaction: t });
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS, title: '💻 Piratage réussi !',
                    description: 'Vous avez infiltré un système bancaire et transféré des fonds !',
                    fields: [
                        { name: '💰 Butin', value: formatMoney(gain), inline: true },
                        { name: `${config.emojis.wallet} Solde`, value: formatMoney(Number(user.global_balance) + gain), inline: true },
                    ],
                })] });
            } else {
                const fine = secureRandom(500, 3001);
                const prisonMin = secureRandom(10, 46);
                const prisonUntil = new Date(Date.now() + prisonMin * 60000);
                // 20% chance de perdre l'ordinateur
                const losePC = secureRandomFloat() < 0.20;

                await atomicTransaction(sequelize, async (t) => {
                    const newBal = Math.max(0, Number(user.global_balance) - fine);
                    await User.update({ global_balance: newBal, last_crime: new Date(), in_prison: true, prison_until: prisonUntil }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: fine, type: 'fine', description: 'Piratage échoué — Arrêté par la cybersécurité', balance_after: newBal }, { transaction: t });
                    if (losePC) {
                        const newQty = pc.quantity - 1;
                        if (newQty <= 0) await Inventory.destroy({ where: { id: pc.id }, transaction: t });
                        else await Inventory.update({ quantity: newQty }, { where: { id: pc.id }, transaction: t });
                    }
                });

                const fields = [
                    { name: '💸 Amende', value: formatMoney(fine), inline: true },
                    { name: `${config.emojis.prison} Prison`, value: `${prisonMin} minutes`, inline: true },
                ];
                if (losePC) fields.push({ name: '💻 Ordinateur perdu', value: 'Confisqué par la police', inline: true });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.ERROR, title: '🚨 Piratage échoué !',
                    description: 'La cybersécurité vous a repéré et arrêté !',
                    fields,
                })] });
            }
        });
    },
};
