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
  name: "loop",
  description: "loops the current song queue",
  intents: [GatewayIntentBits.Guilds],
  options: [],
  run: async (interaction: ChatInputCommandInteraction) => {
    // Don't need to wait for this to process the rest of the command
    const loadingReply: Promise<InteractionResponse<boolean>> =
      interaction.reply({
        embeds: [createEmbed("Loop", "Loading...")],
      });

    try {
      const member: GuildMember = interaction.member as GuildMember;
      if (!memberInValidChannel(member))
        throw new BotError(
          "Loop command user not in bot voice channel",
          "You must be in a bot voice channel"
        );

      const voiceChannel: VoiceChannel = member.voice.channel as VoiceChannel;
      const connectionInterface: VoiceConnectionInterface | null =
        getVoiceConnectionInterface(voiceChannel);
      if (!connectionInterface)
        throw new BotError(
          "Loop command user not in bot voice channel",
          "You must be in a bot voice channel"
        );

      // need to wait for reply before we can edit it
      await loadingReply;
      if (connectionInterface.looped) {
        await interaction.editReply({
          embeds: [
            createEmbed(
              "Loop",
              "Queue already looped"
            ),
          ],
        });
      } else {
        connectionInterface.looped = true;
        await interaction.editReply({
          embeds: [
            createEmbed(
              "Loop",
              "Looped queue"
            ),
          ],
        });
      }
    } catch (e: any) {
      if (!(e instanceof BotError)) e = new BotError(e, "Failed to loop queue");

      // need to wait for reply before we can edit it
      await loadingReply;
      await interaction.editReply({
        embeds: [createBotErrorEmbed(e)],
      });
    }
  },
};

export default skip;
