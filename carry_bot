# carry_bot.py
# Carry Tracking Discord Bot with Leaderboard

import os
import discord
from discord.ext import commands, tasks
import json
from datetime import datetime, timedelta

# -------------------------
# Environment variables
# -------------------------
TOKEN = os.environ.get("TOKEN")
GUILD_ID = int(os.environ.get("GUILD_ID", 0))
CARRIER_ROLE_ID = int(os.environ.get("CARRIER_ROLE_ID", 0))
CARRIER_OF_WEEK_ROLE_ID = int(os.environ.get("CARRIER_OF_WEEK_ROLE_ID", 0))

if not TOKEN or not GUILD_ID or not CARRIER_ROLE_ID or not CARRIER_OF_WEEK_ROLE_ID:
    raise ValueError("One or more environment variables are missing!")

# Discord bot setup
intents = discord.Intents.default()
intents.guilds = True
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)

DATA_FILE = "carry_data.json"
try:
    with open(DATA_FILE, "r") as f:
        data = json.load(f)
except FileNotFoundError:
    data = {
        "users": {},
        "weekly_reset": str(datetime.utcnow() + timedelta(days=7)),
        "last_carrier_of_week": None
    }

# -------------------------
# Custom Views (Buttons)
# -------------------------
class CarryView(discord.ui.View):
    def __init__(self, carrier_id):
        super().__init__(timeout=None)
        self.carrier_id = carrier_id

    @discord.ui.button(label="Log Carry", style=discord.ButtonStyle.green, emoji="🎯")
    async def log_carry(self, interaction: discord.Interaction, button: discord.ui.Button):
        user_id = str(interaction.user.id)
        now = datetime.utcnow()

        # Validate: User cannot carry themselves
        if interaction.user.id == self.carrier_id:
            await interaction.response.send_message(
                "❌ You can't log a carry for yourself!",
                ephemeral=True
            )
            return

        # Initialize user if not exists
        if user_id not in data["users"]:
            data["users"][user_id] = {
                "total": 0,
                "weekly": 0,
                "last_carry": None,
                "24h_carries": 0,
                "24h_reset_time": None,
                "carrier_role_expiry": None
            }

        user_data = data["users"][user_id]

        # Check cooldown (10 minutes)
        if user_data["last_carry"]:
            last_carry_time = datetime.fromisoformat(user_data["last_carry"])
            if now - last_carry_time < timedelta(minutes=10):
                remaining = timedelta(minutes=10) - (now - last_carry_time)
                await interaction.response.send_message(
                    f"⏱️ You can log another carry in {remaining.seconds // 60} minutes!",
                    ephemeral=True
                )
                return

        # Check 24h carry reset
        if user_data["24h_reset_time"]:
            reset_time = datetime.fromisoformat(user_data["24h_reset_time"])
            if now >= reset_time:
                user_data["24h_carries"] = 0
                user_data["24h_reset_time"] = None
        else:
            user_data["24h_reset_time"] = str(now + timedelta(hours=24))

        # Increment carries
        user_data["total"] += 1
        user_data["weekly"] += 1
        user_data["24h_carries"] += 1
        user_data["last_carry"] = str(now)

        # Check if user earned carrier role (3 carries in 24h)
        guild = bot.get_guild(GUILD_ID)
        if user_data["24h_carries"] == 3 and not user_data["carrier_role_expiry"]:
            member = guild.get_member(interaction.user.id)
            role = guild.get_role(CARRIER_ROLE_ID)
            if member and role:
                await member.add_roles(role)
                user_data["carrier_role_expiry"] = str(now + timedelta(hours=24))
                await interaction.response.send_message(
                    f"🏆 <@{user_id}> has reached **Carrier** status! (3 carries in 24h)",
                    ephemeral=False
                )
            else:
                await interaction.response.send_message(
                    f"⚠️ Carry logged but couldn't assign role. Check bot permissions.",
                    ephemeral=True
                )
        else:
            await interaction.response.send_message(
                f"✅ Carry logged! **{user_data['24h_carries']}/3** carries this 24h cycle\n"
                f"Total carries: **{user_data['total']}** | Weekly: **{user_data['weekly']}**",
                ephemeral=True
            )

        # Save data
        save_data()

# -------------------------
# Slash Commands
# -------------------------
@bot.tree.command(name="leaderboard", description="View the carry leaderboard")
async def leaderboard(interaction: discord.Interaction):
    """Shows lifetime and weekly carry leaderboards"""
    users = data["users"]
    
    if not users:
        await interaction.response.send_message("No carrier data yet.")
        return

    # Lifetime leaderboard
    sorted_lifetime = sorted(users.items(), key=lambda x: x[1].get("total", 0), reverse=True)
    lifetime_text = "\n".join(
        [f"**{i+1}.** <@{uid}> — {u.get('total', 0)} carries"
         for i, (uid, u) in enumerate(sorted_lifetime[:10])]
    )

    # Weekly leaderboard
    sorted_weekly = sorted(users.items(), key=lambda x: x[1].get("weekly", 0), reverse=True)
    weekly_text = "\n".join(
        [f"**{i+1}.** <@{uid}> — {u.get('weekly', 0)} carries"
         for i, (uid, u) in enumerate(sorted_weekly[:10])]
    )

    # Create embed with both leaderboards
    embed = discord.Embed(title="📊 Carrier Leaderboards", color=discord.Color.gold())
    embed.add_field(name="🏆 Lifetime Top 10", value=lifetime_text, inline=False)
    embed.add_field(name="🔥 Weekly Top 10", value=weekly_text, inline=False)
    
    await interaction.response.send_message(embed=embed)

# -------------------------
# Helper function
# -------------------------
def save_data():
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

# -------------------------
# On ready
# -------------------------
@bot.event
async def on_ready():
    print(f"✅ Logged in as {bot.user}")
    await bot.tree.sync()
    print("📋 Slash commands synced")
    maintenance_loop.start()

# -------------------------
# Background tasks
# -------------------------
@tasks.loop(minutes=1)
async def maintenance_loop():
    """Check for role expirations and weekly resets"""
    now = datetime.utcnow()
    guild = bot.get_guild(GUILD_ID)
    
    if not guild:
        return

    # Check individual carrier role expirations
    for user_id_str, user_data in data["users"].items():
        if user_data.get("carrier_role_expiry"):
            expiry = datetime.fromisoformat(user_data["carrier_role_expiry"])
            if now >= expiry:
                member = guild.get_member(int(user_id_str))
                if member:
                    role = guild.get_role(CARRIER_ROLE_ID)
                    if role:
                        try:
                            await member.remove_roles(role)
                        except:
                            pass
                
                user_data["carrier_role_expiry"] = None
                user_data["24h_carries"] = 0
                user_data["24h_reset_time"] = None

    # Check weekly reset
    weekly_reset = datetime.fromisoformat(data.get("weekly_reset"))
    if now >= weekly_reset:
        sorted_users = sorted(
            data["users"].items(),
            key=lambda x: x[1].get("weekly", 0),
            reverse=True
        )

        # Remove old carrier of week role
        if data.get("last_carrier_of_week"):
            old_carrier = guild.get_member(int(data["last_carrier_of_week"]))
            if old_carrier:
                role = guild.get_role(CARRIER_OF_WEEK_ROLE_ID)
                if role:
                    try:
                        await old_carrier.remove_roles(role)
                    except:
                        pass

        # Assign new carrier of week
        if sorted_users and sorted_users[0][1].get("weekly", 0) > 0:
            top_carrier_id = int(sorted_users[0][0])
            top_carrier = guild.get_member(top_carrier_id)
            
            if top_carrier:
                role = guild.get_role(CARRIER_OF_WEEK_ROLE_ID)
                if role:
                    try:
                        await top_carrier.add_roles(role)
                        data["last_carrier_of_week"] = str(top_carrier_id)
                        
                        # Announce carrier of the week
                        embed = discord.Embed(
                            title="🌟 Carrier of the Week!",
                            description=f"<@{top_carrier_id}> is this week's **Carrier of the Week**!\n\n"
                                       f"Weekly carries: **{sorted_users[0][1].get('weekly', 0)}**",
                            color=discord.Color.purple()
                        )
                        
                        for channel in guild.text_channels:
                            if "general" in channel.name.lower() or "announcements" in channel.name.lower():
                                try:
                                    await channel.send(embed=embed)
                                    break
                                except:
                                    pass
                    except:
                        pass

        # Reset weekly counts
        for user in data["users"].values():
            user["weekly"] = 0

        data["weekly_reset"] = str(now + timedelta(days=7))

    save_data()

# -------------------------
# Run the bot
# -------------------------
if __name__ == "__main__":
    bot.run(TOKEN)
