// ─── CoinsBot — Commande: poker ──────────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom, shuffleArray } = require('../../utils/rng');
const config = require('../../config');

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const RANK_VAL = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14 };

function createDeck() {
    const d = [];
    for (const s of SUITS) for (const r of RANKS) d.push({ suit: s, rank: r, val: RANK_VAL[r], display: `${r}${s}` });
    return shuffleArray(d);
}

function evaluateHand(hand) {
    const vals = hand.map(c => c.val).sort((a, b) => a - b);
    const suits = hand.map(c => c.suit);
    const isFlush = suits.every(s => s === suits[0]);
    const isStraight = vals.every((v, i) => i === 0 || v === vals[i - 1] + 1) || (vals.join(',') === '2,3,4,5,14');

    const counts = {};
    vals.forEach(v => counts[v] = (counts[v] || 0) + 1);
    const groups = Object.values(counts).sort((a, b) => b - a);

    if (isFlush && isStraight && vals[4] === 14) return { rank: 9, name: 'Quinte Flush Royale 👑', mult: 100 };
    if (isFlush && isStraight) return { rank: 8, name: 'Quinte Flush 🌟', mult: 50 };
    if (groups[0] === 4) return { rank: 7, name: 'Carré 🔥', mult: 25 };
    if (groups[0] === 3 && groups[1] === 2) return { rank: 6, name: 'Full House 🏠', mult: 9 };
    if (isFlush) return { rank: 5, name: 'Couleur ♠️', mult: 6 };
    if (isStraight) return { rank: 4, name: 'Quinte 📈', mult: 4 };
    if (groups[0] === 3) return { rank: 3, name: 'Brelan 🎯', mult: 3 };
    if (groups[0] === 2 && groups[1] === 2) return { rank: 2, name: 'Double Paire ✌️', mult: 2 };
    if (groups[0] === 2) return { rank: 1, name: 'Paire 👯', mult: 1 };
    return { rank: 0, name: 'Carte haute', mult: 0 };
}

module.exports = {
    name: 'poker',
    aliases: ['videopoker', 'vp'],
    category: 'casino',
    description: 'Vidéo Poker — 5 cartes, échangez pour gagner !',
    usage: '&poker <mise>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (!args[0]) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise requise`, description: `\`${config.defaultPrefix}poker <mise>\`` })] });

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const balance = Number(user.global_balance);
            const bet = parseAmount(args[0], balance);

            if (!bet || bet < config.casino.minBet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise invalide` })] });
            if (bet > balance) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants` })] });

            const deck = createDeck();
            let hand = deck.splice(0, 5);

            const handStr = () => hand.map((c, i) => `**${i + 1}.** \`${c.display}\``).join('  ');
            const result = evaluateHand(hand);

            const msg = await message.reply({ embeds: [createEmbed({
                color: COLORS.CASINO, title: '🃏 Vidéo Poker',
                description: `${handStr()}\n\nMain: **${result.name}**\n\n💡 Tapez les numéros des cartes à échanger (ex: \`1 3 5\`) ou \`ok\` pour garder.`,
                fields: [{ name: '💰 Mise', value: formatMoney(bet), inline: true }],
            })] });

            const filter = m => m.author.id === message.author.id;
            const collector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

            collector.on('collect', async (m) => {
                try { await m.delete(); } catch {}
                const content = m.content.toLowerCase().trim();

                if (content !== 'ok' && content !== 'garder') {
                    const toReplace = content.split(/[\s,]+/).map(n => parseInt(n) - 1).filter(n => n >= 0 && n < 5);
                    const unique = [...new Set(toReplace)];
                    unique.forEach(idx => { if (deck.length > 0) hand[idx] = deck.shift(); });
                }

                const finalResult = evaluateHand(hand);
                const winnings = finalResult.mult > 0 ? Math.floor(bet * finalResult.mult) : -bet;
                const newBalance = balance + winnings;

                await atomicTransaction(sequelize, async (t) => {
                    await User.update({ global_balance: newBalance }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({
                        from_user_id: message.author.id, amount: Math.abs(winnings),
                        type: winnings >= 0 ? 'casino_win' : 'casino_loss',
                        description: `Poker — ${finalResult.name}`, balance_after: newBalance,
                    }, { transaction: t });
                });

                msg.edit({ embeds: [createEmbed({
                    color: winnings >= 0 ? COLORS.SUCCESS : COLORS.ERROR,
                    title: '🃏 Vidéo Poker — Résultat',
                    description: `${hand.map((c, i) => `\`${c.display}\``).join('  ')}\n\nMain: **${finalResult.name}**\n\n${winnings >= 0 ? `🎉 Vous gagnez **${formatMoney(winnings)}** ! (x${finalResult.mult})` : `😔 Pas de main gagnante. -${formatMoney(bet)}`}`,
                    fields: [{ name: `${config.emojis.wallet} Solde`, value: formatMoney(newBalance), inline: true }],
                })] });
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    await atomicTransaction(sequelize, async (t) => {
                        await User.update({ global_balance: balance - bet }, { where: { id: message.author.id }, transaction: t });
                    });
                    msg.edit({ embeds: [createEmbed({ color: COLORS.ERROR, title: '🃏 Temps écoulé', description: `Mise perdue.` })] });
                }
            });
        });
    },
};
