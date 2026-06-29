// ─── CoinsBot — Commande: mines ──────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom, shuffleArray } = require('../../utils/rng');
const config = require('../../config');

module.exports = {
    name: 'mines',
    aliases: ['mine', 'démineur'],
    category: 'casino',
    description: 'Jeu de démineur — trouvez les diamants, évitez les mines !',
    usage: '&mines <mise> [nb_mines 1-20]',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (!args[0]) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise requise`, description: `\`${config.defaultPrefix}mines <mise> [nb_mines]\`` })] });

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const balance = Number(user.global_balance);
            const bet = parseAmount(args[0], balance);
            const mineCount = Math.min(20, Math.max(1, parseInt(args[1]) || 5));

            if (!bet || bet < config.casino.minBet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise invalide`, description: `Minimum : ${formatMoney(config.casino.minBet)}` })] });
            if (bet > balance) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants` })] });

            const GRID_SIZE = 25;
            const grid = new Array(GRID_SIZE).fill(false);
            // Placer les mines aléatoirement
            const positions = shuffleArray([...Array(GRID_SIZE).keys()]).slice(0, mineCount);
            positions.forEach(p => grid[p] = true);

            const safeTiles = GRID_SIZE - mineCount;
            let revealed = 0;
            let cashoutAvailable = false;
            let gameOver = false;

            const getMultiplier = (clicks) => {
                if (clicks === 0) return 1;
                let multi = 1;
                for (let i = 0; i < clicks; i++) {
                    multi *= (GRID_SIZE - i) / (GRID_SIZE - mineCount - i + (GRID_SIZE - i - safeTiles + revealed));
                }
                return Math.max(1, 1 + (clicks * mineCount * 0.08));
            };

            const renderGrid = (revealedTiles, hitMine = -1) => {
                let display = '';
                for (let i = 0; i < GRID_SIZE; i++) {
                    if (hitMine >= 0 && grid[i]) display += '💥';
                    else if (revealedTiles.has(i)) display += '💎';
                    else display += `${i + 1}️⃣`.length > 3 ? '⬜' : '⬜';
                    if ((i + 1) % 5 === 0) display += '\n';
                }
                return display;
            };

            const revealedTiles = new Set();
            const multiplier = () => 1 + (revealed * mineCount * 0.08);

            const buildEmbed = () => createEmbed({
                color: COLORS.CASINO, title: '💣 Mines',
                description: `Tapez un numéro (**1-${GRID_SIZE}**) pour révéler, ou \`stop\` pour encaisser.\n\n💎 Trouvés: **${revealed}** | 💣 Mines: **${mineCount}** | x${multiplier().toFixed(2)}\n\n💰 Gain actuel: **${formatMoney(Math.floor(bet * multiplier()))}**`,
                fields: [{ name: '💰 Mise', value: formatMoney(bet), inline: true }],
            });

            const msg = await message.reply({ embeds: [buildEmbed()] });
            const filter = m => m.author.id === message.author.id && (/^\d+$/.test(m.content) || ['stop', 'cashout', 'cash', 'encaisser'].includes(m.content.toLowerCase()));
            const collector = message.channel.createMessageCollector({ filter, time: 120000 });

            collector.on('collect', async (m) => {
                if (gameOver) return;
                try { await m.delete(); } catch {}

                if (['stop', 'cashout', 'cash', 'encaisser'].includes(m.content.toLowerCase())) {
                    if (revealed === 0) return;
                    gameOver = true; collector.stop();
                    const winnings = Math.floor(bet * multiplier()) - bet;
                    await atomicTransaction(sequelize, async (t) => {
                        await User.update({ global_balance: balance + winnings }, { where: { id: message.author.id }, transaction: t });
                        await Transaction.create({ from_user_id: message.author.id, amount: winnings, type: 'casino_win', description: `Mines — Cashout x${multiplier().toFixed(2)}`, balance_after: balance + winnings }, { transaction: t });
                    });
                    return msg.edit({ embeds: [createEmbed({
                        color: COLORS.SUCCESS, title: '💣 Mines — Encaissé !',
                        description: `💎 ${revealed} diamant(s) trouvé(s) | x${multiplier().toFixed(2)}\n\n🎉 Vous encaissez **${formatMoney(Math.floor(bet * multiplier()))}** !`,
                        fields: [{ name: `${config.emojis.wallet} Solde`, value: formatMoney(balance + winnings), inline: true }],
                    })] });
                }

                const tile = parseInt(m.content) - 1;
                if (tile < 0 || tile >= GRID_SIZE || revealedTiles.has(tile)) return;

                if (grid[tile]) {
                    // BOOM
                    gameOver = true; collector.stop();
                    await atomicTransaction(sequelize, async (t) => {
                        await User.update({ global_balance: balance - bet }, { where: { id: message.author.id }, transaction: t });
                        await Transaction.create({ from_user_id: message.author.id, amount: bet, type: 'casino_loss', description: 'Mines — Explosion', balance_after: balance - bet }, { transaction: t });
                    });
                    return msg.edit({ embeds: [createEmbed({
                        color: COLORS.ERROR, title: '💣 BOOOM ! 💥',
                        description: `Vous avez touché une mine !\n\n😔 Vous perdez **${formatMoney(bet)}**.`,
                        fields: [{ name: `${config.emojis.wallet} Solde`, value: formatMoney(balance - bet), inline: true }],
                    })] });
                }

                revealedTiles.add(tile);
                revealed++;

                if (revealed >= safeTiles) {
                    gameOver = true; collector.stop();
                    const winnings = Math.floor(bet * multiplier()) - bet;
                    await atomicTransaction(sequelize, async (t) => {
                        await User.update({ global_balance: balance + winnings }, { where: { id: message.author.id }, transaction: t });
                        await Transaction.create({ from_user_id: message.author.id, amount: winnings, type: 'casino_win', description: 'Mines — Tous trouvés', balance_after: balance + winnings }, { transaction: t });
                    });
                    return msg.edit({ embeds: [createEmbed({
                        color: COLORS.SUCCESS, title: '💣 Mines — VICTOIRE TOTALE ! 🏆',
                        description: `Vous avez trouvé TOUS les diamants !\n\n🎉 Gain : **${formatMoney(Math.floor(bet * multiplier()))}**`,
                        fields: [{ name: `${config.emojis.wallet} Solde`, value: formatMoney(balance + winnings), inline: true }],
                    })] });
                }

                msg.edit({ embeds: [buildEmbed()] });
            });

            collector.on('end', async (_, reason) => {
                if (!gameOver && reason === 'time') {
                    gameOver = true;
                    if (revealed > 0) {
                        const winnings = Math.floor(bet * multiplier()) - bet;
                        await atomicTransaction(sequelize, async (t) => {
                            await User.update({ global_balance: balance + winnings }, { where: { id: message.author.id }, transaction: t });
                        });
                        msg.edit({ embeds: [createEmbed({ color: COLORS.WARNING, title: '💣 Temps écoulé — Encaissé automatiquement', description: `Gain : ${formatMoney(Math.floor(bet * multiplier()))}` })] });
                    } else {
                        await atomicTransaction(sequelize, async (t) => {
                            await User.update({ global_balance: balance - bet }, { where: { id: message.author.id }, transaction: t });
                        });
                        msg.edit({ embeds: [createEmbed({ color: COLORS.ERROR, title: '💣 Temps écoulé', description: `Mise perdue.` })] });
                    }
                }
            });
        });
    },
};
