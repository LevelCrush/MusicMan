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
import {
  getVoiceConnectionInterface,
  VoiceConnectionInterface,
} from "../voiceManager";
import { memberInValidChannel } from "../util/channelChecker";

const skip: Command = {
  name: "skip",
  description: "skips songs",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  options: [
    {
      type: 4,
      name: "count",
      required: false,
      minValue: 1,
      description: "How many songs to skip, default: 1",
    },
  ],
  run: async (interaction: ChatInputCommandInteraction) => {
    // Don't need to wait for this to process the rest of the command
    const loadingReply: Promise<InteractionResponse<boolean>> =
      interaction.reply({
        embeds: [createEmbed("Skip", "Loading...")],
      });

    try {
      const member: GuildMember = interaction.member as GuildMember;
      if (!memberInValidChannel(member))
        throw new BotError(
          "Skip command user not in bot voice channel",
          "You must be in a bot voice channel"
        );

      const voiceChannel: VoiceChannel = member.voice.channel as VoiceChannel;
      const connectionInterface: VoiceConnectionInterface | null =
        getVoiceConnectionInterface(voiceChannel);
      if (!connectionInterface)
        throw new BotError(
          "Skip command user not in bot voice channel",
          "You must be in a bot voice channel"
        );
      const count: number = interaction.options.getInteger("count", false) || 1;
      await connectionInterface.skipSongs(count);
      // need to wait for reply before we can edit it
      await loadingReply;
      await interaction.editReply({
        embeds: [
          createEmbed("Skip", `${count} Song${count > 1 ? "s" : ""} skipped`),
        ],
      });
    } catch (e: any) {
      if (!(e instanceof BotError)) e = new BotError(e, "Failed to skip songs");

      // need to wait for reply before we can edit it
      await loadingReply;
      await interaction.editReply({
        embeds: [createBotErrorEmbed(e)],
      });
    }
  },
};

export default skip;
