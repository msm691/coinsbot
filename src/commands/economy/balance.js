// ─── CoinsBot — Commande: balance ────────────────────────────────────────────
// Affiche le solde (portefeuille, banque, valeur nette) d'un utilisateur.

const { User } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, progressBar } = require('../../utils/formatters');
const config = require('../../config');

module.exports = {
    name: 'balance',
    aliases: ['bal', 'bank', 'solde'],
    category: 'economy',
    description: 'Affiche votre solde (portefeuille et banque).',
    usage: '&balance [@utilisateur]',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        // Cibler un autre utilisateur : &bal @user
        const target = message.mentions.users.first() || message.author;
        const [user] = await User.findOrCreate({ where: { id: target.id }, defaults: {} });

        const wallet = Number(user.global_balance);
        const bank = Number(user.bank_balance);
        const bankLimit = Number(user.bank_limit);
        const netWorth = wallet + bank;
        const bankPercent = bankLimit > 0 ? Math.round((bank / bankLimit) * 100) : 0;

        const embed = createEmbed({
            color: COLORS.ECONOMY,
            title: `${config.emojis.coin} Compte de ${target.displayName || target.username}`,
            thumbnail: target.displayAvatarURL({ dynamic: true, size: 256 }),
            fields: [
                {
                    name: `${config.emojis.wallet} Portefeuille`,
                    value: formatMoney(wallet),
                    inline: true,
                },
                {
                    name: `${config.emojis.bank} Banque`,
                    value: `${formatMoney(bank)} / ${formatMoney(bankLimit)}`,
                    inline: true,
                },
                {
                    name: `📊 Capacité bancaire`,
                    value: `${progressBar(bank, bankLimit, 12)} **${bankPercent}%**`,
                    inline: false,
                },
                {
                    name: `${config.emojis.gem} Valeur nette`,
                    value: `**${formatMoney(netWorth)}**`,
                    inline: false,
                },
            ],
        });

        message.reply({ embeds: [embed] });
    },
};
