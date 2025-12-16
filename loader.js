#!/usr/bin/env node

/**
 * Configuration Loader for Claude
 * Usage: node loader.js "path/to/settings.json"
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function main() {
  const configPath = process.argv[2];

  if (!configPath) {
    console.error('Usage: node loader.js "path/to/settings.json"');
    process.exit(1);
  }

  const resolvedPath = path.resolve(configPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Configuration file not found: ${resolvedPath}`);
    process.exit(1);
  }

  console.log(`Loading configuration from: ${resolvedPath}`);

  try {
    const config = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    console.log('Configuration loaded successfully!');

    // Display key configuration sections
    if (config.env) {
      console.log('\n📋 Environment Variables:');
      Object.keys(config.env).forEach(key => {
        console.log(`  ${key}`);
      });
    }

    if (config.permissions) {
      console.log('\n🔒 Permissions:');
      console.log(`  Allowed commands: ${config.permissions.allow?.length || 0}`);
    }

    if (config.mcpServers) {
      console.log('\n🔌 MCP Servers:');
      Object.keys(config.mcpServers).forEach(server => {
        console.log(`  ${server}`);
      });
    }

    console.log('\n🚀 Starting Claude with this configuration...');

    // Start Claude with the loaded configuration
    const claude = spawn('claude', ['--settings', resolvedPath, ...process.argv.slice(3)], {
      stdio: 'inherit',
      shell: true
    });

    claude.on('exit', (code) => {
      process.exit(code);
    });

  } catch (error) {
    console.error('Error parsing configuration file:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };