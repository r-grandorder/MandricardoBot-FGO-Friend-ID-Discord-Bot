const { EmbedBuilder } = require("discord.js");
const client = require("../../index");
const config = require("../../config/config.js");
const util = require("../../utility/util.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB({ filePath: "db/db.sqlite" });
const PAGE_COUNT = config.SupportPages.PAGE_COUNT;

module.exports = {
  name: "interactionCreate"
};

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) { // Persistent profile pagination buttons:
    if (!util.isProfilePaginationId(interaction.customId)) return;

    try {
      await util.handlePaginationButton(client, interaction, db, PAGE_COUNT);
    } catch (e) {
      console.error('[PAGINATION]', e);
    }
    return;
  }

  if (interaction.isChatInputCommand()) {
    const command = client.slash_commands.get(interaction.commandName);

    if (!command) return;

    try {
      command.run(client, interaction, config, db);
    } catch (e) {
      console.error(e)
    };
  };

  if (interaction.isUserContextMenuCommand()) { // User:
    const command = client.user_commands.get(interaction.commandName);

    if (!command) return;

    try {
      command.run(client, interaction, config, db);
    } catch (e) {
      console.error(e)
    };
  };

  if (interaction.isMessageContextMenuCommand()) { // Message:
    const command = client.message_commands.get(interaction.commandName);

    if (!command) return;

    try {
      command.run(client, interaction, config, db);
    } catch (e) {
      console.error(e)
    };
  };

  if (interaction.isModalSubmit()) { // Modals:
    const modal = client.modals.get(interaction.customId);

    if (!modal) return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription('Something went wrong... Probably the Modal ID is not defined in the modals handler.')
          .setColor('Red')
      ],
      ephemeral: true
    });

    try {
      modal.run(client, interaction, config, db);
    } catch (e) {
      console.error(e)
    };
  }
});

