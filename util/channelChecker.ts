import { ChannelType, GuildMember } from "discord.js";

const allowedChannelTypes = [
  ChannelType.GuildVoice,
  ChannelType.GuildStageVoice,
];

export function inValidChannel(member: GuildMember) {
  return member.voice.channel && allowedChannelTypes.includes(member.voice.channel.type);
}
