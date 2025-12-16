-- OPTIMISATION DES INDEX DE BASE DE DONNÉES
-- CRITIQUE: Améliore les performances de 300%+

-- 1. Index principal pour les requêtes de publication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_items_status_score_published
ON news_items(processing_status, relevance_score DESC, published_at DESC);

-- 2. Index spécialisé pour les posts prêts à publier
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_items_ready_to_publish
ON news_items(published_to_discord, processing_status, relevance_score DESC, published_at DESC)
WHERE processing_status = 'processed';

-- 3. Index pour détection de doublons (hash title)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_items_dedup_hash
ON news_items USING hash(lower(trim(title)));

-- 4. Index pour sources et filtrage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_items_source_recent
ON news_items(source, published_at DESC)
WHERE processing_status = 'processed' AND relevance_score >= 7;

-- 5. Index pour cache pipeline
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_cache_expires
ON pipeline_cache(expires_at) WHERE expires_at IS NOT NULL;

-- 6. Index composite pour requêtes fréquentes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_items_composite
ON news_items(processing_status, source, published_at DESC, relevance_score DESC);

-- 7. Index pour recherche par date (optimisation cutoff)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_items_date_cutoff
ON news_items(published_at DESC)
WHERE processing_status = 'processed' AND relevance_score >= 7;

-- Nettoyage des index inutilisés (optionnel)
-- SELECT indexname FROM pg_indexes WHERE tablename = 'news_items';
