// ─── CoinsBot — Commande: crash ──────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandomFloat } = require('../../utils/rng');
const config = require('../../config');

module.exports = {
    name: 'crash',
    aliases: ['fusée', 'fusee', 'rocket'],
    category: 'casino',
    description: 'Pariez et encaissez avant le crash !',
    usage: '&crash <mise>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (!args[0]) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise requise`, description: `\`${config.defaultPrefix}crash <mise>\`` })] });

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const balance = Number(user.global_balance);
            const bet = parseAmount(args[0], balance);

            if (!bet || bet < config.casino.minBet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise invalide`, description: `Minimum : ${formatMoney(config.casino.minBet)}` })] });
            if (bet > balance) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants` })] });

            // Generate crash point (house edge ~3%)
            const crashPoint = Math.max(1.0, (1 / (1 - secureRandomFloat() * (1 - config.casino.houseEdge))));
            let multiplier = 1.00;
            let crashed = false;
            let cashedOut = false;

            const buildEmbed = (m, status = 'running') => {
                let color = COLORS.CASINO;
                let title = `${config.emojis.rocket} Crash — x${m.toFixed(2)}`;
                let desc = `La fusée monte...\nTapez \`stop\` pour encaisser !\n\n💰 Gain actuel: **${formatMoney(Math.floor(bet * m))}**`;

                if (status === 'crashed') {
                    color = COLORS.ERROR;
                    title = '💥 CRASH !';
                    desc = `La fusée a explosé à **x${crashPoint.toFixed(2)}** !\n\n😔 Vous perdez **${formatMoney(bet)}**.`;
                } else if (status === 'cashout') {
                    color = COLORS.SUCCESS;
                    title = `${config.emojis.success} Encaissé à x${m.toFixed(2)} !`;
                    desc = `🎉 Vous gagnez **${formatMoney(Math.floor(bet * m))}** !`;
                }

                return createEmbed({ color, title, description: desc, fields: [{ name: `${config.emojis.wallet} Solde`, value: formatMoney(status === 'crashed' ? balance - bet : balance + Math.floor(bet * m) - bet), inline: true }] });
            };

            const msg = await message.reply({ embeds: [buildEmbed(multiplier)] });
            const filter = m => m.author.id === message.author.id && ['stop', 'cash', 'cashout', 'encaisser'].includes(m.content.toLowerCase());
            const collector = message.channel.createMessageCollector({ filter, time: 60000 });

            collector.on('collect', async (m) => {
                if (crashed || cashedOut) return;
                try { await m.delete(); } catch {}
                cashedOut = true;
                collector.stop();
            });

            // Simulation loop
            const interval = setInterval(async () => {
                if (cashedOut || crashed) {
                    clearInterval(interval);
                    return;
                }

                multiplier += 0.1 + (multiplier * 0.05);

                if (multiplier >= crashPoint) {
                    crashed = true;
                    clearInterval(interval);
                    collector.stop();

                    await atomicTransaction(sequelize, async (t) => {
                        await User.update({ global_balance: balance - bet }, { where: { id: message.author.id }, transaction: t });
                        await Transaction.create({ from_user_id: message.author.id, amount: bet, type: 'casino_loss', description: `Crash — Explosé à x${crashPoint.toFixed(2)}`, balance_after: balance - bet }, { transaction: t });
                    });

                    msg.edit({ embeds: [buildEmbed(crashPoint, 'crashed')] });
                    return;
                }

                msg.edit({ embeds: [buildEmbed(multiplier)] }).catch(() => {});
            }, 1500);

            collector.on('end', async () => {
                if (cashedOut && !crashed) {
                    clearInterval(interval);
                    const winnings = Math.floor(bet * multiplier) - bet;

                    await atomicTransaction(sequelize, async (t) => {
                        await User.update({ global_balance: balance + winnings }, { where: { id: message.author.id }, transaction: t });
                        await Transaction.create({ from_user_id: message.author.id, amount: winnings, type: 'casino_win', description: `Crash — Encaissé x${multiplier.toFixed(2)}`, balance_after: balance + winnings }, { transaction: t });
                    });

                    msg.edit({ embeds: [buildEmbed(multiplier, 'cashout')] });
                }
            });
        });
    },
};
