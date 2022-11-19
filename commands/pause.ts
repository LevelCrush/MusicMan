import { AudioPlayerStatus } from "@discordjs/voice";
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
import { SongStream } from "../songStream";
import {
  getVoiceConnectionInterface,
  VoiceConnectionInterface,
} from "../voiceManager";

const skip: Command = {
  name: "pause",
  description: "pauses the current song",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  options: [],
  run: async (interaction: ChatInputCommandInteraction) => {
    // Don't need to wait for this to process the rest of the command
    const loadingReply: Promise<InteractionResponse<boolean>> =
      interaction.reply({
        embeds: [createEmbed("Pause", "Loading...")],
      });

    try {
      const member: GuildMember = interaction.member as GuildMember;
      if (
        !member.voice.channel ||
        member.voice.channel.type !== ChannelType.GuildVoice
      )
        throw new BotError(
          "Pause command user not in bot voice channel",
          "You must be in a bot voice channel"
        );

      const voiceChannel: VoiceChannel = member.voice.channel as VoiceChannel;
      const connectionInterface: VoiceConnectionInterface | null =
        getVoiceConnectionInterface(voiceChannel);
      if (!connectionInterface)
        throw new BotError(
          "Pause command user not in bot voice channel",
          "You must be in a bot voice channel"
        );

      const current: SongStream | undefined =
        await connectionInterface.getCurrentSongStream();
      if (
        !current ||
        !current.resource.audioPlayer ||
        (current.resource.audioPlayer.state.status !==
          AudioPlayerStatus.Playing &&
          current.resource.audioPlayer.state.status !==
            AudioPlayerStatus.Paused)
      )
        throw new BotError(
          "Pause command no current song",
          "Failed to Pause, there is nothing playing"
        );

      // need to wait for reply before we can edit it
      await loadingReply;
      if (current.resource.audioPlayer.state.status === AudioPlayerStatus.Paused) {
        await interaction.editReply({
          embeds: [
            createEmbed(
              "Pause",
              "Song is already Paused"
            ),
          ],
        });
      } else {
        if (!current.resource.audioPlayer.pause(true))
          throw new BotError("Failed to pause audio player", "Failed to pause song")
          await interaction.editReply({
            embeds: [
              createEmbed(
                "Pause",
                "Paused current song"
              ),
            ],
          });
      }
    } catch (e: any) {
      if (!(e instanceof BotError)) e = new BotError(e, "Failed to pause song");

      // need to wait for reply before we can edit it
      await loadingReply;
      await interaction.editReply({
        embeds: [createBotErrorEmbed(e)],
      });
    }
  },
};

export default skip;
