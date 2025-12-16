/**
 * Système de Bienvenue Intelligent pour Discord
 * Compatible avec l'infrastructure existante
 */

import { Client, GuildMember, TextChannel, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Embed } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

interface WelcomeProfile {
  userId: string;
  username: string;
  professionalBackground: string;
  experienceLevel: 'débutant' | 'intermédiaire' | 'avancé' | 'expert';
  interests: string[];
  expectations: string;
  contributionArea: string;
  joinDate: Date;
  completedAt?: Date;
}

interface WelcomeQuestion {
  id: string;
  question: string;
  type: 'select' | 'multi-select' | 'text' | 'scale';
  options?: string[];
  placeholder?: string;
  required: boolean;
}

export class WelcomeSystem {
  private client: Client;
  private profilesPath: string;
  private welcomeChannelId: string | undefined;
  private guildId: string | undefined;

  constructor(client: Client) {
    this.client = client;
    this.profilesPath = path.join(process.cwd(), 'data', 'welcome_profiles.json');
    this.welcomeChannelId = process.env.DISCORD_CHANNEL_BIENVENUE;
    this.guildId = process.env.DISCORD_GUILD_ID;
  }

  private readonly WELCOME_QUESTIONS: WelcomeQuestion[] = [
    {
      id: 'background',
      question: '👔 Quel est votre domaine d\'expertise principal ?',
      type: 'select',
      options: [
        'Finance/Trading',
        'Développement/IA',
        'Marketing/Communication',
        'Consultant/Analyste',
        'Étudiant/Recherche',
        'Entrepreneur/Business',
        'Autre'
      ],
      required: true
    },
    {
      id: 'experience',
      question: '💪 Quel est votre niveau d\'expérience en finance/trading ?',
      type: 'scale',
      required: true
    },
    {
      id: 'interests',
      question: '🎯 Quels sujets vous intéressent le plus ?',
      type: 'multi-select',
      options: [
        'Trading crypto',
        'Marchés actions',
        'Analyse technique',
        'Intelligence artificielle',
        'Blockchain',
        'Finance quantitative',
        'Actualités économiques',
        'Développement de bots',
        'Trading automatisé'
      ],
      required: true
    },
    {
      id: 'expectations',
      question: '🎁 Qu\'attendez-vous de ce serveur ?',
      type: 'text',
      placeholder: 'Partagez vos objectifs et ce que vous recherchez...',
      required: false
    },
    {
      id: 'contribution',
      question: '🤝 Comment souhaitez-vous contribuer à la communauté ?',
      type: 'multi-select',
      options: [
        'Partager des analyses',
        'Aider les débutants',
        'Développer des outils',
        'Modérer les discussions',
        'Organiser des événements',
        'Apprendre passivement',
        'Partager des expériences'
      ],
      required: true
    }
  ];

  async initialize() {
    // Créer le dossier data s'il n'existe pas
    try {
      await fs.access(path.join(process.cwd(), 'data'));
    } catch {
      await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    }

    console.log('🎯 Système de bienvenue initialisé');
  }

  async handleNewMember(member: GuildMember) {
    try {
      console.log(`👋 Nouveau membre: ${member.user.tag}`);

      // 1. Message de bienvenue immédiat
      await this.sendImmediateWelcome(member);

      // 2. Message privé avec le questionnaire
      await this.sendWelcomeDM(member);

      // 3. Rôle de base temporaire
      await this.assignBaseRole(member);

      // 4. Thread de bienvenue dans le channel discussion existant
      await this.createWelcomeThread(member);

    } catch (error) {
      console.error(`❌ Erreur bienvenue pour ${member.user.tag}:`, error);
    }
  }

  private async sendImmediateWelcome(member: GuildMember) {
    const embed = new EmbedBuilder()
      .setTitle(`🎉 Bienvenue ${member.user.username} !`)
      .setDescription('Nous sommes ravis de vous accueillir sur VIBE DEV !')
      .setColor(0x00FF00)
      .addFields([
        {
          name: '🚀 Premières étapes',
          value: '1. ✅ Vérifiez vos messages privés\n2. 📝 Remplissez le questionnaire\n3. 👋 Présentez-vous dans #discussion\n4. 📚 Explorez nos channels thématiques'
        },
        {
          name: '💡 Channels recommandés',
          value: '• 💬 #discussion pour les échanges généraux\n• 📈 #finances pour les discussions financières\n• 🤖 #claude-code pour les discussions IA\n• 💹 #trading-crypto-bot pour le trading'
        }
      ])
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: 'VIBE DEV - Communauté Finance & Tech' });

    // Envoyer dans le channel de bienvenue s'il existe, sinon dans discussion
    let welcomeChannel: TextChannel | null = null;

    if (this.welcomeChannelId) {
      try {
        welcomeChannel = await this.client.channels.fetch(this.welcomeChannelId) as TextChannel;
      } catch (e) {
        console.warn('⚠️ Channel bienvenue non trouvé, utilisation du channel discussion');
      }
    }

    if (!welcomeChannel && process.env.DISCORD_CHANNEL_DISCUSSION) {
      try {
        welcomeChannel = await this.client.channels.fetch(process.env.DISCORD_CHANNEL_DISCUSSION) as TextChannel;
      } catch (e) {
        console.warn('⚠️ Channel discussion non trouvé');
      }
    }

    if (welcomeChannel) {
      await welcomeChannel.send({
        content: `👋 Bienvenue ${member} !`,
        embeds: [embed]
      });
    }
  }

  private async sendWelcomeDM(member: GuildMember) {
    try {
      await member.user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎯 Questionnaire de Bienvenue - VIBE DEV')
            .setDescription('Pour mieux vous connaître et vous proposer les meilleures expériences, merci de répondre à quelques questions.')
            .setColor(0x3498db)
            .addFields([
              {
                name: '⏱️ Durée estimée',
                value: '2-3 minutes maximum',
                inline: true
              },
              {
                name: '🔒 Confidentialité',
                value: 'Vos réponses ne sont visibles que par l\'équipe',
                inline: true
              }
            ])
        ],
        components: [
          new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('start_welcome_quiz')
                .setLabel('📝 Commencer le questionnaire')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🚀')
            )
        ]
      });
    } catch (error) {
      console.warn(`⚠️ Impossible d\'envoyer un message privé à ${member.user.tag}:`, error);
    }
  }

  private async assignBaseRole(member: GuildMember) {
    try {
      const guild = member.guild;

      // Chercher le rôle "🎯 Nouveau Membre"
      const newMemberRole = guild.roles.cache.find(r => r.name === '🎯 Nouveau Membre');

      if (newMemberRole) {
        await member.roles.add(newMemberRole, 'Nouveau membre - base role');
        console.log(`✅ Rôle de base attribué à ${member.user.tag}`);
      }
    } catch (error) {
      console.warn(`⚠️ Impossible d\'attribuer le rôle de base à ${member.user.tag}:`, error);
    }
  }

  private async createWelcomeThread(member: GuildMember) {
    try {
      if (!process.env.DISCORD_CHANNEL_DISCUSSION) {
        console.warn('⚠️ Channel discussion non configuré');
        return;
      }

      const discussionChannel = await this.client.channels.fetch(process.env.DISCORD_CHANNEL_DISCUSSION) as TextChannel;

      if (!discussionChannel) {
        console.warn('⚠️ Channel discussion inaccessible');
        return;
      }

      const thread = await discussionChannel.threads.create({
        name: `👋 Présentation ${member.user.username}`,
        autoArchiveDuration: 1440, // 24 heures
        reason: 'Thread de bienvenue pour nouveau membre'
      });

      await thread.send({
        content: `🎉 Bienvenue ${member} dans ce thread personnel !\n\nPrésentez-vous et posez vos questions ici. La communauté sera ravie de vous aider !`,
        embeds: [
          new EmbedBuilder()
            .setTitle('💡 Conseils pour votre présentation')
            .setDescription('Partagez :')
            .addFields([
              { name: '👤 Votre parcours', value: 'Votre domaine d\'expertise', inline: true },
              { name: '🎯 Vos centres d\'intérêt', value: 'Sujets qui vous passionnent', inline: true },
              { name: '💭 Vos attentes', value: 'Ce que vous recherchez ici', inline: true }
            ])
            .setColor(0x3498db)
        ]
      });

      console.log(`✅ Thread de bienvenue créé: ${thread.name}`);

    } catch (error) {
      console.warn(`⚠️ Impossible de créer le thread de bienvenue:`, error);
    }
  }

  async handleQuizStart(interaction: any) {
    try {
      const modal = new ModalBuilder()
        .setCustomId('welcome_quiz_modal')
        .setTitle('🎯 Questionnaire de Bienvenue');

      // Ajouter les questions comme des inputs dans le modal
      const backgroundInput = new TextInputBuilder()
        .setCustomId('background')
        .setLabel('👔 Domaine d\'expertise principal')
        .setPlaceholder('Finance/Trading, Développement/IA, Marketing, etc.')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const experienceInput = new TextInputBuilder()
        .setCustomId('experience')
        .setLabel('💪 Niveau d\'expérience (1-10)')
        .setPlaceholder('1 = Débutant, 10 = Expert')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const interestsInput = new TextInputBuilder()
        .setCustomId('interests')
        .setLabel('🎯 Centres d\'intérêt')
        .setPlaceholder('Trading crypto, IA, analyse technique, etc.')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const expectationsInput = new TextInputBuilder()
        .setCustomId('expectations')
        .setLabel('🎁 Vos attentes')
        .setPlaceholder('Ce que vous recherchez sur le serveur...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      const contributionInput = new TextInputBuilder()
        .setCustomId('contribution')
        .setLabel('🤝 Comment contribuer ?')
        .setPlaceholder('Partager analyses, aider débutants, développer outils...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(backgroundInput);
      const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(experienceInput);
      const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(interestsInput);
      const fourthActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(expectationsInput);
      const fifthActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(contributionInput);

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow, fourthActionRow, fifthActionRow);

      await interaction.showModal(modal);

    } catch (error) {
      console.error('❌ Erreur affichage questionnaire:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue. Veuillez réessayer plus tard.',
        ephemeral: true
      });
    }
  }

  async handleQuizSubmit(interaction: any) {
    try {
      const background = interaction.fields.getTextInputValue('background');
      const experienceText = interaction.fields.getTextInputValue('experience');
      const interests = interaction.fields.getTextInputValue('interests');
      const expectations = interaction.fields.getTextInputValue('expectations');
      const contribution = interaction.fields.getTextInputValue('contribution');

      const experienceLevel = this.parseExperienceLevel(parseInt(experienceText) || 5);

      const profile: WelcomeProfile = {
        userId: interaction.user.id,
        username: interaction.user.username,
        professionalBackground: background,
        experienceLevel,
        interests: interests.split(',').map((i: string) => i.trim()).filter((i: string) => i),
        expectations,
        contributionArea: contribution,
        joinDate: new Date(),
        completedAt: new Date()
      };

      // Sauvegarder le profil
      await this.saveProfile(profile);

      // Attribuer les rôles appropriés
      await this.assignRoles(interaction.member, profile);

      // Envoyer la confirmation
      await this.sendQuizCompletionMessage(interaction, profile);

      // Notifier le staff
      await this.notifyStaff(interaction.member, profile);

      console.log(`✅ Questionnaire complété par ${interaction.user.username}`);

    } catch (error) {
      console.error('❌ Erreur traitement questionnaire:', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors du traitement de vos réponses.',
        ephemeral: true
      });
    }
  }

  private parseExperienceLevel(score: number): 'débutant' | 'intermédiaire' | 'avancé' | 'expert' {
    if (score <= 3) return 'débutant';
    if (score <= 6) return 'intermédiaire';
    if (score <= 8) return 'avancé';
    return 'expert';
  }

  private async saveProfile(profile: WelcomeProfile) {
    try {
      let profiles: WelcomeProfile[] = [];

      try {
        const data = await fs.readFile(this.profilesPath, 'utf-8');
        profiles = JSON.parse(data);
      } catch {
        // Fichier n'existe pas, on le créera
      }

      profiles.push(profile);
      await fs.writeFile(this.profilesPath, JSON.stringify(profiles, null, 2));

    } catch (error) {
      console.error('❌ Erreur sauvegarde profil:', error);
    }
  }

  private async assignRoles(member: GuildMember, profile: WelcomeProfile) {
    try {
      const guild = member.guild;
      const rolesToAdd: string[] = [];

      // Basé sur l'expérience
      if (profile.experienceLevel === 'expert' || profile.experienceLevel === 'avancé') {
        const expertRole = guild.roles.cache.find(r => r.name === '💼 Analyste Pro');
        if (expertRole) rolesToAdd.push(expertRole.id);
      }

      // Basé sur les intérêts
      if (profile.interests.some((i: string) => i.toLowerCase().includes('ia') || i.toLowerCase().includes('développement'))) {
        const iaRole = guild.roles.cache.find(r => r.name === '🤖 Expert IA');
        if (iaRole) rolesToAdd.push(iaRole.id);
      }

      if (profile.interests.some((i: string) => i.toLowerCase().includes('trading') || i.toLowerCase().includes('crypto'))) {
        const traderRole = guild.roles.cache.find(r => r.name === '📈 Trader Actif');
        if (traderRole) rolesToAdd.push(traderRole.id);
      }

      // Retirer le rôle nouveau membre
      const newMemberRole = guild.roles.cache.find(r => r.name === '🎯 Nouveau Membre');
      if (newMemberRole) {
        await member.roles.remove(newMemberRole, 'Questionnaire complété');
      }

      // Ajouter les nouveaux rôles
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd, 'Questionnaire bienvenue complété');
        console.log(`✅ Rôles attribués à ${member.user.username}: ${rolesToAdd.length} rôles`);
      }

    } catch (error) {
      console.error(`❌ Erreur attribution rôles pour ${member.user.username}:`, error);
    }
  }

  private async sendQuizCompletionMessage(interaction: any, profile: WelcomeProfile) {
    const embed = new EmbedBuilder()
      .setTitle('✅ Questionnaire complété !')
      .setDescription('Merci d\'avoir pris le temps de vous présenter.')
      .setColor(0x00FF00)
      .addFields([
        {
          name: '🎯 Votre profil',
          value: `**Domaine:** ${profile.professionalBackground}\n**Expérience:** ${profile.experienceLevel}\n**Intérêts:** ${profile.interests.slice(0, 3).join(', ')}`
        },
        {
          name: '💡 Prochaines étapes',
          value: '1. 🎊 Rejoignez les discussions dans les channels appropriés\n2. 📊 Partagez vos analyses dans #finances\n3. 💻 Contribuez aux projets dans #claude-code\n4. 🤰 Aidez les nouveaux membres'
        },
        {
          name: '🏆 Rôles obtenus',
          value: 'Basés sur votre profil et vos intérêts'
        }
      ])
      .setFooter({ text: 'Bienvenue dans la communauté VIBE DEV !' });

    await interaction.reply({
      embeds: [embed],
      ephemeral: true
    });
  }

  private async notifyStaff(member: GuildMember, profile: WelcomeProfile) {
    try {
      // Envoyer un message dans le channel staff si disponible
      const staffChannelId = process.env.DISCORD_CHANNEL_STAFF_ONLY;
      if (!staffChannelId) return;

      const staffChannel = await this.client.channels.fetch(staffChannelId) as TextChannel;
      if (!staffChannel) return;

      const embed = new EmbedBuilder()
        .setTitle('👋 Nouveau membre intégré')
        .setColor(0x3498db)
        .addFields([
          { name: '👤 Membre', value: `${member.user.tag} (${member.id})`, inline: true },
          { name: '📅 Date d\'arrivée', value: profile.joinDate.toLocaleDateString(), inline: true },
          { name: '💼 Domaine', value: profile.professionalBackground, inline: true },
          { name: '💪 Expérience', value: profile.experienceLevel, inline: true },
          { name: '🎯 Intérêts principaux', value: profile.interests.slice(0, 3).join(', ') }
        ])
        .setTimestamp();

      await staffChannel.send({ embeds: [embed] });

    } catch (error) {
      console.warn('⚠️ Impossible de notifier le staff:', error);
    }
  }
}