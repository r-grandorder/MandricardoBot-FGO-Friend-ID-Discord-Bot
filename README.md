# FGO Friend ID Discord bot 
A Discord bot project for saving FGO profile for easy sharing using the latest DiscordJS V14 (as of this writing). <br>

## Requirements

• **Node.js v16.9.0 or above.** <a href="https://nodejs.org/en/"><img src="https://img.shields.io/badge/v16.9.0-100000?style=flat&logo=node.js&label=Node.js&color=blue&logoColor=lime"></a><br>
• **Discord.js v14.3.0 or above**. <a href="https://www.npmjs.com/package/discord.js"><img src="https://img.shields.io/badge/v14.3.0-100000?style=flat&logo=npm&label=Discord.js&color=blue"></a>

### - Creating a new client and inviting the bot:
• 1- Go to [Discord Developer Portal](https://discord.com/developers) and then go to `Applications`. <br>
• 2- Create a new application and choose it's name. <br>
• 3- Put your application's avatar (not important).<br>
• 4- Go to `Bot` section and turn your application into a bot. <br>
• 5- This bot uses **slash commands**, so **no Privileged Gateway Intents are required**. You can leave `PRESENCE INTENT`, `SERVER MEMBERS INTENT`, and `MESSAGE CONTENT INTENT` **disabled**.<br>
• 6- Go to `OAuth2` section, and then `URL Generator`. Select the scopes `bot` and `application.commands`, and then scroll down to **Bot Permissions**, select `Administrator` (For all guild permissions). Copy the link that is generated below, open a new browser tab, paste the URL, choose a server where your bot will be in, verify yourself that you are not a robot, and Done!

## Instructions
1. Rename `config.js.example` to ``config.js` under `config/` directory. 
2. Correctly fill out the fields, note the `MONGO` field is unused in this project, instead an SQLite DB is instantiated and used via the QuickDB package.

## Commands
All interaction is via **slash commands** (no message-content prefix commands). Commands are registered globally on startup, which can take a short while to appear after first run.

| Command | What it does |
| --- | --- |
| `/en-profile [user]` | View a saved FGO **EN** profile — yours, or another player's if `user` is given. |
| `/jp-profile [user]` | View a saved FGO **JP** profile. |
| `/en-profile-edit` | Save/edit your **EN** profile. Options: `name` (IGN), `id` (Friend ID), `description` (a short note shown below IGN/Friend ID), `clear_description` (remove that note), `privacy`, `support1`…`supportN` image uploads (one per page), and `clear_supports` (page number(s) to remove, e.g. `1,3` or `all`). |
| `/jp-profile-edit` | Save/edit your **JP** profile (same options). |
| `/en-profile-edit-support` | Set one **EN** support page: `page` (required) + an `image` upload **or** an image `url`. |
| `/jp-profile-edit-support` | Set one **JP** support page (same options). |

The number of support pages is controlled by `SupportPages.PAGE_COUNT` in `config.js`.

To remove content: clear your description with `clear_description`, and remove support pages with `clear_supports` (one number, a list like `1,3`, or `all`). Both live on the `*-profile-edit` commands. The `*-edit-support` commands only set a page. Empty pages are skipped in the paginated view.

## Run bot in a shell:

```sh
npm i
node index.js
```

## Run bot in docker:
Note since a `config.js` file is required containing your Discord bot's tokens, you have to adjust Dockerfile accordingly if you want to publish a Docker image.

* Edit `docker-compose.yml` volume from `/path/to/volume` to the correct location you want the bot's database to presist it

```sh
docker compose up
```
### Remote deployment of Docker image
* To build an image and deploy in a remote machine (change `~/` to another path if required)

```sh
sudo docker build . -t discord-bot
sudo docker save -o ~/discord-bot.tar discord-bot
```

* Copy `discord-bot.tar` to remote machine 

```sh
sudo docker load -i /path/to/tar/discord-bot.tar
```

Can deploy bot accordingly after.

# Credits and Special thanks to the following:
[DiscordJS V14 Bot Template Project originally coded by: **T.F.A#7524**](https://github.com/SaberDirewolf/DiscordJS-V14-Bot-Template) <br>
[discordjs-pagination by acegoal07](https://github.com/acegoal07/discordjs-pagination) <br>
[nobuBot by aister](https://github.com/aister/nobuBot) <br>
[Linux-str_replace tool by Samer-Al-iraqi](https://github.com/Samer-Al-iraqi/Linux-str_replace) <br>
