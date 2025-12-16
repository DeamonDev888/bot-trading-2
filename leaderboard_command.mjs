/**
 * Commande Leaderboard améliorée avec support base de données et fallback
 */
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { RoleManager } from './RoleManager.mjs';

export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Affiche le classement des utilisateurs les plus actifs')
    .addIntegerOption(option =>
        option.setName('limite')
            .setDescription('Nombre d\'utilisateurs à afficher (défaut: 10)')
            .setRequired(false)
    );

export async function execute(interaction) {
    const roleManager = new RoleManager();
    await roleManager.initialize();

    try {
        const limit = interaction.options.getInteger('limite') || 10;
        
        console.log(`🏆 Demande de leaderboard pour ${limit} utilisateurs`);

        // Récupérer le leaderboard
        const leaderboard = await roleManager.getLeaderboard(limit);
        
        if (!leaderboard || leaderboard.length === 0) {
            await interaction.reply({
                content: '📊 Aucun utilisateur trouvé dans le leaderboard.',
                ephemeral: true
            });
            return;
        }

        // Créer l'embed du leaderboard
        const embed = new EmbedBuilder()
            .setTitle('🏆 Classement des Utilisateurs')
            .setDescription('Les utilisateurs les plus actifs de la communauté')
            .setColor(0x00AE86)
            .setTimestamp();

        // Préparer les données du leaderboard
        let description = '';
        leaderboard.forEach((user, index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
            
            const levelEmoji = {
                'Bronze': '🥉',
                'Argent': '🥈',
                'Or': '🥇',
                'Platine': '💎',
                'Diamant': '👑'
            }[user.level] || '⭐';

            const badges = user.badges && user.badges.length > 0 ? ` ${user.badges.join(' ')}` : '';
            
            description += `${medal} **${user.username}** ${levelEmoji}\n`;
            description += `   📊 Score: ${user.score} | 📈 Niveau: ${user.level}\n`;
            if (user.contributions > 0) {
                description += `   💡 Contributions: ${user.contributions}${badges}\n`;
            }
            description += '\n';
        });

        embed.setDescription(description);

        // Ajouter des statistiques globales
        const totalUsers = leaderboard.length;
        const avgScore = leaderboard.reduce((sum, user) => sum + (user.score || 0), 0) / totalUsers;
        const highestScore = Math.max(...leaderboard.map(user => user.score || 0));

        embed.addFields([
            {
                name: '📊 Statistiques',
                value: `Utilisateurs affichés: ${totalUsers}\nScore moyen: ${Math.round(avgScore)}\nScore le plus élevé: ${highestScore}`,
                inline: true
            },
            {
                name: '🎯 Niveaux',
                value: `🥉 Bronze: ${leaderboard.filter(u => u.level === 'Bronze').length}\n🥈 Argent: ${leaderboard.filter(u => u.level === 'Argent').length}\n🥇 Or: ${leaderboard.filter(u => u.level === 'Or').length}\n💎 Platine: ${leaderboard.filter(u => u.level === 'Platine').length}\n👑 Diamant: ${leaderboard.filter(u => u.level === 'Diamant').length}`,
                inline: true
            },
            {
                name: 'ℹ️ Informations',
                value: `Mis à jour: <t:${Math.floor(Date.now() / 1000)}:R>\nType: ${roleManager.db.isConnected ? 'Base de données' : 'Système de fichiers'}`,
                inline: true
            }
        ]);

        // Ajouter le footer avec la source de données
        embed.setFooter({
            text: `Leaderboard ${roleManager.db.isConnected ? 'DB' : 'FS'} • Utilisez /profil [utilisateur] pour plus de détails`,
            iconURL: 'https://cdn.discordapp.com/attachments/placeholder/leaderboard_icon.png'
        });

        await interaction.reply({ embeds: [embed] });
        
        console.log(`✅ Leaderboard affiché avec ${leaderboard.length} utilisateurs`);

    } catch (error) {
        console.error('Erreur lors de l\'affichage du leaderboard:', error);
        
        await interaction.reply({
            content: '❌ Une erreur est survenue lors de l\'affichage du leaderboard.',
            ephemeral: true
        });
    } finally {
        await roleManager.cleanup();
    }
}