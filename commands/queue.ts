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
import { Song } from "../song";
import { SongStream } from "../songStream";
import {
  getVoiceConnectionInterface,
  VoiceConnectionInterface,
} from "../voiceManager";
import { memberInValidChannel } from "../util/channelChecker";

const queue: Command = {
  name: "queue",
  description: "View the current song queue",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  options: [
    {
      type: 4,
      name: "page",
      required: false,
      minValue: 1,
      description: "What page to view, default: 1",
    },
  ],
  run: async (interaction: ChatInputCommandInteraction) => {
    // Don't need to wait for this to process the rest of the command
    const loadingReply: Promise<InteractionResponse<boolean>> =
      interaction.reply({
        embeds: [createEmbed("Queue", "Loading...")],
      });

    try {
      const member: GuildMember = interaction.member as GuildMember;
      if (!memberInValidChannel(member))
        throw new BotError(
          "Queue command user not in bot voice channel",
          "You must be in a bot voice channel"
        );

      const voiceChannel: VoiceChannel = member.voice.channel as VoiceChannel;
      const connectionInterface: VoiceConnectionInterface | null =
        getVoiceConnectionInterface(voiceChannel);
      if (!connectionInterface)
        throw new BotError(
          "Queue command user not in bot voice channel",
          "You must be in a bot voice channel"
        );
      const page: number = interaction.options.getInteger("page", false) || 1;
      const current: SongStream | undefined = connectionInterface.getCurrentSongStream();
      if (!current || !current.song) {
        await loadingReply;
        await interaction.editReply({
          embeds: [createEmbed("Queue", "Nothings here")],
        });
        return;
      }

      const SONGS_PER_PAGE: number = 20;
      const songs: Song[] = connectionInterface.queue;
      const totalPageCount = Math.ceil(songs.length / SONGS_PER_PAGE) || 1;
      if (page < 1 || page > totalPageCount) {
        throw new BotError(
          "Queue command page out of range",
          `Page out of range: min: 1, max: ${totalPageCount}`
        );
      }

      const pageSongs: Song[] = songs.slice(
        (page - 1) * SONGS_PER_PAGE,
        (page - 1) * SONGS_PER_PAGE + SONGS_PER_PAGE
      );
      // need to wait for reply before we can edit it
      await loadingReply;
      if (page !== 1) {
        await interaction.editReply({
          embeds: [
            createEmbed(
              "Queue",
              `${pageSongs.reduce(
                (acc: string, { title, url }: Song, i: number) =>
                  `${acc}   *${
                    i + 1 + (page - 1) * SONGS_PER_PAGE
                  }*: [${title}](${url})\n`,
                ""
              )}\n *Page ${page} of ${totalPageCount}*`
            ),
          ],
        });
      } else {
        await interaction.editReply({
          embeds: [
            createEmbed(
              "Queue",
              `***Now Playing***: [${current.song.title}](${current.song.url}) ${
                current.resource.audioPlayer?.state.status === AudioPlayerStatus.Paused?"(*PAUSED*)":""
              }${connectionInterface.looped ? "(*LOOPED*)" : ""}
              ***Queue***:\n ${pageSongs.reduce(
                (acc: string, { title, url }: Song, i: number) =>
                  `${acc}   *${i + 1}*: [${title}](${url})\n`,
                ""
              )}\n *Page 1 of ${totalPageCount}*`),
          ],
        });
      }
    } catch (e: any) {
      if (!(e instanceof BotError)) e = new BotError(e, "Failed to get queue");
      // need to wait for reply before we can edit it
      await loadingReply;
      await interaction.editReply({
        embeds: [createBotErrorEmbed(e)],
      });
    }
  },
};

export default queue;
