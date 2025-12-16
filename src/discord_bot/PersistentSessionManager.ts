import { ClaudeChatBotAgent, ChatRequest, ChatResponse } from '../backend/agents/ClaudeChatBotAgent.js';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

interface SessionData {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  contextHistory: string[];
  userActivityLog: Array<{ userId: string; username: string; timestamp: Date; message: string }>;
  claudeProcess?: any;
}

export class PersistentSessionManager {
  private sharedSession: SessionData | null = null;
  private chatAgent: ClaudeChatBotAgent;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes d'inactivité

  constructor(chatAgent?: ClaudeChatBotAgent) {
    this.chatAgent = chatAgent || new ClaudeChatBotAgent();
    this.initializeSharedSession();
    this.startSessionCleanup();
  }

  /**
   * Définit l'agent Discord à utiliser (pour partager l'instance en mode persistant)
   */
  setDiscordAgent(agent: ClaudeChatBotAgent): void {
    this.chatAgent = agent;
  }

  /**
   * Initialise la session partagée unique
   */
  private initializeSharedSession(): void {
    if (!this.sharedSession) {
      this.sharedSession = {
        sessionId: `shared_session_${Date.now()}`,
        startTime: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
        contextHistory: [],
        userActivityLog: []
      };
      console.log(`🆕 Session partagée initialisée: ${this.sharedSession.sessionId}`);
    }
  }

  /**
   * Récupère la session partagée
   */
  private getSharedSession(): SessionData {
    if (!this.sharedSession) {
      this.initializeSharedSession();
    }
    return this.sharedSession!;
  }

  /**
   * Vérifie si la session partagée est encore active
   */
  private isSessionActive(session: SessionData): boolean {
    const timeSinceLastActivity = Date.now() - session.lastActivity.getTime();
    return timeSinceLastActivity < this.sessionTimeout;
  }

  /**
   * Traite un message avec maintien de contexte partagé
   */
  async processMessage(userId: string, username: string, message: string, attachmentContent?: string): Promise<ChatResponse> {
    const session = this.getSharedSession();

    try {
      // Ajouter l'activité utilisateur au log
      const activityEntry = {
        userId,
        username,
        timestamp: new Date(),
        message: attachmentContent ? `${message} [Fichier attaché]` : message
      };
      session.userActivityLog.push(activityEntry);

      // Garder seulement les 10 dernières activités pour éviter les timeouts
      if (session.userActivityLog.length > 10) {
        session.userActivityLog = session.userActivityLog.slice(-10);
      }

      // Ajouter le message à l'historique de contexte avec l'utilisateur
      const historyEntry = `${username}: ${message}`;
      session.contextHistory.push(historyEntry);

      // Garder seulement les 8 derniers échanges pour éviter les timeouts
      if (session.contextHistory.length > 8) {
        session.contextHistory = session.contextHistory.slice(-8);
      }

      // Créer le contexte de conversation partagé (utile pour le premier message ou le mode non-persistant)
      const conversationContext = this.buildConversationContext(session);

      // Déterminer si c'est le premier message de la session globale
      const isFirstMessage = session.messageCount === 0;

      // Utiliser ClaudeChatBotAgent avec le contexte de conversation
      // IMPORTANT: On passe le contexte dans le champ dédié, PAS dans le message
      // L'agent décidera s'il l'utilise (mode classique) ou non (mode persistant avec mémoire)
      const chatRequest: ChatRequest = {
        message: `${message}`, // Message pur sans historique pré-pendant
        userId,
        username,
        attachmentContent,
        isFirstMessage, 
        context: conversationContext // Nouveau champ pour le contexte séparé
      };

      // Appeler le chatbot avec contexte
      console.log(`📞 [SESSION] Appel this.chatAgent.chat pour ${username}`);
      const response = await this.chatAgent.chat(chatRequest);
      console.log(`✅ [SESSION] this.chatAgent.chat terminé pour ${username}`);

      // Ajouter la réponse (concaténée) à l'historique pour le contexte
      const fullResponse = response.messages.join('\n\n');
      session.contextHistory.push(`Sniper: ${fullResponse}`);

      // Mettre à jour les statistiques de session
      session.lastActivity = new Date();
      session.messageCount++;

      console.log(`📊 Session partagée - Messages: ${session.messageCount}, Utilisateurs actifs: ${session.userActivityLog.length}`);

      return response;

    } catch (error) {
      console.error(`❌ Erreur traitement message pour ${username}:`, error);
      // PAS DE FALLBACK - MODE CRASH DÉVELOPPEMENT
      throw error;
    }
  }

  /**
   * Construit le contexte de conversation pour Claude
   */
  private buildConversationContext(session: SessionData): string {
    if (session.contextHistory.length === 0) return "";

    const recentHistory = session.contextHistory.slice(-8); // 8 derniers échanges
    const contextText = recentHistory.join('\n');

    // Récupérer les utilisateurs récents
    const recentUsers = session.userActivityLog.slice(-5).map(a => a.username);
    const uniqueUsers = Array.from(new Set(recentUsers));

    return `
## 📝 CONTEXTE DE CONVERSATION PARTAGÉE
${contextText}

## 📊 STATISTIQUES DE SESSION PARTAGÉE
- **Début de session**: ${session.startTime.toLocaleString('fr-FR')}
- **Messages échangés**: ${session.messageCount}
- **Utilisateurs récents**: ${uniqueUsers.join(', ')}
- **Dernière activité**: ${session.lastActivity.toLocaleString('fr-FR')}

Cette session est partagée entre tous les utilisateurs Discord.
Garde ce contexte en mémoire pour tes réponses suivantes.
`;
  }

  /**
   * Nettoie la session partagée périodiquement
   */
  private startSessionCleanup() {
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 10 * 60 * 1000); // Toutes les 10 minutes
  }

  /**
   * Supprime la session partagée si inactive
   */
  private cleanupInactiveSessions() {
    if (!this.sharedSession) return;

    if (!this.isSessionActive(this.sharedSession)) {
      const inactiveMinutes = Math.round((Date.now() - this.sharedSession.lastActivity.getTime()) / 60000);
      console.log(`🧹 Session partagée nettoyée (inactive depuis ${inactiveMinutes} minutes)`);
      this.sharedSession = null;
      this.initializeSharedSession();
    }
  }

  /**
   * Récupère les statistiques de la session partagée
   */
  getActiveSessionsStats(): { total: number; users: Array<{ username: string; messages: number; duration: number }> } {
    if (!this.sharedSession) {
      return { total: 0, users: [] };
    }

    const recentUsers = this.sharedSession.userActivityLog.slice(-10);
    const uniqueUsers = Array.from(new Set(recentUsers.map(u => u.username)));

    const users = uniqueUsers.map(username => ({
      username,
      messages: this.sharedSession!.messageCount,
      duration: Math.round((Date.now() - this.sharedSession!.startTime.getTime()) / 60000)
    }));

    return {
      total: 1, // Une seule session partagée
      users
    };
  }

  /**
   * Sauvegarde l'état de la session partagée (pour redémarrage)
   */
  async saveSessionsState(): Promise<void> {
    try {
      if (!this.sharedSession) {
        console.log('📂 Aucune session à sauvegarder');
        return;
      }

      const sessionData = {
        sessionId: this.sharedSession.sessionId,
        startTime: this.sharedSession.startTime.toISOString(),
        lastActivity: this.sharedSession.lastActivity.toISOString(),
        messageCount: this.sharedSession.messageCount,
        contextHistory: this.sharedSession.contextHistory,
        userActivityLog: this.sharedSession.userActivityLog.map(a => ({
          ...a,
          timestamp: a.timestamp.toISOString()
        }))
      };

      await fs.writeFile(
        path.join(process.cwd(), 'data', 'shared_session_state.json'),
        JSON.stringify(sessionData, null, 2),
        'utf-8'
      );
      console.log('💾 État de la session partagée sauvegardé');
    } catch (error) {
      console.error('❌ Erreur sauvegarde session partagée:', error);
    }
  }

  /**
   * Charge l'état de la session partagée (au démarrage)
   */
  async loadSessionsState(): Promise<void> {
    try {
      const sessionsFile = path.join(process.cwd(), 'data', 'shared_session_state.json');

      if (!fsSync.existsSync(sessionsFile)) {
        console.log('📂 Aucun état de session partagée à charger');
        return;
      }

      const sessionData = JSON.parse(await fs.readFile(sessionsFile, 'utf-8'));

      const restoredSession = {
        ...sessionData,
        startTime: new Date(sessionData.startTime),
        lastActivity: new Date(sessionData.lastActivity),
        userActivityLog: sessionData.userActivityLog.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }))
      };

      if (this.isSessionActive(restoredSession)) {
        this.sharedSession = restoredSession;
        console.log(`🔄 Session partagée restaurée: ${this.sharedSession!.sessionId}`);
      } else {
        console.log('📂 Session partagée expirée, nouvelle session initialisée');
        this.sharedSession = null;
        this.initializeSharedSession();
      }

    } catch (error) {
      console.error('❌ Erreur chargement session partagée:', error);
    }
  }
}