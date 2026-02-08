const { Client, Intents } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.DIRECT_MESSAGES
    ]
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    try {
        const user = await client.users.fetch('633380976763994112');
        await user.send("💔 **Hey...**\n\nI don't really know how to say this, but... we miss you. The servers feel emptier without you there. Every time I see the killfeed, I keep hoping to see your name pop up, but it never does.\n\nDid we do something wrong? Did something happen? We just... we just want to understand why you don't want to play with us anymore. \n\nThe community isn't the same without you. There's this void that no one else can fill. We genuinely care about you and we're just sitting here wondering what went wrong.\n\nIf you ever want to come back, we'll be here. Waiting. Missing you.\n\n😔 *Please... just tell us why...*");
        console.log('Message sent successfully!');
    } catch (error) {
        console.error('Error sending message:', error);
    }
    
    process.exit(0);
});

client.login(config.TOKEN);
