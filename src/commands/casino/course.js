// ─── CoinsBot — Commande: course ─────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom } = require('../../utils/rng');
const config = require('../../config');

const RACERS = [
    { name: 'Éclair', emoji: '🐎', odds: 2.0 },
    { name: 'Tonnerre', emoji: '🦄', odds: 3.0 },
    { name: 'Tempête', emoji: '🐴', odds: 1.8 },
    { name: 'Flash', emoji: '🏇', odds: 4.0 },
    { name: 'Ouragan', emoji: '🐎', odds: 5.0 },
];

module.exports = {
    name: 'course',
    aliases: ['race', 'horserace', 'chevaux'],
    category: 'casino',
    description: 'Parier sur une course de chevaux.',
    usage: '&course <mise> <numéro_cheval 1-5>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (args.length < 2) {
            const list = RACERS.map((r, i) => `**${i + 1}.** ${r.emoji} ${r.name} — Cote x${r.odds}`).join('\n');
            return message.reply({ embeds: [createEmbed({ color: COLORS.CASINO, title: '🏇 Course de chevaux', description: `${list}\n\n\`${config.defaultPrefix}course <mise> <1-5>\`` })] });
        }

        const pick = parseInt(args[1]) - 1;
        if (pick < 0 || pick >= RACERS.length) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Cheval invalide`, description: 'Choisissez entre 1 et 5.' })] });

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const balance = Number(user.global_balance);
            const bet = parseAmount(args[0], balance);

            if (!bet || bet < config.casino.minBet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise invalide` })] });
            if (bet > balance) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants` })] });

            // Simuler la course — pondéré par les odds inverses
            const weights = RACERS.map(r => 1 / r.odds);
            const totalWeight = weights.reduce((a, b) => a + b, 0);
            let roll = secureRandom(0, 10000) / 10000 * totalWeight;
            let winner = 0;
            for (let i = 0; i < weights.length; i++) {
                roll -= weights[i];
                if (roll <= 0) { winner = i; break; }
            }

            const positions = RACERS.map((r, i) => ({
                ...r, index: i,
                progress: i === winner ? 10 : secureRandom(3, 9),
            })).sort((a, b) => b.progress - a.progress);

            const raceDisplay = positions.map((r, pos) => {
                const bar = '▓'.repeat(r.progress) + '░'.repeat(10 - r.progress);
                const medal = pos === 0 ? '🥇' : pos === 1 ? '🥈' : pos === 2 ? '🥉' : '  ';
                return `${medal} ${r.emoji} ${r.name} ${bar}`;
            }).join('\n');

            const won = pick === winner;
            const chosenRacer = RACERS[pick];
            const winAmount = won ? Math.floor(bet * chosenRacer.odds) - bet : -bet;
            const newBalance = balance + winAmount;

            await atomicTransaction(sequelize, async (t) => {
                await User.update({ global_balance: newBalance }, { where: { id: message.author.id }, transaction: t });
                await Transaction.create({ from_user_id: message.author.id, amount: Math.abs(winAmount), type: won ? 'casino_win' : 'casino_loss', description: `Course — ${chosenRacer.name} ${won ? 'gagne' : 'perd'}`, balance_after: newBalance }, { transaction: t });
            });

            message.reply({ embeds: [createEmbed({
                color: won ? COLORS.SUCCESS : COLORS.ERROR,
                title: `🏇 Course — ${RACERS[winner].emoji} ${RACERS[winner].name} gagne !`,
                description: `${raceDisplay}\n\nVotre pari : **${chosenRacer.emoji} ${chosenRacer.name}** (x${chosenRacer.odds})\n${won ? `🎉 Vous gagnez **${formatMoney(Math.floor(bet * chosenRacer.odds))}** !` : `😔 Vous perdez **${formatMoney(bet)}**.`}`,
                fields: [{ name: `${config.emojis.wallet} Solde`, value: formatMoney(newBalance), inline: true }],
            })] });
        });
    },
};
