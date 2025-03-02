const { env } = require("../../env");
const {
  Client,
  Interaction,
} = require("discord.js");
const Level = require("../../models/Level");
const SigninLog = require("../../models/SigninLog");
const SP_HOUR = 23 - 8; // 23:00
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
    // 檢查是否在冷卻中
    console.log('user: ',userLevel);
    // 打卡時間一小時內不可重複打卡
    if(!userLevel){
      userLevel = new Level({
        userId: interaction.member.id,
        guildId: interaction.guild.id,
        xp: 0,
        level: 0,
        spExp: 0,
        spSigninCooldown: Date.now() + 60 * 60 * 1000,
      });
    } else {
      if (userLevel.spSigninCooldown > Date.now()) {
        try {
          await interaction.reply(`您已經打卡過了!請做滿一小時再打卡!`);
          return;
        } catch (error) {
          console.log(`🚨 Error creating embed: ${error}`);
        }
        return;
      } else {
        userLevel.spSigninCooldown = Date.now() + 60 * 60 * 1000;
      }
    }
    // 檢查上次打卡團隊加成
    let lastSignin = await SigninLog.findOne({
      userId: interaction.member.id,
      guildId: interaction.guild.id,
    }).sort({ startTime: -1 });
    let sameTimeSignins = 0;
    let teamExp = 0;
    if(lastSignin){
      sameTimeSignins = await SigninLog.countDocuments({
        userId: { $ne: interaction.member.id },
        guildId: interaction.guild.id,
        endTime: { $gt: lastSignin.startTime }, 
        startTime: { $lt: lastSignin.endTime },
      });
      console.log(`sameTimeSignins: ${sameTimeSignins}`);
      if(sameTimeSignins > 1){
        let multiple = 1;
        //如果打卡時間為23:00，獲得兩倍經驗
        const hr = lastSignin.startTime.getHours();
        console.log(`last signin hr: ${hr}`);
        if(hr === SP_HOUR){
          multiple = 2;
        }
        teamExp = sameTimeSignins * 5 * multiple;
        userLevel.spExp += teamExp;
      }
    }

    // 給予本次打卡經驗值
    let exp = 100;
    let replyString = `打卡開始進行Side Project, 獲得 ${exp} SP經驗!`
    let date = new Date();
    let hour = date.getHours();
    // console.log(`hour: ${hour}`);
    // 如果在sp hour 打卡獲得200exp
    console.log(`hour: ${hour}, spHour: ${SP_HOUR}`);
    if (hour === SP_HOUR) {
      exp = 200;
      replyString = `打卡開始進行Side Project,在SP hour打卡經驗值兩倍! 獲得 ${exp} SP經驗!`;
    }
    userLevel.spExp += exp;
    await userLevel.save().catch((error) => {
      console.log(`🚨 Error saving level: ${error}`);
      return;
    });
    if(sameTimeSignins){
      replyString += `\n上次打卡組隊人數: ${sameTimeSignins}, 額外獲得團隊加成獎勵 ${teamExp} SP經驗!`;
    }
    // 寫入打卡紀錄
    const signinLog = new SigninLog({
      userId: interaction.member.id,
      guildId: interaction.guild.id,
      startTime: Date.now(),
      endTime: Date.now() + 60 * 60 * 1000,
    });
    await signinLog.save().catch((error) => {
      console.log(`🚨 Error saving signin log: ${error}`);
      return;
    });
    //=> 創建一個嵌入式消息
    // console.log(`replyString: ${replyString}`);
    try {
      await interaction.reply(replyString);
      return;
    } catch (error) {
      console.log(`🚨 Error creating embed: ${error}`);
    }
  },

  //base command data
  name: "打卡",
  description: "打卡開始進行Side Project",
  deleted: false, // Boolean
};
