// ─── CoinsBot — Commande: pay ────────────────────────────────────────────────
// Envoyer de l'argent à un autre utilisateur (avec taxe configurable).

const { User, Transaction, Guild, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney, formatNumber, parseAmount } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

module.exports = {
    name: 'pay',
    aliases: ['give', 'send', 'envoyer'],
    category: 'economy',
    description: 'Envoyer de l\'argent à un autre utilisateur.',
    usage: '&pay <@utilisateur> <montant>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        // 1. Vérifier la mention
        const target = message.mentions.users.first();
        if (!target) {
            return message.reply({
                embeds: [createEmbed({
                    color: COLORS.ERROR,
                    title: `${config.emojis.error} Utilisateur requis`,
                    description: `Utilisation : \`${config.defaultPrefix}pay <@utilisateur> <montant>\``,
                })],
            });
        }

        // 2. Empêcher l'auto-paiement
        if (target.id === message.author.id) {
            return message.reply({
                embeds: [createEmbed({
                    color: COLORS.ERROR,
                    title: `${config.emojis.error} Action impossible`,
                    description: 'Vous ne pouvez pas vous envoyer de l\'argent à vous-même.',
                })],
            });
        }

        // 3. Empêcher le paiement aux bots
        if (target.bot) {
            return message.reply({
                embeds: [createEmbed({
                    color: COLORS.ERROR,
                    title: `${config.emojis.error} Action impossible`,
                    description: 'Vous ne pouvez pas envoyer d\'argent à un bot.',
                })],
            });
        }

        // 4. Vérifier le montant
        if (!args[1]) {
            return message.reply({
                embeds: [createEmbed({
                    color: COLORS.ERROR,
                    title: `${config.emojis.error} Montant requis`,
                    description: `Utilisation : \`${config.defaultPrefix}pay <@utilisateur> <montant>\``,
                })],
            });
        }

        await lockUser(message.author.id, async () => {
            const [sender] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const senderBalance = Number(sender.global_balance);

            const parsed = parseAmount(args[1], senderBalance);
            if (parsed === null || parsed <= 0) {
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.ERROR,
                        title: `${config.emojis.error} Montant invalide`,
                        description: 'Entrez un montant valide.',
                    })],
                });
            }

            if (parsed > senderBalance) {
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.ERROR,
                        title: `${config.emojis.error} Fonds insuffisants`,
                        description: `Vous n'avez que ${formatMoney(senderBalance)} dans votre portefeuille.`,
                    })],
                });
            }

            // Calcul de la taxe
            let taxRate = config.economy.defaultTaxRate;
            try {
                const guild = await Guild.findOne({ where: { id: message.guild.id } });
                if (guild && guild.tax_rate !== null) taxRate = guild.tax_rate;
            } catch { /* fallback to default */ }

            const taxAmount = Math.floor(parsed * taxRate);
            const netAmount = parsed - taxAmount;

            await atomicTransaction(sequelize, async (t) => {
                // Débiter l'expéditeur
                await User.update(
                    { global_balance: senderBalance - parsed },
                    { where: { id: message.author.id }, transaction: t }
                );

                // Créditer le destinataire
                const [receiver] = await User.findOrCreate({ where: { id: target.id }, defaults: {}, transaction: t });
                await User.update(
                    { global_balance: Number(receiver.global_balance) + netAmount },
                    { where: { id: target.id }, transaction: t }
                );

                // Log transaction
                await Transaction.create({
                    from_user_id: message.author.id,
                    to_user_id: target.id,
                    guild_id: message.guild.id,
                    amount: parsed,
                    tax_amount: taxAmount,
                    type: 'transfer',
                    description: `Transfert vers ${target.username}`,
                    balance_after: senderBalance - parsed,
                }, { transaction: t });
            });

            const fields = [
                { name: '💸 Montant envoyé', value: formatMoney(parsed), inline: true },
                { name: `📨 Reçu par ${target.displayName || target.username}`, value: formatMoney(netAmount), inline: true },
            ];

            if (taxAmount > 0) {
                fields.push({ name: `🏛️ Taxe (${Math.round(taxRate * 100)}%)`, value: formatMoney(taxAmount), inline: true });
            }

            fields.push({ name: `${config.emojis.wallet} Nouveau solde`, value: formatMoney(senderBalance - parsed), inline: false });

            message.reply({
                embeds: [createEmbed({
                    color: COLORS.SUCCESS,
                    title: `${config.emojis.success} Transfert réussi`,
                    author: {
                        name: message.author.displayName || message.author.username,
                        iconURL: message.author.displayAvatarURL({ dynamic: true }),
                    },
                    thumbnail: target.displayAvatarURL({ dynamic: true, size: 256 }),
                    fields,
                })],
            });
        });
    },
};
