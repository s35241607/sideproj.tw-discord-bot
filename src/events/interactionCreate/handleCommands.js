const { Client, Interaction } = require("discord.js");
const getLocalCommands = require("../../utils/getLocalCommands");

/**
 *
 * @param {Client} client
 * @param {Interaction} interaction
 */
module.exports = async (client, interaction) => {
  if (!interaction.isChatInputCommand()) return;
  console.log(
    `🔍 [${interaction.member.displayName}] ⌘: ${interaction.commandName}`
  );
  const localCommand = getLocalCommands();

  try {
    const commandObject = localCommand.find(
      (command) => command.name === interaction.commandName
    );
    if (!commandObject) return;

    // 檢測使用者是否有權限
    if (commandObject.permissionsRequired?.length) {
      for (const permission of commandObject.permissionsRequired) {
        if (!interaction.member.permissions.has(permission)) {
          interaction.reply({
            content: `Not enough permissions.`,
            ephemeral: true,
          });
          break;
        }
      }
    }

    // 檢測機器人是否有權限
    if (commandObject.botPermissions?.length) {
      for (const permission of commandObject.botPermissions) {
        const bot = interaction.guild.members.me;
        if (!bot.permissions.has(permission)) {
          interaction.reply({
            content: `I don't have enough permissions.`,
            ephemeral: true,
          });
          break;
        }
      }
    }

    // Run the command
    await commandObject.callback(client, interaction);
  } catch (error) {
    console.log(
      `🚨 [handleCommands] There was an error running this command: ${error}`
    );
  }
};
