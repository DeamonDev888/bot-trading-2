-- Ajouter les colonnes manquantes pour la publication Discord
-- Exécuter cette commande pour corriger l'erreur du publisher

-- Ajouter les colonnes de publication si elles n'existent pas
DO $$
BEGIN
    -- Vérifier si la colonne published_at_discord existe, sinon l'ajouter
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'news_items'
        AND column_name = 'published_at_discord'
    ) THEN
        ALTER TABLE news_items ADD COLUMN published_at_discord TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Colonne published_at_discord ajoutée';
    END IF;

    -- Vérifier si la colonne discord_channel_id existe, sinon l'ajouter
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'news_items'
        AND column_name = 'discord_channel_id'
    ) THEN
        ALTER TABLE news_items ADD COLUMN discord_channel_id VARCHAR(50);
        RAISE NOTICE 'Colonne discord_channel_id ajoutée';
    END IF;

    -- Vérifier si la colonne relevance_score existe, sinon l'ajouter
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'news_items'
        AND column_name = 'relevance_score'
    ) THEN
        ALTER TABLE news_items ADD COLUMN relevance_score INTEGER CHECK (relevance_score >= 0 AND relevance_score <= 10);
        RAISE NOTICE 'Colonne relevance_score ajoutée';
    END IF;

    -- Vérifier si la colonne category existe, sinon l'ajouter
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'news_items'
        AND column_name = 'category'
    ) THEN
        ALTER TABLE news_items ADD COLUMN category VARCHAR(50);
        RAISE NOTICE 'Colonne category ajoutée';
    END IF;

END $$;

-- Créer les index nécessaires pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_news_items_published_at_discord ON news_items(published_at_discord) WHERE published_at_discord IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_news_items_relevance_score ON news_items(relevance_score DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_category ON news_items(category);

-- Afficher le statut actuel des colonnes
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'news_items'
    AND column_name IN ('published_at_discord', 'discord_channel_id', 'relevance_score', 'category')
ORDER BY column_name;