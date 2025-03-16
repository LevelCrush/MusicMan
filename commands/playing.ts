import { AudioPlayerStatus } from "@discordjs/voice";
import {
  ChatInputCommandInteraction,
  GuildMember,
  VoiceChannel,
  ChannelType,
  GatewayIntentBits,
  InteractionResponse,
  StageChannel,
} from "discord.js";
import { BotError } from "../BotError";
import { Command } from "../command";
import { createEmbed, createBotErrorEmbed } from "../messageUtilities";
import { Song } from "../song";
import { SongStream } from "../songStream";
import {
  getVoiceConnectionInterface,
  VoiceConnectionInterface,
} from "../voiceManager";
import { memberInValidChannel } from "../util/channelChecker";

const queue: Command = {
  name: "playing",
  description: "View the currently playing song",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  options: [],
  run: async (interaction: ChatInputCommandInteraction) => {
    // Don't need to wait for this to process the rest of the command
    const loadingReply: Promise<InteractionResponse<boolean>> =
      interaction.reply({
        embeds: [createEmbed("Playing", "Loading...")],
      });

    try {
      const member: GuildMember = interaction.member as GuildMember;
      if (!memberInValidChannel(member))
        throw new BotError(
          "Playing command user not in bot voice channel",
          "You must be in a bot voice channel"
        );

      const voiceChannel = member.voice.channel as VoiceChannel | StageChannel;
      const connectionInterface: VoiceConnectionInterface | null =
        getVoiceConnectionInterface(voiceChannel);
      if (!connectionInterface)
        throw new BotError(
          "Playing command user not in bot voice channel",
          "You must be in a bot voice channel"
        );

      const current: SongStream | undefined =
        connectionInterface.getCurrentSongStream();
      if (!current) {
        await loadingReply;
        await interaction.editReply({
          embeds: [
            createEmbed(
              "Playing",
              "**Nothings playing**\nUse `/play` to play something"
            ),
          ],
        });
        return;
      }

      const BAR_LENGTH: number = 20;
      const totalDuration: number = Math.round(current.song.length || 0);
      const playedDuration: number = Math.round(
        current.resource.playbackDuration / 1000
      );
      // need to wait for reply before we can edit it
      await loadingReply;
      if (totalDuration === 0) {
        const progressBar = `[${"x".repeat(BAR_LENGTH)}]`;
        await interaction.editReply({
          embeds: [
            createEmbed(
              "Playing",
              `[${current.song.title}](${current.song.url})
          ***Played***: ${playedDuration}*s* ${
                current.resource.audioPlayer?.state.status ===
                AudioPlayerStatus.Paused
                  ? "(*PAUSED*)"
                  : ""
              }${connectionInterface.looped ? "(*LOOPED*)" : ""}
          **${progressBar}**`,
              current.song.thumbnail?.href
            ),
          ],
        });
      } else {
        const filledAmount = Math.round(
          (playedDuration / totalDuration) * BAR_LENGTH
        );
        const progressBar = `[${"=".repeat(filledAmount)}${"-".repeat(
          BAR_LENGTH - filledAmount
        )}]`;
        await interaction.editReply({
          embeds: [
            createEmbed(
              "Playing",
              `[${current.song.title}](${current.song.url})
          ***Played***: ${playedDuration}*s*/${totalDuration}*s* ${
                current.resource.audioPlayer?.state.status ===
                AudioPlayerStatus.Paused
                  ? "(*PAUSED*)"
                  : ""
              }${connectionInterface.looped ? "(*LOOPED*)" : ""}
          **${progressBar}**`,
              current.song.thumbnail?.href
            ),
          ],
        });
      }
    } catch (e: any) {
      if (!(e instanceof BotError))
        e = new BotError(e, "Failed to get current song");
      // need to wait for reply before we can edit it
      await loadingReply;
      await interaction.editReply({
        embeds: [createBotErrorEmbed(e)],
      });
    }
  },
};

export default queue;
