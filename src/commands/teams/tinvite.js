// ─── CoinsBot — Commande: tinvite ─────────────────────────────────────────────
const { User, Team, TeamMember, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { atomicTransaction } = require('../../utils/transactions');
const config = require('../../config');

module.exports = {
    name: 'tinvite',
    aliases: ['team-invite', 'alliance-invite'],
    category: 'teams',
    description: 'Inviter un joueur dans votre alliance.',
    usage: '&tinvite <@utilisateur>',
    cooldown: 5000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const target = message.mentions.users.first();
        if (!target || target.bot || target.id === message.author.id) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Utilisation`, description: `\`${config.defaultPrefix}tinvite <@utilisateur>\`` })] });
        }

        const inviterMember = await TeamMember.findOne({ where: { user_id: message.author.id } });
        if (!inviterMember) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Vous n\'êtes dans aucune alliance.' })] });

        if (!['leader', 'co-leader', 'officer'].includes(inviterMember.rank)) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: 'Seuls **leader**, **co-leader** et **officer** peuvent inviter.' })] });
        }

        const team = await Team.findOne({ where: { id: inviterMember.team_id } });

        const targetMember = await TeamMember.findOne({ where: { user_id: target.id } });
        if (targetMember) return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `**${target.username}** est déjà dans une alliance.` })] });

        const memberCount = await TeamMember.count({ where: { team_id: team.id } });
        if (memberCount >= team.max_members) {
            return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, description: `Alliance pleine (${memberCount}/${team.max_members}).` })] });
        }

        const inviteEmbed = createEmbed({
            color: COLORS.TEAM, title: '⚔️ Invitation d\'alliance',
            description: `${target}, **${message.author.username}** vous invite dans **[${team.tag}] ${team.name}** !\nRépondez **\`oui\`** ou **\`non\`** dans les 30 secondes.`,
            fields: [
                { name: '📊 Niveau', value: `${team.level}`, inline: true },
                { name: '👥 Membres', value: `${memberCount}/${team.max_members}`, inline: true },
                { name: '💰 Trésorerie', value: `${team.treasury > 0 ? 'Actif' : 'Vide'}`, inline: true },
            ],
        });
        const confirmMsg = await message.channel.send({ embeds: [inviteEmbed] });

        const filter = (m) => m.author.id === target.id && ['oui', 'non', 'yes', 'no'].includes(m.content.toLowerCase());

        let collected;
        try {
            collected = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] });
        } catch {
            return confirmMsg.edit({ embeds: [createEmbed({ color: COLORS.WARNING, title: '⏰ Invitation expirée', description: `**${target.username}** n\'a pas répondu à temps.` })] });
        }

        const reply = collected.first().content.toLowerCase();
        if (reply === 'non' || reply === 'no') {
            return confirmMsg.edit({ embeds: [createEmbed({ color: COLORS.ERROR, title: '❌ Invitation refusée', description: `**${target.username}** a décliné l\'invitation.` })] });
        }

        await atomicTransaction(sequelize, async (t) => {
            await User.findOrCreate({ where: { id: target.id }, defaults: {}, transaction: t });
            await TeamMember.create({ team_id: team.id, user_id: target.id, rank: 'recruit' }, { transaction: t });
        });

        confirmMsg.edit({ embeds: [createEmbed({
            color: COLORS.SUCCESS, title: '✅ Nouveau membre !',
            description: `**${target.username}** a rejoint **[${team.tag}] ${team.name}** en tant que recrue !`,
            fields: [{ name: '👥 Membres', value: `${memberCount + 1}/${team.max_members}`, inline: true }],
        })] });
    },
};
