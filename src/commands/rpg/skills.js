// ─── CoinsBot — Commande: skills ──────────────────────────────────────────────
const { User, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

const SKILLS = {
    force:        { name: 'Force',        emoji: '💪', desc: '+5 ATK en duel / +rev crime',   maxLevel: 10 },
    defense:      { name: 'Défense',      emoji: '🛡️', desc: '+3 DEF en duel / -pertes',     maxLevel: 10 },
    chance:       { name: 'Chance',       emoji: '🍀', desc: '+2% chance casino & crimes',    maxLevel: 10 },
    intelligence: { name: 'Intelligence', emoji: '🧠', desc: '+10% XP gagné',                maxLevel: 10 },
    endurance:    { name: 'Endurance',    emoji: '❤️', desc: '+10 HP duel / -temps prison',  maxLevel: 10 },
    charisme:     { name: 'Charisme',     emoji: '✨', desc: '-2% prix shop / +salaire',     maxLevel: 10 },
};

function upgradeCost(currentLevel) { return (currentLevel + 1) * 500; }

module.exports = {
    name: 'skills',
    aliases: ['competences', 'skill', 'aptitudes', 'comp'],
    category: 'rpg',
    description: 'Afficher et améliorer vos compétences RPG.',
    usage: '&skills [upgrade <compétence>]',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
        const skills = user.skills || {};

        if (args[0]?.toLowerCase() === 'upgrade') {
            const skillKey = args[1]?.toLowerCase();
            if (!SKILLS[skillKey]) {
                return message.reply({ embeds: [createEmbed({
                    color: COLORS.ERROR,
                    description: `Compétence invalide. Choisissez parmi: \`${Object.keys(SKILLS).join('`, `')}\``,
                })] });
            }

            const skill = SKILLS[skillKey];
            const currentLevel = skills[skillKey] || 0;

            if (currentLevel >= skill.maxLevel) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.WARNING, description: `${skill.emoji} **${skill.name}** est déjà au niveau maximum (**${skill.maxLevel}**) !` })] });
            }

            const cost = upgradeCost(currentLevel);
            if (Number(user.global_balance) < cost) {
                return message.reply({ embeds: [createEmbed({ color: COLORS.ERROR, title: `${config.emojis.error} Fonds insuffisants`, description: `Coût: **${formatMoney(cost)}** | Disponible: **${formatMoney(Number(user.global_balance))}**` })] });
            }

            await lockUser(message.author.id, async () => {
                await atomicTransaction(sequelize, async (t) => {
                    const newSkills = { ...skills, [skillKey]: currentLevel + 1 };
                    await User.update(
                        { global_balance: Number(user.global_balance) - cost, skills: newSkills },
                        { where: { id: message.author.id }, transaction: t },
                    );
                });

                message.reply({ embeds: [createEmbed({
                    color: COLORS.SUCCESS,
                    title: `${skill.emoji} Compétence améliorée !`,
                    description: `**${skill.name}** passe au niveau **${currentLevel + 1}** !`,
                    fields: [
                        { name: '💸 Coût',          value: formatMoney(cost), inline: true },
                        { name: '📊 Nouveau niveau', value: `${currentLevel + 1} / ${skill.maxLevel}`, inline: true },
                        { name: '💡 Effet',          value: skill.desc, inline: true },
                    ],
                })] });
            });
            return;
        }

        // Affichage de toutes les compétences
        const fields = Object.entries(SKILLS).map(([key, sk]) => {
            const lvl = skills[key] || 0;
            const cost = lvl < sk.maxLevel ? upgradeCost(lvl) : null;
            const bar = '█'.repeat(lvl) + '░'.repeat(sk.maxLevel - lvl);
            return {
                name: `${sk.emoji} ${sk.name} — Nv.${lvl}/${sk.maxLevel}`,
                value: `\`${bar}\`\n${sk.desc}${cost ? `\n🔼 **${formatMoney(cost)}**` : '\n✅ *MAX*'}`,
                inline: true,
            };
        });

        message.reply({ embeds: [createEmbed({
            color: COLORS.RPG,
            title: '🎯 Compétences RPG',
            description: `💛 Solde: **${formatMoney(Number(user.global_balance))}**\n\`${config.defaultPrefix}skills upgrade <compétence>\` pour améliorer.`,
            fields,
        })] });
    },
};
