import fs from 'fs/promises';
import pathModule from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface CacheStats {
  totalFiles: number;
  totalSize: number;
  filesByType: Record<string, number>;
  oldestFile: Date | null;
  newestFile: Date | null;
}

export class CacheCleanupService {
  private cacheDir: string;
  private readonly maxAgeHours = 24; // Keep files for 24 hours
  private readonly maxFiles = 100; // Keep max 100 files per type

  constructor() {
    this.cacheDir = pathModule.join(process.cwd(), 'cache');
  }

  /**
   * Get detailed cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const files = await fs.readdir(this.cacheDir);

      const stats: CacheStats = {
        totalFiles: files.length,
        totalSize: 0,
        filesByType: {},
        oldestFile: null,
        newestFile: null
      };

      const fileStats = await Promise.all(
        files.map(async (file) => {
          const filePath = pathModule.join(this.cacheDir, file);
          const stat = await fs.stat(filePath);

          return {
            name: file,
            size: stat.size,
            mtime: stat.mtime,
            type: file.includes('.txt') ? 'prompt' :
                  file.includes('.md') ? 'cache' : 'other'
          };
        })
      );

      // Calculate statistics
      for (const file of fileStats) {
        stats.totalSize += file.size;
        stats.filesByType[file.type] = (stats.filesByType[file.type] || 0) + 1;

        if (!stats.oldestFile || file.mtime < stats.oldestFile) {
          stats.oldestFile = file.mtime;
        }
        if (!stats.newestFile || file.mtime > stats.newestFile) {
          stats.newestFile = file.mtime;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        filesByType: {},
        oldestFile: null,
        newestFile: null
      };
    }
  }

  /**
   * Clean old cache files
   */
  async cleanCache(): Promise<{ deleted: number; freedSpace: number }> {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = new Date();
      let deleted = 0;
      let freedSpace = 0;

      // Group files by type for selective cleanup
      const filesByType: Record<string, Array<{name: string; mtime: Date; size: number}>> = {};

      for (const file of files) {
        const filePath = pathModule.join(this.cacheDir, file);
        const stat = await fs.stat(filePath);

        const type = file.includes('.txt') ? 'prompt' :
                    file.includes('.md') ? 'cache' : 'other';

        if (!filesByType[type]) filesByType[type] = [];
        filesByType[type].push({ name: file, mtime: stat.mtime, size: stat.size });
      }

      // Clean each type
      for (const [type, typeFiles] of Object.entries(filesByType)) {
        // Sort by modification time (oldest first)
        typeFiles.sort((a, b) => a.mtime.getTime() - b.mtime.getTime());

        // Delete files older than maxAgeHours
        const cutoffTime = new Date(now.getTime() - this.maxAgeHours * 60 * 60 * 1000);

        for (const file of typeFiles) {
          if (file.mtime < cutoffTime || typeFiles.length > this.maxFiles) {
            const filePath = pathModule.join(this.cacheDir, file.name);
            try {
              await fs.unlink(filePath);
              deleted++;
              freedSpace += file.size;
              console.log(`🗑️ Deleted ${type} file: ${file.name} (${this.formatBytes(file.size)})`);
            } catch (error) {
              console.error(`❌ Failed to delete ${file.name}:`, error);
            }
          }
        }
      }

      return { deleted, freedSpace };
    } catch (error) {
      console.error('Error cleaning cache:', error);
      return { deleted: 0, freedSpace: 0 };
    }
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Run cache cleanup with detailed logging
   */
  async runCleanup(): Promise<void> {
    console.log('🧹 Starting cache cleanup...');

    // Show stats before cleanup
    const beforeStats = await this.getCacheStats();
    console.log('📊 Cache stats before cleanup:');
    console.log(`   Total files: ${beforeStats.totalFiles}`);
    console.log(`   Total size: ${this.formatBytes(beforeStats.totalSize)}`);
    console.log(`   Files by type:`, beforeStats.filesByType);
    if (beforeStats.oldestFile) {
      console.log(`   Oldest file: ${beforeStats.oldestFile.toISOString()}`);
    }
    if (beforeStats.newestFile) {
      console.log(`   Newest file: ${beforeStats.newestFile.toISOString()}`);
    }

    // Perform cleanup
    const result = await this.cleanCache();
    console.log(`\n✅ Cleanup completed:`);
    console.log(`   Files deleted: ${result.deleted}`);
    console.log(`   Space freed: ${this.formatBytes(result.freedSpace)}`);

    // Show stats after cleanup
    const afterStats = await this.getCacheStats();
    console.log(`\n📊 Cache stats after cleanup:`);
    console.log(`   Total files: ${afterStats.totalFiles}`);
    console.log(`   Total size: ${this.formatBytes(afterStats.totalSize)}`);
    console.log(`   Files by type:`, afterStats.filesByType);
  }
}

// Auto-run if executed directly
(async () => {
  const cleanupService = new CacheCleanupService();
  await cleanupService.runCleanup();
})();