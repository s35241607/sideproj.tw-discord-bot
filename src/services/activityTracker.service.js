const EventSession = require("../models/EventSession");

/**
 * 建立一場活動草稿
 * @param {Object} options
 * @param {string} options.guildId
 * @param {string} options.hostId
 * @param {string} options.channelId
 * @param {Date} options.startTime
 * @param {string} options.topic
 * @param {string} [options.description]
 * @param {string[]} [options.speakerIds]
 * @returns {Promise<{ success: boolean, data?: any }>}
 */
async function createEventDraft({
  guildId,
  hostId,
  channelId,
  topic,
  description = "",
  speakerIds = [],
}) {
  try {
    const draft = await EventSession.create({
      guildId,
      hostId,
      channelId,
      topic,
      description,
      speakerIds,
      status: "draft",
    });

    return { success: true, data: draft };
  } catch (error) {
    console.error("🚨 建立活動草稿失敗:", error);
    return { success: false };
  }
}

/**
 * 找出尚未開始的活動草稿清單（依照是否有 startTime 判斷）
 * @param {string} guildId
 * @returns {Promise<EventSession[]>}
 */
async function findTodayDraftEvents(guildId) {
  return await EventSession.find({
    guildId,
    startTime: null,
    endTime: null,
  }).sort({ createdAt: 1 });
}

module.exports = {
  createEventDraft,
  findTodayDraftEvents,
};
