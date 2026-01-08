const { Client, Intents, MessageEmbed } = require('discord.js');
const config = require('./config.json');
const db = require('./database');
const axios = require('axios');

async function testSakhalBuildLog() {
    const bot = new Client({
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES
        ]
    });

    await bot.login(config.TOKEN);

    await new Promise(resolve => {
        bot.once('ready', () => {
            console.log(`✅ Bot logged in as ${bot.user.tag}\n`);
            resolve();
        });
    });

    const sakhalGuildId = '1445957198000820316';
    const guildConfig = await db.getGuildConfig(sakhalGuildId);

    if (!guildConfig) {
        console.log('❌ Sakhal not found in database');
        process.exit(1);
    }

    console.log('📋 Sakhal Configuration:');
    console.log(`Guild ID: ${guildConfig.guild_id}`);
    console.log(`Server Name: ${guildConfig.server_name}`);
    console.log(`Killfeed: ${guildConfig.killfeed_channel_id}`);
    console.log(`Connections: ${guildConfig.connections_channel_id}`);
    console.log(`Suicide: ${guildConfig.suicide_channel_id}`);
    console.log(`Build: ${guildConfig.build_channel_id}`);
    console.log(`Nitrado Service: ${guildConfig.nitrado_service_id}`);
    console.log(`Nitrado Instance: ${guildConfig.nitrado_instance}`);
    console.log(`Nitrado Token: ${guildConfig.nitrado_token ? 'SET' : 'NOT SET'}`);

    if (!guildConfig.build_channel_id) {
        console.log('\n❌ Build channel ID is not set in database!');
        process.exit(1);
    }

    if (!guildConfig.nitrado_service_id || !guildConfig.nitrado_instance || !guildConfig.nitrado_token) {
        console.log('\n❌ Nitrado credentials not fully configured!');
        process.exit(1);
    }

    // Fetch the log file
    console.log('\n📥 Fetching Sakhal logs...');
    try {
        const listUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/list?dir=/games/${guildConfig.nitrado_instance}/noftp/dayzps/config/`;
        
        console.log(`List URL: ${listUrl}`);
        
        const listResp = await axios.get(listUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const admFiles = listResp.data.data.entries
            .filter(e => e.name.endsWith('.ADM'))
            .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));
        
        if (admFiles.length === 0) {
            console.log('❌ No .ADM files found');
            process.exit(1);
        }
        
        const mostRecentFile = admFiles[0];
        console.log(`✅ Most recent: ${mostRecentFile.name}`);
        
        // Download the file
        const downloadUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=/games/${guildConfig.nitrado_instance}/noftp/dayzps/config/${mostRecentFile.name}`;
        
        const downloadResp = await axios.get(downloadUrl, {
            headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
        });
        
        const logFileUrl = downloadResp.data.data.token.url;
        const logResp = await axios.get(logFileUrl);
        const logText = logResp.data;
        
        console.log(`\n📊 Log file size: ${logText.length} characters`);
        
        // Parse for build events
        const lines = logText.split(/\r?\n/);
        const buildEvents = [];
        
        for (const line of lines) {
            if (line.includes('placed') || line.includes('raised') || line.includes('dismantled') || line.includes('Built')) {
                buildEvents.push(line);
            }
        }
        
        console.log(`\n🏗️  Found ${buildEvents.length} potential build events`);
        
        if (buildEvents.length > 0) {
            console.log('\nLast 5 build events:');
            buildEvents.slice(-5).forEach(event => {
                console.log(`  ${event}`);
            });
            
            // Try posting one to Discord
            console.log('\n📤 Testing post to build channel...');
            const buildChannel = await bot.channels.fetch(guildConfig.build_channel_id);
            
            if (!buildChannel) {
                console.log('❌ Build channel not found in Discord!');
            } else {
                console.log(`✅ Build channel found: ${buildChannel.name}`);
                
                const testEmbed = new MessageEmbed()
                    .setColor('#FFA500')
                    .setTitle('🏗️ Build Log Test')
                    .setDescription('Testing Sakhal build log system')
                    .addField('Status', 'Build events found in logs')
                    .addField('Event Count', buildEvents.length.toString())
                    .setTimestamp();
                
                await buildChannel.send({ embeds: [testEmbed] });
                console.log('✅ Test message sent to build channel!');
            }
        } else {
            console.log('\n⚠️  No build events found in recent log file');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
    }

    process.exit(0);
}

testSakhalBuildLog();
