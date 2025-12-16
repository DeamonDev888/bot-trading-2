/**
 * Test du RoleManager
 */
import { RoleManager } from './RoleManager.mjs';

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

testRoleManager().catch(console.error);