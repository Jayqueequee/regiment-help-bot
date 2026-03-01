const { Client, GatewayIntentBits } = require('discord.js');

console.log("Bot process started");

const TOKEN = process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ TOKEN is missing!");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.login(TOKEN)
  .then(() => console.log("✅ Bot login attempt sent"))
  .catch(err => console.error("❌ Bot failed to login:", err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Web server listening on port ${PORT}`));
