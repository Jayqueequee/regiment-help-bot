# regiment_help_bot.py

import os
import discord
from discord.ext import commands, tasks
from flask import Flask
import json
import asyncio
import webserver
from datetime import datetime, timedelta

# -------------------------
# Environment variables
# -------------------------
TOKEN = os.environ.get("TOKEN")
GUILD_ID = int(os.environ.get("GUILD_ID", 0))
ROLE_ID = int(os.environ.get("ROLE_ID", 0))
TOP_ROLE_ID = int(os.environ.get("TOP_ROLE_ID", 0))

if not TOKEN or not GUILD_ID or not ROLE_ID or not TOP_ROLE_ID:
    raise ValueError("One or more environment variables are missing!")

# Discord bot setup

intents = discord.Intents.default()
intents.guilds = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

DATA_FILE = "data.json"
try:
    with open(DATA_FILE, "r") as f:
        data = json.load(f)
except FileNotFoundError:
    data = {"users": {}, "weekly_reset": str(datetime.utcnow() + timedelta(days=7))}
    
    
# Leaderboard commands

@bot.slash_command(name="leaderboard", description="Lifetime leaderboard")
async def leaderboard(ctx):
    users = data["users"]
    sorted_users = sorted(users.items(), key=lambda x: x[1].get("total", 0), reverse=True)
    text = "\n".join([f"**{i+1}.** <@{uid}> — {u['total']}" for i, (uid, u) in enumerate(sorted_users[:10])])
    await ctx.respond(f"🏆 Lifetime Leaderboard\n\n{text or 'No data.'}")

@bot.slash_command(name="weekly", description="Weekly leaderboard")
async def weekly(ctx):
    users = data["users"]
    sorted_users = sorted(users.items(), key=lambda x: x[1].get("weekly", 0), reverse=True)
    text = "\n".join([f"**{i+1}.** <@{uid}> — {u['weekly']}" for i, (uid, u) in enumerate(sorted_users[:10])])
    await ctx.respond(f"🔥 Weekly Leaderboard\n\n{text or 'No data.'}")
    

# -------------------------
# On ready
# -------------------------
@bot.event
async def on_ready():
    print(f"✅ Logged in as {bot.user}")

# -------------------------
# Save data periodically
# -------------------------
@tasks.loop(minutes=1)
async def save_loop():
    # Check weekly reset
    now = datetime.utcnow()
    weekly_reset = datetime.fromisoformat(data.get("weekly_reset"))
    if now >= weekly_reset:
        # Reset weekly counts
        for user in data["users"].values():
            user["weekly"] = 0
        # Give top role to top user
        guild = bot.get_guild(GUILD_ID)
        sorted_users = sorted(data["users"].items(), key=lambda x: x[1].get("weekly", 0), reverse=True)
        if sorted_users:
            top_member = guild.get_member(int(sorted_users[0][0]))
            if top_member:
                role = guild.get_role(TOP_ROLE_ID)
                await top_member.add_roles(role)
        data["weekly_reset"] = str(now + timedelta(days=7))
    # Save to file
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

save_loop.start()

webserver.keep_alive()
bot.run(TOKEN)