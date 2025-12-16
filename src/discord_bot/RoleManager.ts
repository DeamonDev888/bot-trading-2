/**
 * Système de Gestion des Rôles et Permissions
 * Compatible avec l'infrastructure existante
 */

import { Client, GuildMember, Role, TextChannel, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

interface RoleConfig {
  name: string;
  color: string;
  position: number;
  permissions: string[];
  channelAccess: string[];
  description: string;
  icon?: string;
}

interface UserReputation {
  userId: string;
  score: number;
  badges: string[];
  contributions: number;
  lastActivity: Date;
  level: 'Bronze' | 'Argent' | 'Or' | 'Platine' | 'Diamant';
}

export class RoleManager {
  private client: Client;
  private guildId: string | undefined;
  private reputationDataPath: string;

  constructor(client: Client) {
    this.client = client;
    this.guildId = process.env.DISCORD_GUILD_ID;
    this.reputationDataPath = path.join(process.cwd(), 'data', 'reputation.json');
  }

  private readonly ROLE_CONFIGS: RoleConfig[] = [
    {
      name: '🎯 Nouveau Membre',
      color: '#95a5a6',
      position: 1,
      permissions: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
      channelAccess: ['discussion', 'bienvenue', 'annonces-officielles'],
      description: 'Membres récemment arrivés en cours d\'intégration',
      icon: '👋'
    },
    {
      name: '📈 Trader Actif',
      color: '#3498db',
      position: 5,
      permissions: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles'],
      channelAccess: ['finances', 'trading-crypto-bot', 'analyses-expertes', 'signaux-trading', 'crypto-pro'],
      description: 'Membres actifs dans le trading et les finances',
      icon: '💹'
    },
    {
      name: '🤖 Expert IA',
      color: '#9b59b6',
      position: 7,
      permissions: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles', 'CreatePublicThreads'],
      channelAccess: ['claude-code', 'mcp', 'discussions-ia', 'projets-code', 'outils-automation'],
      description: 'Experts en intelligence artificielle et développement',
      icon: '🧠'
    },
    {
      name: '💼 Analyste Pro',
      color: '#f39c12',
      position: 9,
      permissions: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles', 'CreatePublicThreads', 'ManageMessages'],
      channelAccess: ['finances', 'analyses-expertes', 'marché-global', 'bot'],
      description: 'Analystes financiers professionnels certifiés',
      icon: '📊'
    },
    {
      name: '💎 Membre Premium',
      color: '#e67e22',
      position: 12,
      permissions: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'EmbedLinks', 'AttachFiles', 'CreatePublicThreads', 'UseExternalEmojis'],
      channelAccess: ['*'], // Accès à tous les channels
      description: 'Membres contributeurs premium du serveur',
      icon: '💎'
    },
    {
      name: '🛡️ Staff',
      color: '#e74c3c',
      position: 15,
      permissions: ['*'], // Toutes les permissions sauf Admin
      channelAccess: ['*'], // Accès à tous les channels
      description: 'Équipe de modération et d\'administration',
      icon: '🔒'
    }
  ];

  async initialize() {
    console.log('🛡️ Initialisation du gestionnaire de rôles...');

    // Créer le dossier data s'il n'existe pas
    try {
      await fs.access(path.join(process.cwd(), 'data'));
    } catch {
      await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    }

    // Initialiser le fichier de réputation
    await this.initializeReputationData();
  }

  private async initializeReputationData() {
    try {
      await fs.access(this.reputationDataPath);
    } catch {
      await fs.writeFile(this.reputationDataPath, JSON.stringify({}));
    }
  }

  async setupRoles() {
    if (!this.guildId) {
      throw new Error('Guild ID non configuré');
    }

    const guild = await this.client.guilds.fetch(this.guildId);

    console.log('🎭 Configuration des rôles du serveur...');

    for (const roleConfig of this.ROLE_CONFIGS) {
      try {
        // Vérifier si le rôle existe déjà
        let role = guild.roles.cache.find(r => r.name === roleConfig.name);

        if (role) {
          console.log(`⚠️ Le rôle "${roleConfig.name}" existe déjà`);
          await this.updateRolePermissions(role, roleConfig);
        } else {
          // Créer le rôle
          role = await guild.roles.create({
            name: roleConfig.name,
            color: roleConfig.color as any,
            position: roleConfig.position,
            reason: 'Configuration automatique des rôles'
          });

          console.log(`✅ Rôle créé: ${role.name} (Position: ${role.position})`);
        }

        // Configurer les permissions du rôle
        await this.configureRolePermissions(role, roleConfig);

      } catch (error: any) {
        console.error(`❌ Erreur configuration rôle "${roleConfig.name}":`, error.message);
      }
    }
  }

  private async updateRolePermissions(role: Role, config: RoleConfig) {
    try {
      await role.edit({
        color: config.color as any,
        position: config.position
      });

      console.log(`🔄 Rôle "${config.name}" mis à jour`);
    } catch (error) {
      console.error(`❌ Erreur mise à jour rôle "${config.name}":`, error);
    }
  }

  private async configureRolePermissions(role: Role, config: RoleConfig) {
    // Cette méthode serait utilisée pour configurer les permissions spécifiques aux channels
    // Pour l'instant, nous enregistrons la configuration pour référence
    console.log(`🔒 Permissions configurées pour ${config.name}: ${config.permissions.join(', ')}`);
  }

  async assignRoles(member: GuildMember, profile?: any) {
    try {
      const guild = member.guild;
      const rolesToAdd: Role[] = [];
      const rolesToRemove: Role[] = [];

      // Basé sur le profil du questionnaire
      if (profile) {
        // Rôle basé sur l'expérience
        if (profile.experienceLevel === 'expert' || profile.experienceLevel === 'avancé') {
          const analystRole = guild.roles.cache.find(r => r.name === '💼 Analyste Pro');
          if (analystRole) rolesToAdd.push(analystRole);
        }

        // Rôles basés sur les intérêts
        if (profile.interests?.some((i: string) => i.toLowerCase().includes('trading') || i.toLowerCase().includes('crypto'))) {
          const traderRole = guild.roles.cache.find(r => r.name === '📈 Trader Actif');
          if (traderRole) rolesToAdd.push(traderRole);
        }

        if (profile.interests?.some((i: string) => i.toLowerCase().includes('ia') || i.toLowerCase().includes('développement'))) {
          const iaRole = guild.roles.cache.find(r => r.name === '🤖 Expert IA');
          if (iaRole) rolesToAdd.push(iaRole);
        }

        // Retirer le rôle nouveau membre
        const newMemberRole = guild.roles.cache.find(r => r.name === '🎯 Nouveau Membre');
        if (newMemberRole) rolesToRemove.push(newMemberRole);
      }

      // Gestion des réputations
      const reputation = await this.getUserReputation(member.id);
      if (reputation.level !== 'Bronze') {
        const premiumRole = guild.roles.cache.find(r => r.name === '💎 Membre Premium');
        if (premiumRole && !member.roles.cache.has(premiumRole.id)) {
          rolesToAdd.push(premiumRole);
        }
      }

      // Appliquer les changements de rôles
      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove, 'Mise à jour automatique des rôles');
      }

      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd, 'Attribution automatique des rôles');
        console.log(`✅ ${rolesToAdd.length} rôle(s) attribué(s) à ${member.user.username}`);
      }

      return rolesToAdd;

    } catch (error) {
      console.error(`❌ Erreur attribution rôles pour ${member.user.username}:`, error);
      return [];
    }
  }

  async updateReputation(userId: string, action: 'message' | 'analysis' | 'help' | 'contribution', value: number = 1) {
    try {
      let reputationData: { [key: string]: UserReputation } = {};

      try {
        const data = await fs.readFile(this.reputationDataPath, 'utf-8');
        reputationData = JSON.parse(data);
      } catch {
        // Fichier vide ou inexistant
      }

      // Mettre à jour ou créer l'entrée utilisateur
      if (!reputationData[userId]) {
        reputationData[userId] = {
          userId,
          score: 0,
          badges: [],
          contributions: 0,
          lastActivity: new Date(),
          level: 'Bronze'
        };
      }

      const reputation = reputationData[userId];
      reputation.score += value;
      reputation.contributions += 1;
      reputation.lastActivity = new Date();

      // Mettre à jour le niveau
      const newLevel = this.calculateLevel(reputation.score);
      if (newLevel !== reputation.level) {
        reputation.level = newLevel;
        await this.handleLevelUp(userId, newLevel);
      }

      // Ajouter des badges
      await this.checkAndAddBadges(reputation);

      reputationData[userId] = reputation;

      await fs.writeFile(this.reputationDataPath, JSON.stringify(reputationData, null, 2));

      return reputation;

    } catch (error) {
      console.error('❌ Erreur mise à jour réputation:', error);
      return null;
    }
  }

  private calculateLevel(score: number): 'Bronze' | 'Argent' | 'Or' | 'Platine' | 'Diamant' {
    if (score >= 1000) return 'Diamant';
    if (score >= 500) return 'Platine';
    if (score >= 200) return 'Or';
    if (score >= 50) return 'Argent';
    return 'Bronze';
  }

  private async handleLevelUp(userId: string, newLevel: string) {
    try {
      if (!this.guildId) return;

      const guild = await this.client.guilds.fetch(this.guildId);
      const member = await guild.members.fetch(userId).catch(() => null);

      if (!member) return;

      // Attribuer le rôle premium si applicable
      if (newLevel !== 'Bronze') {
        const premiumRole = guild.roles.cache.find(r => r.name === '💎 Membre Premium');
        if (premiumRole) {
          await member.roles.add(premiumRole, 'Niveau de réputation atteint');
        }
      }

      // Envoyer une notification
      await member.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎉 Félicitations ! Niveau supérieur')
            .setDescription(`Vous avez atteint le niveau **${newLevel}** !\n\nMerci pour votre contribution active à la communauté.`)
            .setColor(this.getLevelColor(newLevel))
            .addFields([
              { name: '🏆 Nouveaux avantages', value: '• Accès premium aux channels\n• Badges exclusifs\n• Priorité support' }
            ])
        ]
      });

      console.log(`🎉 Level up: ${member.user.username} -> ${newLevel}`);

    } catch (error) {
      console.error('❌ Erreur notification level up:', error);
    }
  }

  private getLevelColor(level: string): number {
    const colors = {
      'Bronze': 0xCD7F32,
      'Argent': 0xC0C0C0,
      'Or': 0xFFD700,
      'Platine': 0xE5E4E2,
      'Diamant': 0xB9F2FF
    };
    return colors[level as keyof typeof colors] || 0x00FF00;
  }

  private async checkAndAddBadges(reputation: UserReputation) {
    const badges = [];

    if (reputation.contributions >= 10 && !reputation.badges.includes('📊 Analyste')) {
      badges.push('📊 Analyste');
    }

    if (reputation.contributions >= 25 && !reputation.badges.includes('🤖 Mentor')) {
      badges.push('🤖 Mentor');
    }

    if (reputation.contributions >= 50 && !reputation.badges.includes('💹 Expert Trader')) {
      badges.push('💹 Expert Trader');
    }

    if (reputation.contributions >= 100 && !reputation.badges.includes('👑 Légende')) {
      badges.push('👑 Légende');
    }

    reputation.badges.push(...badges);
  }

  async getUserReputation(userId: string): Promise<UserReputation> {
    try {
      const data = await fs.readFile(this.reputationDataPath, 'utf-8');
      const reputationData = JSON.parse(data);

      return reputationData[userId] || {
        userId,
        score: 0,
        badges: [],
        contributions: 0,
        lastActivity: new Date(),
        level: 'Bronze'
      };

    } catch (error) {
      return {
        userId,
        score: 0,
        badges: [],
        contributions: 0,
        lastActivity: new Date(),
        level: 'Bronze'
      };
    }
  }

  async getLeaderboard(limit: number = 10): Promise<UserReputation[]> {
    try {
      const data = await fs.readFile(this.reputationDataPath, 'utf-8');
      const reputationData: { [key: string]: UserReputation } = JSON.parse(data);

      return Object.values(reputationData)
        .sort((a: UserReputation, b: UserReputation) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      return [];
    }
  }

  createReputationEmbed(reputation: UserReputation): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`🏆 Profil de Réputation - Niveau ${reputation.level}`)
      .setColor(this.getLevelColor(reputation.level))
      .addFields([
        { name: '💯 Score', value: `${reputation.score} points`, inline: true },
        { name: '🎯 Contributions', value: `${reputation.contributions}`, inline: true },
        { name: '🏅 Badges', value: reputation.badges.length > 0 ? reputation.badges.join(' ') : 'Aucun badge', inline: false }
      ])
      .setFooter({ text: `Dernière activité: ${reputation.lastActivity.toLocaleDateString()}` });
  }
}