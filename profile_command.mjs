/**
 * Commande Profil pour afficher les détails d'un utilisateur
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { RoleManager } from './RoleManager.mjs';

export const data = new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Affiche le profil détaillé d\'un utilisateur')
    .addUserOption(option =>
        option.setName('utilisateur')
            .setDescription('L\'utilisateur dont vous voulez voir le profil')
            .setRequired(false)
    );

export async function execute(interaction) {
    const roleManager = new RoleManager();
    await roleManager.initialize();

    try {
        const targetUser = interaction.options.getUser('utilisateur') || interaction.user;
        const userId = targetUser.id;
        
        console.log(`👤 Demande de profil pour ${targetUser.username}`);

        // Récupérer les données de réputation
        const reputation = await roleManager.getUserReputation(userId);
        
        if (!reputation) {
            await interaction.reply({
                content: `📊 ${targetUser.username} n'a pas encore de profil. Commencez à participer pour créer votre profil !`,
                ephemeral: true
            });
            return;
        }

        // Déterminer la progression vers le niveau suivant
        const nextLevelThresholds = {
            'Bronze': 100,
            'Argent': 250,
            'Or': 500,
            'Platine': 1000,
            'Diamant': 2000
        };

        const currentLevel = reputation.level;
        const currentScore = reputation.score || 0;
        const nextLevel = nextLevelThresholds[currentLevel];
        
        let progressPercent = 100;
        let progressNeeded = 0;
        
        if (nextLevel && currentLevel !== 'Diamant') {
            const prevLevelThreshold = currentLevel === 'Bronze' ? 0 : 
                                     currentLevel === 'Argent' ? 100 :
                                     currentLevel === 'Or' ? 250 :
                                     currentLevel === 'Platine' ? 500 : 0;
            
            const levelRange = nextLevel - prevLevelThreshold;
            const progressInLevel = currentScore - prevLevelThreshold;
            progressPercent = Math.min(100, Math.round((progressInLevel / levelRange) * 100));
            progressNeeded = nextLevel - currentScore;
        }

        // Créer l'embed du profil
        const embed = new EmbedBuilder()
            .setTitle(`👤 Profil de ${reputation.username}`)
            .setColor(getLevelColor(currentLevel))
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 128 }))
            .setTimestamp();

        // Informations principales
        const mainInfo = `📊 **Score:** ${currentScore}\n` +
                        `🏆 **Niveau:** ${currentLevel}\n` +
                        `💡 **Contributions:** ${reputation.contributions || 0}\n` +
                        `📅 **Dernière activité:** <t:${Math.floor(new Date(reputation.lastActivity || reputation.updated_at || Date.now()).getTime() / 1000)}:R>`;

        embed.addFields([
            {
                name: '📈 Informations Principales',
                value: mainInfo,
                inline: false
            }
        ]);

        // Progression
        if (currentLevel !== 'Diamant') {
            embed.addFields([
                {
                    name: '🎯 Progression',
                    value: `Prochain niveau dans: ${progressNeeded} points\n` +
                           `Progression: ${progressPercent}%`,
                    inline: true
                }
            ]);
        }

        // Badges
        if (reputation.badges && reputation.badges.length > 0) {
            embed.addFields([
                {
                    name: '🏅 Badges',
                    value: reputation.badges.join(' '),
                    inline: true
                }
            ]);
        }

        // Statistiques de performance
        const levelDistribution = {
            'Bronze': '🥉',
            'Argent': '🥈', 
            'Or': '🥇',
            'Platine': '💎',
            'Diamant': '👑'
        };

        embed.addFields([
            {
                name: '⭐ Performance',
                value: `Niveau actuel: ${levelDistribution[currentLevel]} ${currentLevel}\n` +
                       `Score total: ${currentScore} points\n` +
                       `Rang estimé: Top ${calculateEstimatedRank(currentScore)}%`,
                inline: true
            }
        ]);

        // Footer
        embed.setFooter({
            text: `Profil mis à jour le ${new Date(reputation.updated_at || reputation.lastActivity || Date.now()).toLocaleDateString('fr-FR')}`,
            iconURL: 'https://cdn.discordapp.com/attachments/placeholder/profile_icon.png'
        });

        await interaction.reply({ embeds: [embed] });
        
        console.log(`✅ Profil affiché pour ${targetUser.username}`);

    } catch (error) {
        console.error('Erreur lors de l\'affichage du profil:', error);
        
        await interaction.reply({
            content: '❌ Une erreur est survenue lors de l\'affichage du profil.',
            ephemeral: true
        });
    } finally {
        await roleManager.cleanup();
    }
}

// Fonctions utilitaires
function getLevelColor(level) {
    const colors = {
        'Bronze': 0xCD7F32,
        'Argent': 0xC0C0C0,
        'Or': 0xFFD700,
        'Platine': 0xE5E4E2,
        'Diamant': 0xB9F2FF
    };
    return colors[level] || 0x00AE86;
}

function calculateEstimatedRank(score) {
    if (score >= 1000) return 1;
    if (score >= 500) return 5;
    if (score >= 250) return 15;
    if (score >= 100) return 30;
    return 50;
}