#!/usr/bin/env npx ts-node
/**
 * Script de nettoyage et optimisation de la base de données
 *
 * Fonctionnalités:
 * 1. Analyse complète de l'état de la DB
 * 2. Suppression des doublons
 * 3. Nettoyage des données invalides/spam
 * 4. Normalisation des URLs
 * 5. Optimisation (VACUUM ANALYZE)
 *
 * Usage: npx ts-node src/backend/scripts/db_cleanup.ts [--analyze-only]
 */
interface DBStats {
    totalNews: number;
    uniqueTitles: number;
    duplicateCount: number;
    bySource: Record<string, number>;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    publishedToDiscord: number;
    avgRelevanceScore: number;
    oldestItem: Date | null;
    newestItem: Date | null;
    tableSize: string;
    invalidUrls: number;
    spamItems: number;
}
interface CleanupResult {
    duplicatesRemoved: number;
    invalidRemoved: number;
    urlsNormalized: number;
    spamRemoved: number;
    orphanedRemoved: number;
    optimizationDone: boolean;
    errors: string[];
}
declare class DatabaseCleanup {
    private pool;
    constructor();
    /**
     * Analyse complète de la base de données
     */
    analyzeDatabase(): Promise<DBStats>;
    /**
     * Affiche le rapport d'analyse
     */
    private printAnalysisReport;
    /**
     * Nettoie les doublons en gardant le plus récent
     */
    removeDuplicates(): Promise<number>;
    /**
     * Supprime les items spam/invalides
     */
    removeSpamAndInvalid(): Promise<number>;
    /**
     * Normalise les URLs dans la base
     */
    normalizeUrls(): Promise<number>;
    /**
     * Normalise une URL
     */
    private normalizeUrl;
    /**
     * Supprime les anciennes données (> 30 jours) non publiées et non pertinentes
     */
    removeOldIrrelevant(): Promise<number>;
    /**
     * Ajoute les colonnes manquantes si nécessaire
     */
    ensureColumns(): Promise<void>;
    /**
     * Génère les hashes manquants
     */
    generateMissingHashes(): Promise<number>;
    /**
     * Optimise la base (VACUUM ANALYZE)
     */
    optimizeDatabase(): Promise<void>;
    /**
     * Crée les index manquants
     */
    createIndexes(): Promise<void>;
    /**
     * Exécute le nettoyage complet
     */
    runFullCleanup(): Promise<CleanupResult>;
    /**
     * Ferme la connexion
     */
    close(): Promise<void>;
}
export { DatabaseCleanup };
//# sourceMappingURL=db_cleanup.d.ts.map