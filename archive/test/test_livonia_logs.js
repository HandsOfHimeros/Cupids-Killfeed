const { Client, Intents, MessageEmbed } = require('discord.js');
const config = require('./config.json');
const db = require('./database');
const axios = require('axios');

async function testLivoniaLogs() {
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

    const livoniaGuildId = '1445943557020979274';
    const guildConfig = await db.getGuildConfig(livoniaGuildId);

    if (!guildConfig) {
        console.log('❌ Livonia not found in database');
        process.exit(1);
    }

    console.log('📋 Livonia Configuration:');
    console.log(`Killfeed: ${guildConfig.killfeed_channel_id}`);
    console.log(`Connections: ${guildConfig.connections_channel_id}`);
    console.log(`Suicide: ${guildConfig.suicide_channel_id}`);
    console.log(`Build: ${guildConfig.build_channel_id}`);

    // Fetch the log file
    console.log('\n📥 Fetching Livonia logs...');
    const listUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/list?dir=/games/${guildConfig.nitrado_instance}/noftp/dayzps/config/`;
    
    const listResp = await axios.get(listUrl, {
        headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
    });
    
    const admFiles = listResp.data.data.entries
        .filter(e => e.name.endsWith('.ADM'))
        .sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at));
    
    const mostRecentFile = admFiles[0];
    console.log(`Most recent: ${mostRecentFile.name}`);
    
    const downloadUrl = `https://api.nitrado.net/services/${guildConfig.nitrado_service_id}/gameservers/file_server/download?file=/games/${guildConfig.nitrado_instance}/noftp/dayzps/config/${mostRecentFile.name}`;
    
    const downloadResp = await axios.get(downloadUrl, {
        headers: { 'Authorization': `Bearer ${guildConfig.nitrado_token}` }
    });
    
    const fileUrl = downloadResp.data.data.token.url;
    const logResp = await axios.get(fileUrl);
    const logData = logResp.data;
    
    // Parse events
    const lines = logData.split(/\r?\n/);
    const events = [];
    
    for (const line of lines) {
        let match;
        
        if (line.includes('committed suicide')) {
            match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) committed suicide$/);
            if (match) {
                events.push({
                    type: 'suicide',
                    time: match[1],
                    player: match[2],
                    raw: line
                });
            }
        } else if (line.includes('placed') || line.includes('raised') || line.includes('dismantled') || line.includes('Built')) {
            match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) (placed|raised) (.+) at position/);
            if (match) {
                events.push({
                    type: 'build',
                    time: match[1],
                    player: match[2],
                    action: match[3],
                    item: match[4],
                    raw: line
                });
            } else {
                match = line.match(/^(\d{2}:\d{2}:\d{2}) \| Player \"(.+?)\"\(id=[^)]*\) ?([Dd]ismantled|[Bb]uilt) (.+)/);
                if (match) {
                    events.push({
                        type: 'build',
                        time: match[1],
                        player: match[2],
                        action: match[3].toLowerCase(),
                        item: match[4],
                        raw: line
                    });
                }
            }
        }
    }
    
    console.log(`\n📊 Found ${events.length} suicide/build events in log`);
    
    const suicideEvents = events.filter(e => e.type === 'suicide');
    const buildEvents = events.filter(e => e.type === 'build');
    
    console.log(`  💀 Suicides: ${suicideEvents.length}`);
    console.log(`  🏗️ Builds: ${buildEvents.length}`);
    
    if (events.length === 0) {
        console.log('\n❌ No suicide or build events found to post');
        process.exit(0);
    }
    
    console.log('\n📤 Posting last 10 events of each type to test channels...\n');
    
    // Post last 10 suicides
    const recentSuicides = suicideEvents.slice(-10);
    if (recentSuicides.length > 0 && guildConfig.suicide_channel_id) {
        const channel = await bot.channels.fetch(guildConfig.suicide_channel_id);
        console.log(`Posting ${recentSuicides.length} suicides to ${channel.name}...`);
        
        for (const event of recentSuicides) {
            const embed = new MessageEmbed()
                .setColor('#800080')
                .setTitle('💀 Suicide')
                .setDescription(`**${event.player}** committed suicide`)
                .addField('Time', event.time, true)
                .setTimestamp();
            
            await channel.send({ embeds: [embed] });
        }
        console.log('✅ Suicides posted!');
    }
    
    // Post last 10 builds
    const recentBuilds = buildEvents.slice(-10);
    if (recentBuilds.length > 0 && guildConfig.build_channel_id) {
        const channel = await bot.channels.fetch(guildConfig.build_channel_id);
        console.log(`Posting ${recentBuilds.length} builds to ${channel.name}...`);
        
        for (const event of recentBuilds) {
            const embed = new MessageEmbed()
                .setColor('#0099ff')
                .setTitle('🔨 Build Event')
                .setDescription(`**${event.player}** ${event.action} **${event.item}**`)
                .addField('Time', event.time, true)
                .setTimestamp();
            
            await channel.send({ embeds: [embed] });
        }
        console.log('✅ Builds posted!');
    }
    
    console.log('\n✅ Test complete! Check Livonia suicide and build channels.');
    process.exit(0);
}

testLivoniaLogs().catch(error => {
    console.error('Error:', error);
    process.exit(1);
});
