-- Script de création de la table user_reputation pour le système de leaderboard
-- Cette table stocke les données de réputation des utilisateurs Discord

CREATE TABLE IF NOT EXISTS user_reputation (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) UNIQUE NOT NULL,
    username VARCHAR(50),
    discriminator VARCHAR(10),
    score INTEGER DEFAULT 0,
    level VARCHAR(20) DEFAULT 'Bronze',
    contributions INTEGER DEFAULT 0,
    badges TEXT[] DEFAULT '{}',
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_user_reputation_user_id ON user_reputation(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reputation_score ON user_reputation(score DESC);
CREATE INDEX IF NOT EXISTS idx_user_reputation_level ON user_reputation(level);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_user_reputation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_user_reputation_updated_at ON user_reputation;
CREATE TRIGGER trigger_update_user_reputation_updated_at
    BEFORE UPDATE ON user_reputation
    FOR EACH ROW
    EXECUTE FUNCTION update_user_reputation_updated_at();

-- Insérer des données de test
INSERT INTO user_reputation (user_id, username, score, level, contributions, badges) VALUES
('123456789', 'TestUser1', 150, 'Or', 25, ARRAY['📊 Analyste']),
('987654321', 'TestUser2', 75, 'Argent', 12, ARRAY[]),
('555666777', 'TestUser3', 200, 'Platine', 35, ARRAY['📊 Analyste', '🤖 Mentor'])
ON CONFLICT (user_id) DO UPDATE SET
    username = EXCLUDED.username,
    score = EXCLUDED.score,
    level = EXCLUDED.level,
    contributions = EXCLUDED.contributions,
    badges = EXCLUDED.badges;

-- Afficher les statistiques de la table
SELECT 
    COUNT(*) as total_users,
    AVG(score) as average_score,
    MAX(score) as highest_score,
    MIN(score) as lowest_score,
    COUNT(*) FILTER (WHERE level = 'Bronze') as bronze_users,
    COUNT(*) FILTER (WHERE level = 'Argent') as silver_users,
    COUNT(*) FILTER (WHERE level = 'Or') as gold_users,
    COUNT(*) FILTER (WHERE level = 'Platine') as platinum_users,
    COUNT(*) FILTER (WHERE level = 'Diamant') as diamond_users
FROM user_reputation;