-- Création de la table news_data pour CalendarPublisher
-- Exécutez ce script dans votre base de données PostgreSQL

CREATE TABLE IF NOT EXISTS news_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general',
    importance INTEGER DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,

    -- Contrainte d'unicité
    CONSTRAINT news_data_unique_title_source UNIQUE (source, title)
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_news_data_source ON news_data(source);
CREATE INDEX IF NOT EXISTS idx_news_data_category ON news_data(category);
CREATE INDEX IF NOT EXISTS idx_news_data_published_at ON news_data(published_at);
CREATE INDEX IF NOT EXISTS idx_news_data_created_at ON news_data(created_at);

-- Index sur le champ metadata pour les recherches JSON
CREATE INDEX IF NOT EXISTS idx_news_data_metadata ON news_data USING GIN (metadata);

-- Commentaire sur la table
COMMENT ON TABLE news_data IS 'Stockage des messages et données pour publication Discord et autres systèmes';
COMMENT ON COLUMN news_data.source IS 'Source des données (ex: calendar_publisher, news_scraper, etc.)';
COMMENT ON COLUMN news_data.content IS 'Contenu formaté pour publication';
COMMENT ON COLUMN news_data.metadata IS 'Métadonnées additionnelles en format JSON';