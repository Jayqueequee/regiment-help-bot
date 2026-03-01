console.log("TOKEN is", process.env.TOKEN ? "SET" : "MISSING");
console.log("CLIENT_ID is", process.env.CLIENT_ID ? "SET" : "MISSING");
console.log("GUILD_ID is", process.env.GUILD_ID ? "SET" : "MISSING");

const {
  Client,
  GatewayIntentBits,
  Events,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const express = require("express");
const fs = require("fs");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const TOP_ROLE_ID = process.env.TOP_ROLE_ID;

const QUOTA = 3;
const COOLDOWN = 15 * 60 * 1000;
const ROLE_DURATION = 24 * 60 * 60 * 1000;
const WEEK_DURATION = 7 * 24 * 60 * 60 * 1000;

const DATA_FILE = './data.json';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

let userData = {};
let weeklyResetAt = Date.now() + WEEK_DURATION;

if (fs.existsSync(DATA_FILE)) {
  const saved = JSON.parse(fs.readFileSync(DATA_FILE));
  userData = saved.userData || {};
  weeklyResetAt = saved.weeklyResetAt || weeklyResetAt;
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({
    userData,
    weeklyResetAt
  }, null, 2));
}

const commands = [
  new SlashCommandBuilder().setName('leaderboard').setDescription('Lifetime leaderboard'),
  new SlashCommandBuilder().setName('weekly').setDescription('Weekly leaderboard')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

setInterval(async () => {
  const now = Date.now();
  const guild = await client.guilds.fetch(GUILD_ID);

  for (const userId in userData) {
    const data = userData[userId];

    if (data.roleExpiresAt && now >= data.roleExpiresAt) {
      try {
        const member = await guild.members.fetch(userId);
        await member.roles.remove(ROLE_ID);
      } catch {}
      data.roleExpiresAt = null;
    }

    if (data.cycleResetAt && now >= data.cycleResetAt) {
      data.cycleCount = 0;
      data.cycleResetAt = null;
    }
  }

  if (now >= weeklyResetAt) {

    const sorted = Object.entries(userData)
      .sort((a, b) => b[1].weeklyCount - a[1].weeklyCount);

    const members = await guild.members.fetch();

    members.forEach(async member => {
      if (member.roles.cache.has(TOP_ROLE_ID)) {
        await member.roles.remove(TOP_ROLE_ID).catch(() => {});
      }
    });

    if (sorted.length > 0 && sorted[0][1].weeklyCount > 0) {
      try {
        const topMember = await guild.members.fetch(sorted[0][0]);
        await topMember.roles.add(TOP_ROLE_ID);
      } catch {}
    }

    for (const id in userData) {
      userData[id].weeklyCount = 0;
    }

    weeklyResetAt = now + WEEK_DURATION;
  }

  saveData();
}, 60 * 1000);

client.on(Events.InteractionCreate, async interaction => {

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'leaderboard') {
      const sorted = Object.entries(userData)
        .sort((a, b) => b[1].totalCount - a[1].totalCount)
        .slice(0, 10);

      const text = sorted.map(([id, data], i) =>
        `**${i+1}.** <@${id}> — ${data.totalCount}`
      ).join('\n') || "No data.";

      return interaction.reply(`🏆 Lifetime Leaderboard\n\n${text}`);
    }

    if (interaction.commandName === 'weekly') {
      const sorted = Object.entries(userData)
        .sort((a, b) => b[1].weeklyCount - a[1].weeklyCount)
        .slice(0, 10);

      const text = sorted.map(([id, data], i) =>
        `**${i+1}.** <@${id}> — ${data.weeklyCount}`
      ).join('\n') || "No data.";

      return interaction.reply(`🔥 Weekly Leaderboard\n\n${text}`);
    }
  }
});

try {
  client.login(TOKEN)
    .then(() => console.log("✅ Bot login attempt sent"))
    .catch(err => console.error("❌ Bot failed to login:", err));
} catch(err) {
  console.error("❌ Unexpected error during login:", err);
}

const app = express();
app.get("/", (req, res) => res.send("Bot running"));

app.listen(process.env.PORT || 3000);

