const { env } = require("../../env");
const { Client, Interaction } = require("discord.js");
const Level = require("../../models/Level");
const CheckIn = require("../../models/CheckIn");
module.exports = {
  /**
   *
   * @param {Client} client
   * @param {Interaction} interaction
   */
  callback: async (client, interaction) => {
    if (!interaction.inGuild()) {
      interaction.reply("This command is only available inside a servers.");
      return;
    }
    if (interaction.guild.id !== env.DISCORD_GUILD_ID) {
      // 忽略其他伺服器
      // console.log(`interaction.guild.id: ${interaction.guild.id}`);
      // console.log(`env.GUILD_ID: ${env.DISCORD_GUILD_ID}`);
      return;
    }
    // await interaction.deferReply();

    // 取得使用者資料
    let userLevel = await Level.findOne({
      userId: interaction.member.id,
      guildId: interaction.guild.id,
    });
    let checkIn = await CheckIn.findOne({
      userId: interaction.member.id,
      guildId: interaction.guild.id,
    });

    // 檢查是否有使用者
    if (!userLevel) {
      // 沒有的話初始使用者
      userLevel = new Level({
        userId: interaction.member.id,
        guildId: interaction.guild.id,
        xp: 0,
        activity: 0,
        mileage: 0,
        level: 0,
        spExp: 0,
        spSigninCooldown: Date.now() + 60 * 60 * 1000,
      });
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    if (
      !checkIn ||
      !checkIn.lastCheckInTime ||
      checkIn.lastCheckInTime < startOfToday
    ) {
      if (!checkIn) {
        // 第一次
        checkIn = new CheckIn({
          userId: interaction.member.id,
          guildId: interaction.guild.id,
        });
      }

      checkIn.lastCheckInTime = new Date();
      await checkIn.save().catch((error) => {
        console.log(`🚨 Error saving checkIn: ${error}`);
        return;
      });

      // 設定 每次簽到的獎勵區 //
      const mileageReward = 100;
      const activityReward = 1000;
      //===================//

      userLevel.mileage += mileageReward;
      userLevel.activity += activityReward;

      await userLevel.save().catch((error) => {
        console.log(`🚨 Error saving level: ${error}`);
        return;
      });

      const user = await interaction.guild.members.fetch({
        user: interaction.member.id,
      });

      //=> 創建一個嵌入式消息
      try {
        console.log(
          `user: ${user.displayName} [ activity: ${userLevel.activity}, mileage: ${userLevel.mileage} ]`
        );

        await interaction.reply({
          content: `🏕️ 你邁出了今日的冒險第一步！\n\n🎁 獎勵內容：\n🔥 活躍值 +${activityReward}\n🛤️ 里程　 +${mileageReward}`,
          ephemeral: true, // ✅ 私人訊息，只顯示給觸發指令的人
        });

        const channelID = "1367522119818285188"; // 冒險者日誌
        const activityLogChannel =
          interaction.client.channels.cache.get(channelID);

        if (activityLogChannel && activityLogChannel.isTextBased()) {
          const displayTime = formatTaiwanTime(new Date());
          await activityLogChannel.send(
            `${displayTime} ✨【 ${user.displayName} 】已完成每日簽到！🏅`
          );
        }
        return;
      } catch (error) {
        console.log(`🚨 Error creating embed: ${error}`);
      }
    } else {
      // ❌ 已簽到
      await interaction.reply({
        content: "⚠️ 你今天已經簽到過了，明天再來吧！",
        ephemeral: true, // ✅ 私人訊息，只顯示給觸發指令的人
      });
    }
  },

  //base command data
  name: "每日簽到",
  description: "每日簽到，可以提升活躍值跟里程",
  deleted: false, // Boolean
};

function formatTaiwanTime(date) {
  const formatter = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei", // ✅ 明確指定台灣時區
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23", // ✅ 指定 24 小時制，避免出現 24:00 或上午下午
  });

  return formatter.format(date);
}
