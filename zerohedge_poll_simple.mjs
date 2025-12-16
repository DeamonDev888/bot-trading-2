import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

// Configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DEFAULT_CHANNEL_ID = process.env.DISCORD_CHANNEL_NEWS_AI; // news-ai

// Créer le client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Définir les styles pour chaque réponse
const responseStyles = {
  very_reliable: ButtonStyle.Success,      // Vert
  reliable_careful: ButtonStyle.Primary,  // Bleu
  sometimes_interesting: ButtonStyle.Secondary, // Gris
  not_reliable: ButtonStyle.Danger,       // Rouge
  daily: ButtonStyle.Success,
  weekly: ButtonStyle.Primary,
  occasionally: ButtonStyle.Secondary,
  rarely: ButtonStyle.Danger,
  technical: ButtonStyle.Success,
  economic_news: ButtonStyle.Primary,
  geopolitical: ButtonStyle.Secondary,
  market_comments: ButtonStyle.Danger,
  very_useful: ButtonStyle.Success,
  moderately_useful: ButtonStyle.Primary,
  info_only: ButtonStyle.Secondary,
  not_useful: ButtonStyle.Danger
};

async function createZeroHedgePoll() {
  try {
    console.log('🔗 Connexion à Discord...');
    await client.login(DISCORD_TOKEN);

    console.log('✅ Connecté à Discord!');

    // Récupérer le canal par défaut
    const channel = await client.channels.fetch(DEFAULT_CHANNEL_ID);
    if (!channel) {
      throw new Error(`Canal ${DEFAULT_CHANNEL_ID} non trouvé`);
    }

    // Message d'introduction
    const introEmbed = new EmbedBuilder()
      .setTitle('📊 SONDAGE: ZeroHedge dans la Communauté Financière')
      .setDescription(`Bonjour la communauté !

Nous aimerions connaître votre opinion sur **ZeroHedge**, l'une des sources d'information financière les plus controversées et suivies.

**ZeroHedge** est connu pour ses :
- 📰 Analyses de marché alternatives
- 💭 Commentaires souvent critiques sur l'économie
- 🚨 Alertes sur les risques financiers
- 📊 Couverture 24/7 des marchés

**À SAVOIR**: ZeroHedge est souvent considéré comme "contrarien" et présente des analyses qui peuvent différer des médias financiers traditionnels.

Veuillez répondre aux 4 questions ci-dessous en cliquant sur les boutons correspondants.

**Vos réponses sont anonymes et nous aideront à mieux comprendre les besoins de notre communauté !**`)
      .setColor(0x0099FF)
      .setThumbnail('https://www.zerohedge.com/favicon.ico')
      .addFields(
        { name: '📊 Objectif', value: 'Comprendre comment ZeroHedge est perçu et utilisé', inline: true },
        { name: '⏱️ Durée', value: '2 minutes', inline: true },
        { name: '🔒 Confidentialité', value: 'Réponses anonymes', inline: true }
      )
      .setFooter({ text: 'Nova Financial Bot - Analyse communautaire' });

    await channel.send({ embeds: [introEmbed] });
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Question 1
    const q1Embed = new EmbedBuilder()
      .setTitle('❓ Question 1/4')
      .setDescription('**Quelle est votre opinion générale sur les analyses de ZeroHedge ?**')
      .setColor(0x0099FF)
      .addFields({
        name: '📝 Contexte',
        value: 'ZeroHedge est connu pour ses analyses souvent critiques et ses perspectives alternatives sur les marchés financiers.',
        inline: false
      });

    const q1Row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('poll:q1:very_reliable')
          .setLabel('🟢 Très fiable et pertinent')
          .setStyle(responseStyles.very_reliable),
        new ButtonBuilder()
          .setCustomId('poll:q1:reliable_careful')
          .setLabel('🟡 Fiable mais avec précaution')
          .setStyle(responseStyles.reliable_careful),
        new ButtonBuilder()
          .setCustomId('poll:q1:sometimes_interesting')
          .setLabel('🟠 Parfois intéressant')
          .setStyle(responseStyles.sometimes_interesting),
        new ButtonBuilder()
          .setCustomId('poll:q1:not_reliable')
          .setLabel('🔴 Peu fiable')
          .setStyle(responseStyles.not_reliable)
      );

    await channel.send({ embeds: [q1Embed], components: [q1Row] });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Question 2
    const q2Embed = new EmbedBuilder()
      .setTitle('❓ Question 2/4')
      .setDescription('**À quelle fréquence lisez-vous ZeroHedge ?**')
      .setColor(0x0099FF);

    const q2Row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('poll:q2:daily')
          .setLabel('📅 Tous les jours')
          .setStyle(responseStyles.daily),
        new ButtonBuilder()
          .setCustomId('poll:q2:weekly')
          .setLabel('📆 Plusieurs fois/semaine')
          .setStyle(responseStyles.weekly),
        new ButtonBuilder()
          .setCustomId('poll:q2:occasionally')
          .setLabel('📋 Occasionnellement')
          .setStyle(responseStyles.occasionally),
        new ButtonBuilder()
          .setCustomId('poll:q2:rarely')
          .setLabel('❓ Rarement ou jamais')
          .setStyle(responseStyles.rarely)
      );

    await channel.send({ embeds: [q2Embed], components: [q2Row] });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Question 3
    const q3Embed = new EmbedBuilder()
      .setTitle('❓ Question 3/4')
      .setDescription('**Quel type de contenu ZeroHedge préférez-vous ?**')
      .setColor(0x0099FF);

    const q3Row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('poll:q3:technical')
          .setLabel('📈 Analyses techniques')
          .setStyle(responseStyles.technical),
        new ButtonBuilder()
          .setCustomId('poll:q3:economic_news')
          .setLabel('💰 Actualités économiques')
          .setStyle(responseStyles.economic_news),
        new ButtonBuilder()
          .setCustomId('poll:q3:geopolitical')
          .setLabel('🏛️ Analyses géopolitiques')
          .setStyle(responseStyles.geopolitical),
        new ButtonBuilder()
          .setCustomId('poll:q3:market_comments')
          .setLabel('📊 Commentaires de marché')
          .setStyle(responseStyles.market_comments)
      );

    await channel.send({ embeds: [q3Embed], components: [q3Row] });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Question 4
    const q4Embed = new EmbedBuilder()
      .setTitle('❓ Question 4/4')
      .setDescription('**ZeroHedge est-il utile pour vos décisions de trading/investissement ?**')
      .setColor(0x0099FF);

    const q4Row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('poll:q4:very_useful')
          .setLabel('✅ Oui, très utile')
          .setStyle(responseStyles.very_useful),
        new ButtonBuilder()
          .setCustomId('poll:q4:moderately_useful')
          .setLabel('🤔 Modérément utile')
          .setStyle(responseStyles.moderately_useful),
        new ButtonBuilder()
          .setCustomId('poll:q4:info_only')
          .setLabel('📚 Pour information seulement')
          .setStyle(responseStyles.info_only),
        new ButtonBuilder()
          .setCustomId('poll:q4:not_useful')
          .setLabel('❌ Pas utile du tout')
          .setStyle(responseStyles.not_useful)
      );

    await channel.send({ embeds: [q4Embed], components: [q4Row] });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Message de conclusion
    const conclusionEmbed = new EmbedBuilder()
      .setTitle('✅ Sondage Terminé !')
      .setDescription(`**Merci beaucoup d'avoir participé !** 🙏

Vos réponses nous aideront à :
- 📊 Mieux comprendre les besoins de notre communauté
- 🎯 Améliorer les sources d'information que nous partageons
- 💡 Développer de nouvelles fonctionnalités basées sur vos préférences

**Résultats attendus**: Les données agrégées et anonymisées seront partagées prochainement dans ce canal.

**Votre opinion compte vraiment !**`)
      .setColor(0x00FF00)
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3774/3774235.png')
      .addFields(
        { name: '📈 Prochaines étapes', value: 'Analyse des résultats et publication', inline: true },
        { name: '🔄 Prochains sondages', value: 'Bloomberg, Reuters, TradingView', inline: true }
      )
      .setFooter({ text: 'Nova Financial Bot - Merci pour votre participation !' });

    await channel.send({ embeds: [conclusionEmbed] });

    console.log('✅ Sondage ZeroHedge créé avec succès !');
    console.log(`📍 Publié dans le canal: ${channel.name}`);

  } catch (error) {
    console.error('❌ Erreur lors de la création du sondage:', error);
  } finally {
    // Déconnexion après 5 secondes
    setTimeout(() => {
      if (client.readyState === 1) {
        client.destroy();
        console.log('👋 Déconnecté de Discord');
      }
    }, 5000);
  }
}

// Démarrer le sondage
createZeroHedgePoll();