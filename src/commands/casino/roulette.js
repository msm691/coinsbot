// ─── CoinsBot — Commande: roulette ───────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom } = require('../../utils/rng');
const config = require('../../config');

const REDS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

module.exports = {
    name: 'roulette',
    aliases: ['roul', 'rl'],
    category: 'casino',
    description: 'Jouer à la roulette.',
    usage: '&roulette <mise> <rouge|noir|pair|impair|numéro>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (args.length < 2) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Utilisation`, description: `\`${config.defaultPrefix}roulette <mise> <rouge|noir|pair|impair|0-36>\`` })] });

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const balance = Number(user.global_balance);
            const bet = parseAmount(args[0], balance);
            const choice = args[1].toLowerCase();

            if (!bet || bet < config.casino.minBet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise invalide`, description: `Minimum : ${formatMoney(config.casino.minBet)}` })] });
            if (bet > balance) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants` })] });

            const validChoices = ['rouge', 'red', 'noir', 'black', 'pair', 'even', 'impair', 'odd'];
            const isNumber = /^\d+$/.test(choice) && parseInt(choice) >= 0 && parseInt(choice) <= 36;
            if (!validChoices.includes(choice) && !isNumber) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Choix invalide`, description: 'Options : `rouge`, `noir`, `pair`, `impair`, ou un numéro `0-36`.' })] });
            }

            const result = secureRandom(0, 37); // 0-36
            const isRed = REDS.includes(result);
            const resultColor = result === 0 ? '🟢' : isRed ? '🔴' : '⚫';
            const resultText = `${resultColor} **${result}**`;

            let won = false;
            let multiplier = 1;

            if (isNumber) {
                won = parseInt(choice) === result;
                multiplier = 35; // 35:1
            } else if (['rouge', 'red'].includes(choice)) {
                won = isRed;
            } else if (['noir', 'black'].includes(choice)) {
                won = !isRed && result !== 0;
            } else if (['pair', 'even'].includes(choice)) {
                won = result !== 0 && result % 2 === 0;
            } else if (['impair', 'odd'].includes(choice)) {
                won = result % 2 === 1;
            }

            const winAmount = won ? Math.floor(bet * multiplier) : -bet;
            const newBalance = balance + winAmount;

            await atomicTransaction(sequelize, async (t) => {
                await User.update({ global_balance: newBalance }, { where: { id: message.author.id }, transaction: t });
                await Transaction.create({
                    from_user_id: message.author.id, amount: Math.abs(winAmount),
                    type: won ? 'casino_win' : 'casino_loss',
                    description: `Roulette — ${choice} → ${result}`,
                    balance_after: newBalance,
                }, { transaction: t });
            });

            const choiceDisplay = isNumber ? `Numéro ${choice}` : choice.charAt(0).toUpperCase() + choice.slice(1);

            message.reply({ embeds: [createEmbed({
                color: won ? COLORS.SUCCESS : COLORS.ERROR,
                title: '🎡 Roulette',
                description: `La bille tombe sur ${resultText}\n\nVotre pari : **${choiceDisplay}**\n${won ? `🎉 Vous gagnez **${formatMoney(Math.abs(winAmount))}** ! (x${multiplier + 1})` : `😔 Vous perdez **${formatMoney(bet)}**.`}`,
                fields: [
                    { name: '💰 Mise', value: formatMoney(bet), inline: true },
                    { name: `${config.emojis.wallet} Solde`, value: formatMoney(newBalance), inline: true },
                ],
            })] });
        });
    },
};
