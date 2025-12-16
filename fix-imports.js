import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fixImports(dir) {
    try {
        const files = await fs.readdir(dir);

        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
                await fixImports(fullPath);
            } else if (file.endsWith('.js')) {
                await fixFileImports(fullPath);
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${dir}:`, error);
    }
}

async function fixFileImports(filePath) {
    try {
        let content = await fs.readFile(filePath, 'utf-8');
        const originalContent = content;

        // Fix relative imports from .ts to .js files
        content = content.replace(
            /from\s+['"](\.\/[^'"]+)\.ts['"]/g,
            "from '$1.js'"
        );

        // Fix relative imports without extension (add .js)
        content = content.replace(
            /from\s+['"](\.\.\/[^'"]+)['"]/g,
            (match, importPath) => {
                // Skip if it already has an extension
                if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
                    return match;
                }
                // Skip if it's a node module or absolute path
                if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
                    return match;
                }
                return `from '${importPath}.js'`;
            }
        );

        // Fix relative imports without extension (add .js)
        content = content.replace(
            /from\s+['"](\.\/[^'"]+)['"]/g,
            (match, importPath) => {
                // Skip if it already has an extension
                if (importPath.endsWith('.js') || importPath.endsWith('.json')) {
                    return match;
                }
                // Skip if it's a node module or absolute path
                if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
                    return match;
                }
                return `from '${importPath}.js'`;
            }
        );

        if (content !== originalContent) {
            await fs.writeFile(filePath, content, 'utf-8');
            console.log(`Fixed imports in: ${filePath}`);
        }
    } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
    }
}

// Fix all imports in the dist directory
await fixImports(path.join(__dirname, 'dist'));
console.log('✅ Import fixing complete!');