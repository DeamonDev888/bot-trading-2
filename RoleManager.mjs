/**
 * RoleManager avec support base de données et système de fallback
 * Gère les rôles et la réputation des utilisateurs avec persistance fiable
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client as PGClient } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de la base de données PostgreSQL
const DB_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'financial_analyst',
    user: 'postgres',
    password: 'postgres'
};

class DatabaseManager {
    constructor() {
        this.isConnected = false;
        this.client = null;
    }

    async connect() {
        try {
            this.client = new PGClient(DB_CONFIG);
            await this.client.connect();
            this.isConnected = true;
            console.log('✅ Connexion base de données établie');
            return true;
        } catch (error) {
            console.log('❌ Échec connexion base de données:', error.message);
            console.log('🔄 Utilisation du système de fichiers en fallback');
            return false;
        }
    }

    async disconnect() {
        if (this.client && this.isConnected) {
            await this.client.end();
            this.isConnected = false;
        }
    }

    // Méthodes de base de données
    async getUserReputation(userId) {
        if (!this.isConnected) return null;
        
        try {
            const result = await this.client.query(
                'SELECT * FROM user_reputation WHERE user_id = $1',
                [userId]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Erreur lecture utilisateur:', error);
            return null;
        }
    }

    async saveUserReputation(userId, reputationData) {
        if (!this.isConnected) return false;
        
        try {
            const { username, discriminator, score, level, contributions, badges } = reputationData;
            
            await this.client.query(`
                INSERT INTO user_reputation (user_id, username, discriminator, score, level, contributions, badges, last_activity)
                VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    username = EXCLUDED.username,
                    discriminator = EXCLUDED.discriminator,
                    score = EXCLUDED.score,
                    level = EXCLUDED.level,
                    contributions = EXCLUDED.contributions,
                    badges = EXCLUDED.badges,
                    last_activity = EXCLUDED.last_activity,
                    updated_at = CURRENT_TIMESTAMP
            `, [userId, username, discriminator, score, level, contributions, badges]);
            
            return true;
        } catch (error) {
            console.error('Erreur sauvegarde utilisateur:', error);
            return false;
        }
    }

    async getLeaderboard(limit = 10) {
        if (!this.isConnected) return [];
        
        try {
            const result = await this.client.query(`
                SELECT user_id, username, score, level, contributions, badges, last_activity
                FROM user_reputation 
                ORDER BY score DESC 
                LIMIT $1
            `, [limit]);
            
            return result.rows;
        } catch (error) {
            console.error('Erreur récupération leaderboard:', error);
            return [];
        }
    }

    async updateScore(userId, scoreChange) {
        if (!this.isConnected) return false;
        
        try {
            await this.client.query(`
                UPDATE user_reputation 
                SET score = score + $1,
                    last_activity = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $2
            `, [scoreChange, userId]);
            
            return true;
        } catch (error) {
            console.error('Erreur mise à jour score:', error);
            return false;
        }
    }
}

class FileSystemManager {
    constructor() {
        this.dataPath = path.join(__dirname, 'user_reputation_data.json');
    }

    async ensureDataFile() {
        try {
            await fs.access(this.dataPath);
        } catch {
            const initialData = { users: {}, lastUpdated: new Date().toISOString() };
            await fs.writeFile(this.dataPath, JSON.stringify(initialData, null, 2));
        }
    }

    async loadData() {
        await this.ensureDataFile();
        const data = await fs.readFile(this.dataPath, 'utf8');
        return JSON.parse(data);
    }

    async saveData(data) {
        data.lastUpdated = new Date().toISOString();
        await fs.writeFile(this.dataPath, JSON.stringify(data, null, 2));
    }

    async getUserReputation(userId) {
        const data = await this.loadData();
        return data.users[userId] || null;
    }

    async saveUserReputation(userId, reputationData) {
        const data = await this.loadData();
        data.users[userId] = {
            ...reputationData,
            lastActivity: new Date().toISOString()
        };
        await this.saveData(data);
        return true;
    }

    async getLeaderboard(limit = 10) {
        const data = await this.loadData();
        const users = Object.values(data.users);
        return users
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, limit);
    }

    async updateScore(userId, scoreChange) {
        const data = await this.loadData();
        if (data.users[userId]) {
            data.users[userId].score = (data.users[userId].score || 0) + scoreChange;
            data.users[userId].lastActivity = new Date().toISOString();
            await this.saveData(data);
            return true;
        }
        return false;
    }
}

export class RoleManager {
    constructor() {
        this.db = new DatabaseManager();
        this.fs = new FileSystemManager();
        this.client = null;
        this.initialized = false;
    }

    async initialize() {
        console.log('🔄 Initialisation du RoleManager...');
        
        // Tentative de connexion à la base de données
        const dbConnected = await this.db.connect();
        
        if (dbConnected) {
            console.log('✅ RoleManager initialisé avec base de données');
        } else {
            console.log('✅ RoleManager initialisé avec système de fichiers');
        }
        
        this.initialized = true;
    }

    async addUser(user, score = 0) {
        if (!this.initialized) await this.initialize();

        const reputationData = {
            username: user.username,
            discriminator: user.discriminator,
            score: score,
            level: this.calculateLevel(score),
            contributions: 0,
            badges: []
        };

        // Utiliser la base de données si disponible, sinon le système de fichiers
        const success = await this.db.saveUserReputation(user.id, reputationData) || 
                       await this.fs.saveUserReputation(user.id, reputationData);
        
        if (success) {
            console.log(`✅ Utilisateur ajouté: ${user.username} (Score: ${score})`);
            await this.updateUserRoles(user, reputationData.level);
        }
        
        return success;
    }

    async updateScore(user, scoreChange) {
        if (!this.initialized) await this.initialize();

        const currentReputation = await this.db.getUserReputation(user.id) || 
                                await this.fs.getUserReputation(user.id);
        
        if (!currentReputation) {
            // Créer l'utilisateur s'il n'existe pas
            return await this.addUser(user, Math.max(0, scoreChange));
        }

        const newScore = Math.max(0, (currentReputation.score || 0) + scoreChange);
        const newLevel = this.calculateLevel(newScore);
        const levelChanged = currentReputation.level !== newLevel;

        const updatedReputation = {
            ...currentReputation,
            score: newScore,
            level: newLevel,
            lastActivity: new Date().toISOString()
        };

        const success = await this.db.saveUserReputation(user.id, updatedReputation) || 
                       await this.fs.saveUserReputation(user.id, updatedReputation);
        
        if (success && levelChanged) {
            console.log(`🎉 ${user.username} est passé au niveau ${newLevel}! (Score: ${newScore})`);
            await this.updateUserRoles(user, newLevel);
        } else if (success) {
            console.log(`📊 Score mis à jour pour ${user.username}: ${newScore}`);
        }
        
        return success;
    }

    calculateLevel(score) {
        if (score >= 1000) return 'Diamant';
        if (score >= 500) return 'Platine';
        if (score >= 250) return 'Or';
        if (score >= 100) return 'Argent';
        return 'Bronze';
    }

    async updateUserRoles(user, level) {
        if (!this.client) return;

        const levelRoles = {
            'Bronze': 'Bronze Member',
            'Argent': 'Silver Member', 
            'Or': 'Gold Member',
            'Platine': 'Platinum Member',
            'Diamant': 'Diamond Member'
        };

        try {
            const targetRole = levelRoles[level];
            if (!targetRole) return;

            // Retirer tous les rôles de niveau
            const member = await this.client.guilds.cache.first()?.members.fetch(user.id);
            if (!member) return;

            const rolesToRemove = Object.values(levelRoles);
            await member.roles.remove(rolesToRemove.filter(role => member.roles.cache.has(role)));

            // Ajouter le nouveau rôle de niveau
            const newRole = member.guild.roles.cache.find(role => role.name === targetRole);
            if (newRole) {
                await member.roles.add(newRole);
                console.log(`🎭 Rôle ${targetRole} attribué à ${user.username}`);
            }
        } catch (error) {
            console.error('Erreur mise à jour rôles:', error);
        }
    }

    async getLeaderboard(limit = 10) {
        if (!this.initialized) await this.initialize();
        
        return await this.db.getLeaderboard(limit) || await this.fs.getLeaderboard(limit);
    }

    async getUserReputation(userId) {
        if (!this.initialized) await this.initialize();
        
        return await this.db.getUserReputation(userId) || await this.fs.getUserReputation(userId);
    }

    setDiscordClient(client) {
        this.client = client;
    }

    async cleanup() {
        await this.db.disconnect();
        console.log('🔄 RoleManager nettoyé');
    }
}

// Test du système si exécuté directement
async function testRoleManager() {
    console.log('🧪 Test du système RoleManager...');
    
    const roleManager = new RoleManager();
    await roleManager.initialize();
    
    // Simulation d'un utilisateur Discord
    const mockUser = {
        id: '123456789',
        username: 'TestUser',
        discriminator: '1234'
    };
    
    // Test d'ajout d'utilisateur
    console.log('\n📝 Test ajout utilisateur:');
    await roleManager.addUser(mockUser, 50);
    
    // Test de mise à jour de score
    console.log('\n📊 Test mise à jour score:');
    await roleManager.updateScore(mockUser, 25);
    
    // Test leaderboard
    console.log('\n🏆 Test leaderboard:');
    const leaderboard = await roleManager.getLeaderboard(5);
    console.log('Leaderboard:', JSON.stringify(leaderboard, null, 2));
    
    await roleManager.cleanup();
    console.log('\n✅ Tests terminés');
}

// Exécuter les tests si le fichier est exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
    testRoleManager().catch(console.error);
}