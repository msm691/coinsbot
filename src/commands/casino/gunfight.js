// ─── CoinsBot — Commande: gunfight ───────────────────────────────────────────
const { User, Transaction, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const { secureRandom } = require('../../utils/rng');
const config = require('../../config');

module.exports = {
    name: 'gunfight',
    aliases: ['duel', 'gf', 'tir'],
    category: 'casino',
    description: 'Défier quelqu\'un en duel au pistolet !',
    usage: '&gunfight <@utilisateur> <mise>',
    cooldown: 10000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target || target.bot || target.id === message.author.id) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Cible invalide`, description: `\`${config.defaultPrefix}gunfight <@joueur> <mise>\`` })] });
        }

        const bet = parseInt(args[1]);
        if (!bet || bet < 100) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Mise invalide`, description: 'Minimum : 100' })] });

        const [challenger] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
        const [opponent] = await User.findOrCreate({ where: { id: target.id }, defaults: {} });

        if (Number(challenger.global_balance) < bet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Vous n'avez pas assez` })] });
        if (Number(opponent.global_balance) < bet) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Adversaire trop pauvre` })] });

        const msg = await message.reply({ embeds: [createEmbed({
            color: COLORS.CASINO, title: '🔫 Duel au pistolet !',
            description: `**${target.displayName || target.username}**, acceptez-vous le duel pour **${formatMoney(bet)}** ?\n\nTapez \`oui\` pour accepter, \`non\` pour refuser.`,
        })] });

        const filter = m => m.author.id === target.id && ['oui', 'non', 'yes', 'no'].includes(m.content.toLowerCase());
        const collector = message.channel.createMessageCollector({ filter, max: 1, time: 30000 });

        collector.on('collect', async (m) => {
            if (['non', 'no'].includes(m.content.toLowerCase())) {
                return msg.edit({ embeds: [createEmbed({ color: COLORS.WARNING, title: '🔫 Duel refusé', description: `${target.displayName || target.username} a refusé le duel.` })] });
            }

            // DUEL !
            const delay = secureRandom(2000, 6000);
            await msg.edit({ embeds: [createEmbed({ color: COLORS.CASINO, title: '🔫 Préparez-vous...', description: '🤠 Les duellistes se font face...\n\n⏳ Attendez le signal...' })] });

            await new Promise(resolve => setTimeout(resolve, delay));
            const winnerId = secureRandom(0, 2) === 0 ? message.author.id : target.id;
            const loserId = winnerId === message.author.id ? target.id : message.author.id;
            const winner = winnerId === message.author.id ? message.author : target;
            const loser = winnerId === message.author.id ? target : message.author;

            await lockUser(winnerId, async () => {
                await lockUser(loserId, async () => {
                    await atomicTransaction(sequelize, async (t) => {
                        const [w] = await User.findOrCreate({ where: { id: winnerId }, defaults: {}, transaction: t });
                        const [l] = await User.findOrCreate({ where: { id: loserId }, defaults: {}, transaction: t });
                        await User.update({ global_balance: Number(w.global_balance) + bet }, { where: { id: winnerId }, transaction: t });
                        await User.update({ global_balance: Number(l.global_balance) - bet }, { where: { id: loserId }, transaction: t });
                        await Transaction.create({ from_user_id: loserId, to_user_id: winnerId, amount: bet, type: 'casino_win', description: `Gunfight — Victoire`, balance_after: Number(w.global_balance) + bet }, { transaction: t });
                    });
                });
            });

            msg.edit({ embeds: [createEmbed({
                color: COLORS.SUCCESS, title: '🔫 BANG ! 💥',
                description: `**${winner.displayName || winner.username}** a tiré en premier et remporte **${formatMoney(bet)}** !\n\n💀 ${loser.displayName || loser.username} est à terre.`,
            })] });
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) msg.edit({ embeds: [createEmbed({ color: COLORS.WARNING, title: '🔫 Duel expiré', description: 'Pas de réponse.' })] });
        });
    },
};
