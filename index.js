const { Client, Partials, Collection, GatewayIntentBits } = require('discord.js');
const config = require('./config/config');
const colors = require("colors");
const fs = require("fs");

// Ensure the SQLite database directory exists (created on first run / fresh deploys).
fs.mkdirSync("db", { recursive: true });

// Creating a new client:
const client = new Client({
	// Slash commands need no privileged intents; Guilds is enough for command
	// routing and guild/channel caching.
	intents: [
		GatewayIntentBits.Guilds,
	],
	partials: [
		Partials.Channel
	],
	presence: {
		activities: [{
			name: 'My friendo!',
			type: 0
		}],
		status: 'dnd'
	}
});

// Host the bot:
require('http').createServer((req, res) => res.end('Ready.')).listen(3000);

// Getting the bot token:
const AuthenticationToken = process.env.TOKEN || config.Client.TOKEN;
if (!AuthenticationToken) {
	console.warn("[CRASH] Authentication Token for Discord bot is required! Use Envrionment Secrets or config.js.".red)
	return process.exit();
};

// Handler:
client.slash_commands = new Collection();
client.user_commands = new Collection();
client.message_commands = new Collection();
client.modals = new Collection();
client.events = new Collection();

module.exports = client;

["application_commands", "modals", "events", "mongoose"].forEach((file) => {
	require(`./handlers/${file}`)(client, config);
});

// Login to the bot:
client.login(AuthenticationToken)
	.catch((err) => {
		console.error("[CRASH] Something went wrong while connecting to your bot...");
		console.error("[CRASH] Error from Discord API:" + err);
		return process.exit();
	});

// Handle errors:
process.on('unhandledRejection', async (err, promise) => {
	console.error(`[ANTI-CRASH] Unhandled Rejection: ${err}`.red);
	console.error(promise);
});
