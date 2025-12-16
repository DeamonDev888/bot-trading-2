#!/usr/bin/env node

/**
 * Script de diagnostic complet pour le système de leaderboard
 * Identifie les problèmes d'intégration base de données et Discord
 */

import { readFile, access, mkdir, writeFile } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import { Client } from 'discord.js';
import pkg from 'pg';

const { Pool } = pkg;

console.log('🔍 DIAGNOSTIC COMPLET DU SYSTÈME DE LEADERBOARD');
console.log('================================================\n');

async function checkEnvironment() {
    console.log('1️⃣ VÉRIFICATION DE L\'ENVIRONNEMENT');
    console.log('------------------------------------');
    
    try {
        const envData = await readFile('.env', 'utf-8');
        console.log('✅ Fichier .env trouvé');
        
        // Extraire les variables importantes
        const env = {};
        envData.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                env[key.trim()] = valueParts.join('=').trim();
            }
        });
        
        console.log('🔧 Configuration Discord:');
        console.log(`   • Token: ${env.DISCORD_TOKEN ? '✅ Configuré' : '❌ Manquant'}`);
        console.log(`   • Guild ID: ${env.DISCORD_GUILD_ID ? '✅ Configuré' : '❌ Manquant'}`);
        
        console.log('\n🔧 Configuration Base de données:');
        console.log(`   • Host: ${env.DB_HOST || 'localhost'}`);
        console.log(`   • Port: ${env.DB_PORT || '5432'}`);
        console.log(`   • Database: ${env.DB_NAME || 'financial_analyst'}`);
        console.log(`   • User: ${env.DB_USER || 'postgres'}`);
        console.log(`   • Password: ${env.DB_PASSWORD ? '✅ Configuré' : '❌ Manquant'}`);
        
        return env;
    } catch (error) {
        console.log('❌ Erreur lecture .env:', error.message);
        return null;
    }
}

async function testDatabaseConnection(env) {
    console.log('\n2️⃣ TEST DE CONNEXION BASE DE DONNÉES');
    console.log('-------------------------------------');
    
    if (!env) {
        console.log('❌ Impossible de tester - configuration manquante');
        return false;
    }
    
    const pool = new Pool({
        host: env.DB_HOST || 'localhost',
        port: parseInt(env.DB_PORT || '5432'),
        database: env.DB_NAME || 'financial_analyst',
        user: env.DB_USER || 'postgres',
        password: env.DB_PASSWORD,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
    
    try {
        // Test de connexion simple
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        console.log('✅ Connexion base de données réussie');
        console.log(`   • Heure serveur: ${result.rows[0].current_time}`);
        
        // Vérifier les tables existantes
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        
        console.log('\n📊 Tables existantes:');
        tables.rows.forEach(row => {
            console.log(`   • ${row.table_name}`);
        });
        
        // Vérifier si la table user_reputation existe
        const reputationTable = tables.rows.find(r => r.table_name === 'user_reputation');
        if (reputationTable) {
            console.log('✅ Table user_reputation trouvée');
            
            // Compter les enregistrements
            const count = await client.query('SELECT COUNT(*) FROM user_reputation');
            console.log(`   • Enregistrements: ${count.rows[0].count}`);
        } else {
            console.log('❌ Table user_reputation manquante');
        }
        
        client.release();
        return true;
        
    } catch (error) {
        console.log('❌ Erreur connexion base de données:', error.message);
        return false;
    } finally {
        await pool.end();
    }
}

async function testDiscordConnection(env) {
    console.log('\n3️⃣ TEST DE CONNEXION DISCORD');
    console.log('------------------------------');
    
    if (!env || !env.DISCORD_TOKEN) {
        console.log('❌ Token Discord manquant');
        return false;
    }
    
    const client = new Client({
        intents: ['Guilds', 'GuildMessages']
    });
    
    try {
        console.log('🔄 Connexion à Discord...');
        await client.login(env.DISCORD_TOKEN);
        
        console.log('✅ Connexion Discord réussie');
        console.log(`   • Bot: ${client.user?.tag}`);
        console.log(`   • Guilds: ${client.guilds.cache.size}`);
        
        if (env.DISCORD_GUILD_ID) {
            try {
                const guild = await client.guilds.fetch(env.DISCORD_GUILD_ID);
                console.log(`   • Guild: ${guild.name} (${guild.memberCount} membres)`);
            } catch (error) {
                console.log(`❌ Guild ${env.DISCORD_GUILD_ID} non accessible`);
            }
        }
        
        await client.destroy();
        return true;
        
    } catch (error) {
        console.log('❌ Erreur connexion Discord:', error.message);
        return false;
    }
}

async function checkReputationFile() {
    console.log('\n4️⃣ VÉRIFICATION DU FICHIER REPUTATION.JSON');
    console.log('------------------------------------------');
    
    const reputationPath = path.join(process.cwd(), 'data', 'reputation.json');
    
    try {
        await access(reputationPath, constants.F_OK);
        console.log('✅ Fichier reputation.json existe');
        
        try {
            const data = await readFile(reputationPath, 'utf-8');
            const reputationData = JSON.parse(data);
            const userCount = Object.keys(reputationData).length;
            console.log(`   • Utilisateurs enregistrés: ${userCount}`);
            
            if (userCount > 0) {
                console.log('\n🏆 Top 5 utilisateurs:');
                const sorted = Object.values(reputationData)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5);
                
                sorted.forEach((user, index) => {
                    const medal = ['🥇', '🥈', '🥉', '🏅', '🏅'][index] || '🏅';
                    console.log(`   ${medal} ${user.level}: ${user.score} points`);
                });
            }
        } catch (parseError) {
            console.log('❌ Erreur parsing JSON:', parseError.message);
        }
        
    } catch (error) {
        console.log('❌ Fichier reputation.json manquant');
        console.log(`   • Chemin: ${reputationPath}`);
        return false;
    }
    
    return true;
}

async function createReputationFile() {
    console.log('\n5️⃣ CRÉATION DU FICHIER REPUTATION.JSON');
    console.log('--------------------------------------');
    
    const dataDir = path.join(process.cwd(), 'data');
    const reputationPath = path.join(dataDir, 'reputation.json');
    
    try {
        // Créer le dossier data s'il n'existe pas
        try {
            await access(dataDir, constants.F_OK);
        } catch {
            await mkdir(dataDir, { recursive: true });
            console.log('📁 Dossier data créé');
        }
        
        // Créer un fichier avec des données de test
        const testData = {
            "123456789": {
                "userId": "123456789",
                "score": 150,
                "badges": ["📊 Analyste"],
                "contributions": 25,
                "lastActivity": new Date().toISOString(),
                "level": "Or"
            },
            "987654321": {
                "userId": "987654321",
                "score": 75,
                "badges": [],
                "contributions": 12,
                "lastActivity": new Date().toISOString(),
                "level": "Argent"
            }
        };
        
        await writeFile(reputationPath, JSON.stringify(testData, null, 2));
        console.log('✅ Fichier reputation.json créé avec données de test');
        console.log(`   • Utilisateurs de test: 2`);
        
        return true;
        
    } catch (error) {
        console.log('❌ Erreur création fichier:', error.message);
        return false;
    }
}

async function runFullDiagnostic() {
    const results = {
        environment: false,
        database: false,
        discord: false,
        reputationFile: false
    };
    
    // 1. Vérification environnement
    const env = await checkEnvironment();
    results.environment = !!env;
    
    // 2. Test base de données
    results.database = await testDatabaseConnection(env);
    
    // 3. Test Discord
    results.discord = await testDiscordConnection(env);
    
    // 4. Vérification fichier reputation
    results.reputationFile = await checkReputationFile();
    
    // 5. Créer le fichier s'il n'existe pas
    if (!results.reputationFile) {
        await createReputationFile();
    }
    
    // Résumé final
    console.log('\n' + '='.repeat(50));
    console.log('📋 RÉSUMÉ DU DIAGNOSTIC');
    console.log('='.repeat(50));
    
    const checks = [
        { name: 'Configuration environnement', status: results.environment },
        { name: 'Connexion base de données', status: results.database },
        { name: 'Connexion Discord', status: results.discord },
        { name: 'Fichier reputation.json', status: results.reputationFile }
    ];
    
    checks.forEach(check => {
        console.log(`${check.status ? '✅' : '❌'} ${check.name}`);
    });
    
    const successRate = (checks.filter(c => c.status).length / checks.length) * 100;
    console.log(`\n🎯 Taux de réussite: ${successRate.toFixed(1)}%`);
    
    if (successRate < 100) {
        console.log('\n🔧 ACTIONS CORRECTIVES RECOMMANDÉES:');
        
        if (!results.database) {
            console.log('   • Vérifier la connexion PostgreSQL');
            console.log('   • Créer la table user_reputation si nécessaire');
        }
        
        if (!results.discord) {
            console.log('   • Vérifier le token Discord');
            console.log('   • Vérifier les permissions du bot');
        }
        
        if (!results.reputationFile) {
            console.log('   • Le fichier reputation.json sera créé automatiquement');
        }
    } else {
        console.log('\n🎉 Tous les systèmes fonctionnent correctement !');
    }
}

// Exécuter le diagnostic
runFullDiagnostic().catch(console.error);