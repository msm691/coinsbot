// ─── CoinsBot — Commande: duel ────────────────────────────────────────────────
const { User, UserCard, Card, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

const DUEL_COOLDOWN = 300000; // 5 min
const cooldowns = new Map();

async function getBestCard(userId) {
    const uc = await UserCard.findAll({ where: { user_id: userId }, include: [{ model: Card, as: 'card' }] });
    if (!uc.length) return null;
    return uc.reduce((best, curr) => {
        const s = (c) => (c.card?.attack || 0) + (c.card?.defense || 0) + (c.card?.speed || 0);
        return s(curr) > s(best) ? curr : best;
    }).card;
}

module.exports = {
    name: 'duel',
    aliases: ['combat', 'fight', 'pvp', 'defier'],
    category: 'rpg',
    description: 'Défier un joueur en duel de cartes.',
    usage: '&duel @joueur [mise]',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const opponent = message.mentions.users.first();
        if (!opponent)           return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `\`${config.defaultPrefix}duel @joueur [mise]\`` })] });
        if (opponent.bot)        return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Les bots ne participent pas aux duels.' })] });
        if (opponent.id === message.author.id) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Vous ne pouvez pas vous défier vous-même.' })] });

        const now = Date.now();
        const lastDuel = cooldowns.get(message.author.id) || 0;
        if (now - lastDuel < DUEL_COOLDOWN) {
            const remain = Math.ceil((DUEL_COOLDOWN - (now - lastDuel)) / 1000);
            return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, description: `⏰ Prochain duel dans **${remain}s**.` })] });
        }

        const [challenger] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
        const [defender]   = await User.findOrCreate({ where: { id: opponent.id }, defaults: {} });

        // Mise optionnelle (args après la mention)
        const betStr = args.slice(1).join(' ');
        const maxBet = Math.min(Number(challenger.global_balance), Number(defender.global_balance));
        const bet = betStr ? (parseAmount(betStr, maxBet) || 0) : 0;

        if (bet > 0) {
            if (Number(challenger.global_balance) < bet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Vous n\'avez pas **${formatMoney(bet)}** sur vous.` })] });
            if (Number(defender.global_balance) < bet)   return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `${opponent.username} n\'a pas **${formatMoney(bet)}** sur lui.` })] });
        }

        const cSkills = challenger.skills || {};
        const dSkills = defender.skills   || {};
        const cCard   = await getBestCard(message.author.id);
        const dCard   = await getBestCard(opponent.id);

        // Stats de combat
        const cMaxHP = 100 + (cSkills.endurance || 0) * 10;
        const dMaxHP = 100 + (dSkills.endurance || 0) * 10;
        const cATK   = (cCard?.attack  || 10) + (cSkills.force   || 0) * 5;
        const dATK   = (dCard?.attack  || 10) + (dSkills.force   || 0) * 5;
        const cDEF   = (cCard?.defense || 10) + (cSkills.defense || 0) * 3;
        const dDEF   = (dCard?.defense || 10) + (dSkills.defense || 0) * 3;
        const cSPD   = cCard?.speed || 10;
        const dSPD   = dCard?.speed || 10;
        const cFirst = cSPD >= dSPD;

        const cDmg = Math.max(1, Math.floor(cATK - dDEF * 0.5));
        const dDmg = Math.max(1, Math.floor(dATK - cDEF * 0.5));

        // Simulation (max 20 tours)
        let cHP = cMaxHP, dHP = dMaxHP;
        const logs = [];
        for (let turn = 1; turn <= 20 && cHP > 0 && dHP > 0; turn++) {
            if (cFirst) {
                dHP = Math.max(0, dHP - cDmg);
                if (dHP > 0) cHP = Math.max(0, cHP - dDmg);
            } else {
                cHP = Math.max(0, cHP - dDmg);
                if (cHP > 0) dHP = Math.max(0, dHP - cDmg);
            }
            if (logs.length < 3) {
                logs.push(`Tour ${turn}: **${message.author.username}** ${cHP}HP — **${opponent.username}** ${dHP}HP`);
            }
        }

        const challengerWon = cHP > dHP;
        cooldowns.set(message.author.id, now);

        // Transfert de mise
        if (bet > 0) {
            const [firstId, secondId] = [message.author.id, opponent.id].sort();
            await lockUser(firstId, async () => {
                await lockUser(secondId, async () => {
                    await atomicTransaction(sequelize, async (t) => {
                        const winnerId = challengerWon ? message.author.id : opponent.id;
                        const loserId  = challengerWon ? opponent.id : message.author.id;
                        const winnerBalance = challengerWon ? Number(challenger.global_balance) : Number(defender.global_balance);
                        const loserBalance  = challengerWon ? Number(defender.global_balance)  : Number(challenger.global_balance);

                        await User.update({ global_balance: winnerBalance + bet }, { where: { id: winnerId }, transaction: t });
                        await User.update({ global_balance: loserBalance  - bet }, { where: { id: loserId  }, transaction: t });

                        await Transaction.create({
                            from_user_id: loserId,
                            to_user_id: winnerId,
                            amount: bet,
                            type: 'transfer',
                            description: `Duel vs ${challengerWon ? opponent.username : message.author.username}`,
                            balance_after: loserBalance - bet,
                        }, { transaction: t });
                    });
                });
            });
        }

        const winnerName = challengerWon ? message.author.username : opponent.username;

        message.reply({ embeds: [createEmbed({
            color: challengerWon ? COLORS.SUCCESS : COLORS.ERROR,
            title: `⚔️ Duel — ${winnerName} remporte le combat !`,
            description: [
                `**${message.author.username}** (${cCard?.name || 'Sans carte'}) vs **${opponent.username}** (${dCard?.name || 'Sans carte'})`,
                bet > 0 ? `🏆 **${winnerName}** remporte **${formatMoney(bet)}** !` : '',
                '',
                ...logs,
            ].filter(Boolean).join('\n'),
            fields: [
                { name: `❤️ ${message.author.username}`, value: `${cHP}/${cMaxHP} HP\n⚔️${cATK} 🛡️${cDEF} 💨${cSPD}`, inline: true },
                { name: `❤️ ${opponent.username}`,       value: `${dHP}/${dMaxHP} HP\n⚔️${dATK} 🛡️${dDEF} 💨${dSPD}`, inline: true },
            ],
        })] });
    },
};
