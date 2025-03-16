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
import { memberInValidChannel } from "../util/channelChecker";

const skip: Command = {
  name: "resume",
  description: "resumes the current song",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  options: [],
  run: async (interaction: ChatInputCommandInteraction) => {
    // Don't need to wait for this to process the rest of the command
    const loadingReply: Promise<InteractionResponse<boolean>> =
      interaction.reply({
        embeds: [createEmbed("Resume", "Loading...")],
      });

    try {
      const member: GuildMember = interaction.member as GuildMember;
      if (!memberInValidChannel(member))
        throw new BotError(
          "Resume command user not in bot voice channel",
          "You must be in a bot voice channel"
        );

      const voiceChannel: VoiceChannel = member.voice.channel as VoiceChannel;
      const connectionInterface: VoiceConnectionInterface | null =
        getVoiceConnectionInterface(voiceChannel);
      if (!connectionInterface)
        throw new BotError(
          "Resume command user not in bot voice channel",
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
          "Resume command no current song",
          "Failed to Pause, there is nothing playing"
        );

      // need to wait for reply before we can edit it
      await loadingReply;
      if (current.resource.audioPlayer.state.status === AudioPlayerStatus.Playing) {
        await interaction.editReply({
          embeds: [
            createEmbed(
              "Resume",
              "Song is already Playing"
            ),
          ],
        });
      } else {
        if (!current.resource.audioPlayer.unpause())
          throw new BotError("Failed to unpause audio player", "Failed to resume song")
          await interaction.editReply({
            embeds: [
              createEmbed(
                "Resume",
                "Playing current song"
              ),
            ],
          });
      }
    } catch (e: any) {
      if (!(e instanceof BotError)) e = new BotError(e, "Failed to resume song");

      // need to wait for reply before we can edit it
      await loadingReply;
      await interaction.editReply({
        embeds: [createBotErrorEmbed(e)],
      });
    }
  },
};

export default skip;
