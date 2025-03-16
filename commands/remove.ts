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
    name: "remove",
    description: "remove a queued song",
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    options: [
      {
        type: 4,
        name: "index",
        required: true,
        minValue: 1,
        description: "The number of the song in the queue",
      },
    ],
    run: async (interaction: ChatInputCommandInteraction) => { 
      try {
        const member: GuildMember = interaction.member as GuildMember;
        if (!memberInValidChannel(member))
          throw new BotError(
            "Remove command user not in bot voice channel",
            "You must be in a bot voice channel"
          );
  
        const voiceChannel: VoiceChannel = member.voice.channel as VoiceChannel;
        const connectionInterface: VoiceConnectionInterface | null =
          getVoiceConnectionInterface(voiceChannel);
        if (!connectionInterface)
          throw new BotError(
            "Remove command user not in bot voice channel",
            "You must be in a bot voice channel"
          );
        const index: number = interaction.options.getInteger("index", true);
        const removed: Song = connectionInterface.removeSong(index);
        await interaction.reply({
          embeds: [
            createEmbed("Removed", `Removed Song: [${removed.title}](${removed.url})`),
          ],
        });
      } catch (e: any) {
        if (!(e instanceof BotError)) e = new BotError(e, "Failed to remove song");
        await interaction.reply({
          embeds: [createBotErrorEmbed(e)],
        });
      }
    },
  };
  
  export default remove;
  