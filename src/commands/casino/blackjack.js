// ─── CoinsBot — Commande: blackjack ──────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom } = require('../../utils/rng');
const config = require('../../config');

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
    const deck = [];
    for (const s of SUITS) for (const v of VALUES) deck.push({ suit: s, value: v, display: `${v}${s}` });
    return deck;
}

function cardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
}

function handValue(hand) {
    let total = hand.reduce((s, c) => s + cardValue(c), 0);
    let aces = hand.filter(c => c.value === 'A').length;
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function handDisplay(hand) { return hand.map(c => `\`${c.display}\``).join(' '); }

function drawCard(deck) {
    const idx = secureRandom(0, deck.length);
    return deck.splice(idx, 1)[0];
}

module.exports = {
    name: 'blackjack',
    aliases: ['bj', '21'],
    category: 'casino',
    description: 'Jouer au Blackjack.',
    usage: '&blackjack <mise>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        if (!args[0]) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise requise`, description: `\`${config.defaultPrefix}blackjack <mise>\`` })] });

        await lockUser(message.author.id, async () => {
            const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const balance = Number(user.global_balance);
            const bet = parseAmount(args[0], balance);

            if (!bet || bet < config.casino.minBet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise invalide`, description: `Mise minimum : ${formatMoney(config.casino.minBet)}` })] });
            if (bet > balance) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Vous avez ${formatMoney(balance)}.` })] });
            if (bet > config.casino.maxBet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise trop élevée`, description: `Maximum : ${formatMoney(config.casino.maxBet)}` })] });

            const deck = createDeck();
            const playerHand = [drawCard(deck), drawCard(deck)];
            const dealerHand = [drawCard(deck), drawCard(deck)];

            let playerTotal = handValue(playerHand);
            const dealerFirstCard = dealerHand[0];

            // Blackjack naturel
            if (playerTotal === 21) {
                const winnings = Math.floor(bet * 1.5);
                await atomicTransaction(sequelize, async (t) => {
                    await User.update({ global_balance: balance + winnings }, { where: { id: message.author.id }, transaction: t });
                    await Transaction.create({ from_user_id: message.author.id, amount: winnings, type: 'casino_win', description: 'Blackjack naturel', balance_after: balance + winnings }, { transaction: t });
                });
                return message.reply({ embeds: [createEmbed({
                    color: COLORS.CASINO, title: '🃏 BLACKJACK ! 🎉',
                    description: `**Vos cartes :** ${handDisplay(playerHand)} (${playerTotal})\n**Croupier :** ${handDisplay(dealerHand)} (${handValue(dealerHand)})\n\n🎉 Blackjack naturel ! Vous gagnez **${formatMoney(winnings)}** !`,
                    fields: [{ name: `${config.emojis.wallet} Solde`, value: formatMoney(balance + winnings), inline: true }],
                })] });
            }

            // Jeu interactif
            const gameEmbed = () => createEmbed({
                color: COLORS.CASINO, title: '🃏 Blackjack',
                description: `**Vos cartes :** ${handDisplay(playerHand)} (**${handValue(playerHand)}**)\n**Croupier :** \`${dealerFirstCard.display}\` \`??\`\n\n💡 Répondez \`hit\` pour tirer ou \`stand\` pour rester.`,
                fields: [{ name: '💰 Mise', value: formatMoney(bet), inline: true }],
            });

            const msg = await message.reply({ embeds: [gameEmbed()] });
            const filter = m => m.author.id === message.author.id && ['hit', 'stand', 'h', 's'].includes(m.content.toLowerCase());

            const collector = message.channel.createMessageCollector({ filter, time: 60000 });
            let gameOver = false;

            collector.on('collect', async (m) => {
                if (gameOver) return;
                const action = m.content.toLowerCase();
                try { await m.delete(); } catch {}

                if (action === 'hit' || action === 'h') {
                    playerHand.push(drawCard(deck));
                    playerTotal = handValue(playerHand);

                    if (playerTotal > 21) {
                        gameOver = true; collector.stop();
                        await atomicTransaction(sequelize, async (t) => {
                            await User.update({ global_balance: balance - bet }, { where: { id: message.author.id }, transaction: t });
                            await Transaction.create({ from_user_id: message.author.id, amount: bet, type: 'casino_loss', description: 'Blackjack — Bust', balance_after: balance - bet }, { transaction: t });
                        });
                        return msg.edit({ embeds: [createEmbed({
                            color: COLORS.ERROR, title: '🃏 Bust ! 💥',
                            description: `**Vos cartes :** ${handDisplay(playerHand)} (**${playerTotal}**)\n**Croupier :** ${handDisplay(dealerHand)} (${handValue(dealerHand)})\n\n💥 Vous dépassez 21 ! Vous perdez **${formatMoney(bet)}**.`,
                            fields: [{ name: `${config.emojis.wallet} Solde`, value: formatMoney(balance - bet), inline: true }],
                        })] });
                    } else {
                        await msg.edit({ embeds: [gameEmbed()] });
                    }
                } else {
                    gameOver = true; collector.stop();
                    // Dealer tire
                    let dealerTotal = handValue(dealerHand);
                    while (dealerTotal < 17) { dealerHand.push(drawCard(deck)); dealerTotal = handValue(dealerHand); }

                    let result, color, winAmount;
                    if (dealerTotal > 21 || playerTotal > dealerTotal) {
                        result = `🎉 Vous gagnez **${formatMoney(bet)}** !`; color = COLORS.SUCCESS; winAmount = bet;
                    } else if (playerTotal === dealerTotal) {
                        result = `🤝 Égalité ! Mise remboursée.`; color = COLORS.WARNING; winAmount = 0;
                    } else {
                        result = `😔 Le croupier gagne. Vous perdez **${formatMoney(bet)}**.`; color = COLORS.ERROR; winAmount = -bet;
                    }

                    await atomicTransaction(sequelize, async (t) => {
                        await User.update({ global_balance: balance + winAmount }, { where: { id: message.author.id }, transaction: t });
                        if (winAmount > 0) await Transaction.create({ from_user_id: message.author.id, amount: winAmount, type: 'casino_win', description: 'Blackjack — Victoire', balance_after: balance + winAmount }, { transaction: t });
                        else if (winAmount < 0) await Transaction.create({ from_user_id: message.author.id, amount: Math.abs(winAmount), type: 'casino_loss', description: 'Blackjack — Défaite', balance_after: balance + winAmount }, { transaction: t });
                    });

                    msg.edit({ embeds: [createEmbed({
                        color, title: '🃏 Blackjack — Résultat',
                        description: `**Vos cartes :** ${handDisplay(playerHand)} (**${playerTotal}**)\n**Croupier :** ${handDisplay(dealerHand)} (**${dealerTotal}**)\n\n${result}`,
                        fields: [{ name: `${config.emojis.wallet} Solde`, value: formatMoney(balance + winAmount), inline: true }],
                    })] });
                }
            });

            collector.on('end', async (_, reason) => {
                if (!gameOver && reason === 'time') {
                    gameOver = true;
                    await atomicTransaction(sequelize, async (t) => {
                        await User.update({ global_balance: balance - bet }, { where: { id: message.author.id }, transaction: t });
                        await Transaction.create({ from_user_id: message.author.id, amount: bet, type: 'casino_loss', description: 'Blackjack — Temps écoulé', balance_after: balance - bet }, { transaction: t });
                    });
                    msg.edit({ embeds: [createEmbed({ color: COLORS.ERROR, title: '🃏 Temps écoulé', description: `Vous n'avez pas répondu. Mise de ${formatMoney(bet)} perdue.` })] });
                }
            });
        });
    },
};
