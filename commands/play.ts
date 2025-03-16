import { ChatInputCommandInteraction, GuildMember, VoiceChannel, ChannelType, GatewayIntentBits, InteractionResponse } from "discord.js";
import { BotError } from "../BotError";
import { Command } from "../command";
import { createEmbed, createBotErrorEmbed } from "../messageUtilities";
import { Song } from "../song";
import { getSongs } from "../songResolver";
import { createVoiceConnectionInterface, VoiceConnectionInterface } from "../voiceManager";
import { memberInValidChannel } from "../util/channelChecker";
import { StageChannel } from "discord.js";




const play: Command = {
  name: "play",
  description: "Play song in VC",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  options: [
    {
      type: 3,
      name: "song",
      required: true,
      minLength: 3,
      maxLength: 4000,
      description: "URL or Search Input",
    },
    {
      type: 5,
      name: "skip",
      required: false,
      description: "Add the songs at the front of the queue, default: false",
    },
  ],
  run: async (interaction: ChatInputCommandInteraction) => {
    // Don't need to wait for this to process the rest of the command
    const loadingReply: Promise<InteractionResponse<boolean>> = interaction.reply({
      embeds: [createEmbed("Play", "Loading...")],
    });

    try {
      const member: GuildMember = interaction.member as GuildMember;
      
      if (!memberInValidChannel(member))
        throw new BotError("play command user not in voice channel", "You must be in a voice channel");

      const voiceChannel = member.voice.channel as VoiceChannel | StageChannel;
      if (!voiceChannel.joinable)
        throw new BotError("play command user voice channel not joinable", "Can not join voice channel");

      

      const connectionInterface: VoiceConnectionInterface = await createVoiceConnectionInterface(voiceChannel);
      const songs: Song[] = await getSongs(
        interaction.options.get("song", true).value as string
      );
      const skip: boolean = interaction.options.getBoolean("skip", false) || false;
      await connectionInterface.queueSong(songs, skip);
      // need to wait for reply before we can edit it
      await loadingReply;
      if (songs.length <= 10) {
        await interaction.editReply({
          embeds: [createEmbed("Play", songs.reduce((acc: string, { title, url }: Song) => `${acc}[${title}](${url})\n`, ""), songs[0].thumbnail?.href)],
        });
      } else {
        const subSongs: Song[] = songs.slice(0, 10);
        await interaction.editReply({
          embeds: [createEmbed("Play", `${subSongs.reduce((acc: string, { title, url }: Song) => `${acc}[${title}](${url})\n`, "")}*+${songs.length - subSongs.length} more*`, songs[0].thumbnail?.href)],
        });
      }
    } catch (e: any) {
      if (!(e instanceof BotError))
        e = new BotError(e, "Failed to play song");

      // need to wait for reply before we can edit it
      await loadingReply;
      await interaction.editReply({
        embeds: [createBotErrorEmbed(e)]
      });
    }
  },
};

export default play;