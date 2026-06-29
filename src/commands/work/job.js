// ─── CoinsBot — Commande: job ────────────────────────────────────────────────
const { User, sequelize } = require('../../database/models');
const { createEmbed, COLORS } = require('../../utils/embed');
const { formatMoney } = require('../../utils/formatters');
const { atomicTransaction, lockUser } = require('../../utils/transactions');
const config = require('../../config');

const JOBS = [
    { name: 'Livreur',        salary: 50,   cost: 0,       level: 1,  emoji: '🛵' },
    { name: 'Serveur',        salary: 80,   cost: 2000,    level: 2,  emoji: '🍽️' },
    { name: 'Mécanicien',     salary: 120,  cost: 5000,    level: 3,  emoji: '🔧' },
    { name: 'Électricien',    salary: 160,  cost: 10000,   level: 5,  emoji: '⚡' },
    { name: 'Développeur',    salary: 250,  cost: 25000,   level: 8,  emoji: '💻' },
    { name: 'Médecin',        salary: 350,  cost: 50000,   level: 12, emoji: '🩺' },
    { name: 'Avocat',         salary: 450,  cost: 80000,   level: 15, emoji: '⚖️' },
    { name: 'Architecte',     salary: 550,  cost: 120000,  level: 20, emoji: '📐' },
    { name: 'Chirurgien',     salary: 700,  cost: 200000,  level: 25, emoji: '🏥' },
    { name: 'PDG',            salary: 1000, cost: 500000,  level: 30, emoji: '👔' },
];

module.exports = {
    name: 'job',
    aliases: ['metier', 'métier', 'emploi', 'jobs'],
    category: 'work',
    description: 'Voir les métiers disponibles ou acheter un métier.',
    usage: '&job [nom_du_métier]',
    cooldown: 3000,
    permissions: 'everyone',

    async execute(message, args, client) {
        const [user] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });

        // Liste des métiers
        if (!args[0]) {
            const jobList = JOBS.map(j => {
                const owned = user.job === j.name;
                const locked = user.level < j.level;
                let status = locked ? '🔒' : (owned ? '✅' : '💰');
                return `${j.emoji} **${j.name}** — +${formatMoney(j.salary)}/work\n${status} ${locked ? `Niv. ${j.level} requis` : (owned ? 'Métier actuel' : `Coût: ${formatMoney(j.cost)}`)}`;
            }).join('\n\n');

            return message.reply({ embeds: [createEmbed({
                color: COLORS.INFO,
                title: '💼 Métiers disponibles',
                description: `${jobList}\n\n> Utilisez \`${config.defaultPrefix}job <nom>\` pour acheter.`,
                thumbnail: message.author.displayAvatarURL({ dynamic: true, size: 256 }),
                fields: [
                    { name: '📊 Votre niveau', value: `${user.level}`, inline: true },
                    { name: '💼 Métier actuel', value: user.job || 'Aucun', inline: true },
                ],
            })] });
        }

        // Acheter un métier
        const jobName = args.join(' ').toLowerCase();
        const job = JOBS.find(j => j.name.toLowerCase() === jobName);

        if (!job) {
            return message.reply({ embeds: [createEmbed({
                color: COLORS.ERROR,
                title: `${config.emojis.error} Métier introuvable`,
                description: `Utilisez \`${config.defaultPrefix}job\` pour voir la liste.`,
            })] });
        }

        if (user.level < job.level) {
            return message.reply({ embeds: [createEmbed({
                color: COLORS.ERROR,
                title: '🔒 Niveau insuffisant',
                description: `Vous devez être niveau **${job.level}** pour ce métier (vous êtes niv. ${user.level}).`,
            })] });
        }

        if (user.job === job.name) {
            return message.reply({ embeds: [createEmbed({
                color: COLORS.WARNING,
                title: `${config.emojis.warning} Déjà embauché`,
                description: `Vous exercez déjà le métier de **${job.name}**.`,
            })] });
        }

        await lockUser(message.author.id, async () => {
            const [freshUser] = await User.findOrCreate({ where: { id: message.author.id }, defaults: {} });
            const balance = Number(freshUser.global_balance);

            if (balance < job.cost) {
                return message.reply({ embeds: [createEmbed({
                    color: COLORS.ERROR,
                    title: `${config.emojis.error} Fonds insuffisants`,
                    description: `Il vous faut ${formatMoney(job.cost)} (vous avez ${formatMoney(balance)}).`,
                })] });
            }

            await atomicTransaction(sequelize, async (t) => {
                await User.update({
                    global_balance: balance - job.cost,
                    job: job.name,
                    job_salary: job.salary,
                }, { where: { id: message.author.id }, transaction: t });
            });

            message.reply({ embeds: [createEmbed({
                color: COLORS.SUCCESS,
                title: `${job.emoji} Nouveau métier !`,
                description: `Vous êtes maintenant **${job.name}** !`,
                fields: [
                    { name: '💰 Coût', value: formatMoney(job.cost), inline: true },
                    { name: '📈 Salaire bonus', value: `+${formatMoney(job.salary)}/work`, inline: true },
                    { name: `${config.emojis.wallet} Solde`, value: formatMoney(balance - job.cost), inline: true },
                ],
            })] });
        });
    },
};
