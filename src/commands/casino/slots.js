// ─── CoinsBot — Commande: slots ──────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom } = require('../../utils/rng');
const config = require('../../config');

const SYMBOLS = [
    { emoji: '🍒', weight: 30 },
    { emoji: '🍋', weight: 25 },
    { emoji: '🍊', weight: 20 },
    { emoji: '🍇', weight: 15 },
    { emoji: '💎', weight: 7 },
    { emoji: '7️⃣', weight: 3 },
];

const PAYOUTS = {
    '🍒': 1.5, '🍋': 2, '🍊': 2.5, '🍇': 3, '💎': 5, '7️⃣': 10,
};

function spin() {
    const totalWeight = SYMBOLS.reduce((s, sym) => s + sym.weight, 0);
    const result = [];
    for (let i = 0; i < 3; i++) {
        let roll = secureRandom(0, totalWeight);
        for (const sym of SYMBOLS) {
            roll -= sym.weight;
            if (roll < 0) { result.push(sym.emoji); break; }
        }
    }
    return result;
}

module.exports = {
    name: 'slots',
    aliases: ['slot', 'machine'],
    category: 'casino',
    description: 'Jouer à la machine à sous.',
    usage: '&slots <mise>',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (!args[0]) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise requise`, description: `\`${config.defaultPrefix}slots <mise>\`` })] });

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const balance = Number(user.global_balance);
            const bet = parseAmount(args[0], balance);

            if (!bet || bet < config.casino.minBet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise invalide`, description: `Minimum : ${formatMoney(config.casino.minBet)}` })] });
            if (bet > balance) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants` })] });
            if (bet > config.casino.maxBet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise trop élevée`, description: `Maximum : ${formatMoney(config.casino.maxBet)}` })] });

            const reels = spin();
            const [r1, r2, r3] = reels;
            const allSame = r1 === r2 && r2 === r3;
            const twoSame = r1 === r2 || r2 === r3 || r1 === r3;

            let winAmount = 0;
            let resultText;
            let color;

            if (allSame) {
                const multiplier = PAYOUTS[r1] || 2;
                winAmount = Math.floor(bet * multiplier);
                resultText = `🎉 **JACKPOT !** Vous gagnez **${formatMoney(winAmount)}** ! (x${multiplier})`;
                color = COLORS.SUCCESS;
            } else if (twoSame) {
                winAmount = Math.floor(bet * 0.5);
                resultText = `😊 Deux symboles identiques ! Vous gagnez **${formatMoney(winAmount)}** !`;
                color = COLORS.WARNING;
            } else {
                winAmount = -bet;
                resultText = `😔 Pas de chance. Vous perdez **${formatMoney(bet)}**.`;
                color = COLORS.ERROR;
            }

            const newBalance = balance + winAmount;
            await atomicTransaction(sequelize, async (t) => {
                await User.update({ global_balance: newBalance }, { where: { id: message.author.id }, transaction: t });
                await Transaction.create({
                    from_user_id: message.author.id, amount: Math.abs(winAmount),
                    type: winAmount >= 0 ? 'casino_win' : 'casino_loss',
                    description: `Slots — ${allSame ? 'Jackpot' : twoSame ? 'Paire' : 'Perdu'}`,
                    balance_after: newBalance,
                }, { transaction: t });
            });

            const slotDisplay = `\n> ╔═══════════╗\n> ║ ${r1} │ ${r2} │ ${r3} ║\n> ╚═══════════╝`;

            message.reply({ embeds: [createEmbed({
                color, title: '🎰 Machine à sous',
                description: `${slotDisplay}\n\n${resultText}`,
                fields: [
                    { name: '💰 Mise', value: formatMoney(bet), inline: true },
                    { name: `${config.emojis.wallet} Solde`, value: formatMoney(newBalance), inline: true },
                ],
            })] });
        });
    },
};
