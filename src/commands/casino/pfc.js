// ─── CoinsBot — Commande: pfc (Pierre-Feuille-Ciseaux) ───────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom } = require('../../utils/rng');
const config = require('../../config');

const CHOICES = { pierre: '🪨', feuille: '📄', ciseaux: '✂️', rock: '🪨', paper: '📄', scissors: '✂️' };
const WINS = { pierre: 'ciseaux', feuille: 'pierre', ciseaux: 'feuille' };
const NORMALIZE = { rock: 'pierre', paper: 'feuille', scissors: 'ciseaux', pierre: 'pierre', feuille: 'feuille', ciseaux: 'ciseaux' };

module.exports = {
    name: 'pfc',
    aliases: ['rps', 'shifumi', 'chifoumi'],
    category: 'casino',
    description: 'Pierre-Feuille-Ciseaux avec mise.',
    usage: '&pfc <mise> <pierre|feuille|ciseaux>',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (args.length < 2) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Utilisation`, description: `\`${config.defaultPrefix}pfc <mise> <pierre|feuille|ciseaux>\`` })] });

        const choice = NORMALIZE[args[1].toLowerCase()];
        if (!choice) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Choix invalide`, description: 'Choisissez `pierre`, `feuille` ou `ciseaux`.' })] });

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const balance = Number(user.global_balance);
            const bet = parseAmount(args[0], balance);

            if (!bet || bet < config.casino.minBet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise invalide` })] });
            if (bet > balance) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants` })] });

            const botChoices = ['pierre', 'feuille', 'ciseaux'];
            const botChoice = botChoices[secureRandom(0, 3)];
            const playerEmoji = CHOICES[choice];
            const botEmoji = CHOICES[botChoice];

            let result, winAmount, color;
            if (choice === botChoice) {
                result = '🤝 Égalité !'; winAmount = 0; color = COLORS.WARNING;
            } else if (WINS[choice] === botChoice) {
                result = '🎉 Vous gagnez !'; winAmount = bet; color = COLORS.SUCCESS;
            } else {
                result = '😔 Vous perdez !'; winAmount = -bet; color = COLORS.ERROR;
            }

            const newBalance = balance + winAmount;
            await atomicTransaction(sequelize, async (t) => {
                await User.update({ global_balance: newBalance }, { where: { id: message.author.id }, transaction: t });
                if (winAmount !== 0) await Transaction.create({ from_user_id: message.author.id, amount: Math.abs(winAmount), type: winAmount > 0 ? 'casino_win' : 'casino_loss', description: `PFC — ${choice} vs ${botChoice}`, balance_after: newBalance }, { transaction: t });
            });

            message.reply({ embeds: [createEmbed({
                color, title: '✊ Pierre-Feuille-Ciseaux',
                description: `${playerEmoji} **vs** ${botEmoji}\n\nVous : **${choice}** | Bot : **${botChoice}**\n\n${result}${winAmount !== 0 ? ` **${formatMoney(Math.abs(winAmount))}**` : ''}`,
                fields: [{ name: `${config.emojis.wallet} Solde`, value: formatMoney(newBalance), inline: true }],
            })] });
        });
    },
};
