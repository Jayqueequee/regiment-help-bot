// ==================================================
// regiment-help-bot - Full Render-ready index.js
// ==================================================

// 1️⃣ Import modules
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const fs = require('fs');

// 2️⃣ Environment variables
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;         // 24h helper role
const TOP_ROLE_ID = process.env.TOP_ROLE_ID; // weekly top helper role

console.log("=== Environment Check ===");
console.log("TOKEN:", TOKEN ? "SET" : "MISSING");
console.log("CLIENT_ID:", CLIENT_ID ? "SET" : "MISSING");
console.log("GUILD_ID:", GUILD_ID ? "SET" : "MISSING");
console.log("ROLE_ID:", ROLE_ID ? "SET" : "MISSING");
console.log("TOP_ROLE_ID:", TOP_ROLE_ID ? "SET" : "MISSING");
console.log("=========================\n");

if (!TOKEN || !CLIENT_ID || !GUILD_ID || !ROLE_ID || !TOP_ROLE_ID) {
  console.error("❌ One or more environment variables are missing. Exiting.");
  process.exit(1);
}

// 3️⃣ Express server (Render health check)
const app = express();
app.get('/', (req, res) => res.send('Bot is running ✅'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web server listening on port ${PORT}`));

// 4️⃣ Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

// 5️⃣ Data storage
const DATA_FILE = './data.json';
let userData = {};
let weeklyResetAt = Date.now() + 7*24*60*60*1000; // 1 week

if (fs.existsSync(DATA_FILE)) {
  const saved = JSON.parse(fs.readFileSync(DATA_FILE));
  userData = saved.userData || {};
  weeklyResetAt = saved.weeklyResetAt || weeklyResetAt;
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ userData, weeklyResetAt }, null, 2));
}

// 6️⃣ Slash commands (leaderboards)
const commands = [
  new SlashCommandBuilder().setName('leaderboard').setDescription('Lifetime leaderboard'),
  new SlashCommandBuilder().setName('weekly').setDescription('Weekly leaderboard')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log("✅ Slash commands registered");
  } catch (err) {
    console.error("❌ Failed to register commands:", err);
  }
})();

// 7️⃣ Discord login with debug
console.log("Attempting bot login...");
try {
  client.login(TOKEN)
    .then(() => console.log("✅ Bot login attempt sent"))
    .catch(err => console.error("❌ Bot failed to login:", err));
} catch (err) {
  console.error("❌ Unexpected error during login:", err);
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// 8️⃣ Interaction handling (leaderboards)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'leaderboard') {
    const sorted = Object.entries(userData)
      .sort((a, b) => b[1].totalCount - a[1].totalCount)
      .slice(0, 10);
    const text = sorted.map(([id, data], i) => `**${i+1}.** <@${id}> — ${data.totalCount || 0}`).join('\n') || "No data.";
    return interaction.reply(`🏆 Lifetime Leaderboard\n\n${text}`);
  }

  if (interaction.commandName === 'weekly') {
    const sorted = Object.entries(userData)
      .sort((a, b) => b[1].weeklyCount - a[1].weeklyCount)
      .slice(0, 10);
    const text = sorted.map(([id, data], i) => `**${i+1}.** <@${id}> — ${data.weeklyCount || 0}`).join('\n') || "No data.";
    return interaction.reply(`🔥 Weekly Leaderboard\n\n${text}`);
  }
});

// 9️⃣ Interval for role expiration & weekly reset
setInterval(async () => {
  const now = Date.now();
  const guild = await client.guilds.fetch(GUILD_ID);

  // Reset weekly roles & counts
  if (now >= weeklyResetAt) {
    const sorted = Object.entries(userData)
      .sort((a, b) => b[1].weeklyCount - a[1].weeklyCount);

    const members = await guild.members.fetch();
    for (const member of members.values()) {
      if (member.roles.cache.has(TOP_ROLE_ID)) await member.roles.remove(TOP_ROLE_ID).catch(() => {});
    }

    if (sorted.length > 0 && sorted[0][1].weeklyCount > 0) {
      try {
        const topMember = await guild.members.fetch(sorted[0][0]);
        await topMember.roles.add(TOP_ROLE_ID);
      } catch {}
    }

    for (const id in userData) userData[id].weeklyCount = 0;
    weeklyResetAt = now + 7*24*60*60*1000;
  }

  saveData();
}, 60*1000);

