import {
  ChatInputCommandInteraction,
  GuildMember,
  VoiceChannel,
  ChannelType,
  GatewayIntentBits,
  InteractionResponse,
} from "discord.js";
import { BotError } from "../BotError";
import { Command } from "../command";
import { createEmbed, createBotErrorEmbed } from "../messageUtilities";
import { Song } from "../song";
import {
  getVoiceConnectionInterface,
  VoiceConnectionInterface,
} from "../voiceManager";
import { memberInValidChannel } from "../util/channelChecker";

const remove: Command = {
  name: "stop",
  description: "stop playing and clear the queue",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  run: async (interaction: ChatInputCommandInteraction) => {
    // Don't need to wait for this to process the rest of the command
    const loadingReply: Promise<InteractionResponse<boolean>> =
      interaction.reply({
        embeds: [createEmbed("Stop", "Loading...")],
      });

    try {
      const member: GuildMember = interaction.member as GuildMember;
      if (!memberInValidChannel(member))
        throw new BotError(
          "Stop command user not in bot voice channel",
          "You must be in a bot voice channel"
        );

      const voiceChannel: VoiceChannel = member.voice.channel as VoiceChannel;
      const connectionInterface: VoiceConnectionInterface | null =
        getVoiceConnectionInterface(voiceChannel);
      if (!connectionInterface)
        throw new BotError(
          "Stop command user not in bot voice channel",
          "You must be in a bot voice channel"
        );
      await connectionInterface.stopSongs();
      // need to wait for reply before we can edit it
      await loadingReply;
      await interaction.editReply({
        embeds: [createEmbed("Stop", `Stopped!`)],
      });
    } catch (e: any) {
      if (!(e instanceof BotError))
        e = new BotError(e, "Failed to remove song");
      // need to wait for reply before we can edit it
      await loadingReply;
      await interaction.editReply({
        embeds: [createBotErrorEmbed(e)],
      });
    }
  },
};

export default remove;
