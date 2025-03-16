import { GatewayIntentBits, REST, Routes } from "discord.js";
import commandTI from "./command-ti";
import { createCheckers } from "ts-interface-checker";
import { Command, CommandName } from "./command";
import { promises as fs, constants as fsConstants } from "fs";
import { join } from "path";
import { config } from "./configuration";

type CommandEntry = {
  [name: CommandName]: Command;
};

const commandsPath: string = join(__dirname, "commands");
const registeredCommands: CommandEntry = {};
const loadedCommandFiles: string[] = [];

export const validateCommand = (cmd: Command): boolean => {
  const { Command } = createCheckers(commandTI);
  try {
    Command.check(cmd);
    return true;
  } catch (e: any) {
    console.warn(`Failed to validate command: ${cmd}`);
    console.warn(e.toString());
    return false;
  }
};

export const registerCommand = (cmd: Command): boolean => {
  if (!validateCommand(cmd)) {
    console.warn(`Failed to register invalid command object: ${cmd}`);
    return false;
  }

  if (registeredCommands.hasOwnProperty(cmd.name)) {
    console.warn(`Failed to register command "${cmd.name}"`);
    console.warn(`Command with name "${cmd.name}" already registered`);
    return false;
  }

  registeredCommands[cmd.name] = cmd;
  return true;
};

export const loadCommands = async () => {
  const exits: boolean = await fs
    .access(commandsPath, fsConstants.R_OK)
    .then((): boolean => true)
    .catch((): boolean => false);
  if (!exits) {
    console.warn(
      `Failed to load commands, Failed to read "${commandsPath}" dir`
    );
    return;
  }

  const files: string[] = await fs.readdir(commandsPath);
  await Promise.allSettled(
    files
      .filter(
        (file: string): boolean => file.endsWith(".ts") || file.endsWith(".js")
      )
      .map(async (file: string): Promise<void> => {
        file = join(commandsPath, file);
        console.log(`Found Command File (using): ${file}`);
        try {
          const module: any = await import(file);
          if (
            !module ||
            !module.default ||
            Object.keys(module.default).length === 0
          ) {
            console.warn(`Invalid command file: ${file}, no default export`);
            return;
          }

          const cmd: Command = (module.default.default ? module.default.default : module.default) as Command;
          registerCommand(cmd);
        } catch (e: any) {
          console.warn(`Failed to import command file: ${file}`);
          console.warn(e.toString());
        }

        loadedCommandFiles.push(file);
      })
  );
};

export const getCommandGatewayIntentBits = (): GatewayIntentBits[] => {
  const allIntents: GatewayIntentBits[] = Object.values(registeredCommands)
    .map((cmd: Command) => cmd.intents)
    .flat();
  // remove duplicates
  return [...new Set(allIntents)];
};

export const getCommand = (name: CommandName): Command | null => {
  if (registeredCommands.hasOwnProperty(name)) return registeredCommands[name];
  return null;
};

export const publishSlashCommands = async (token: string, clientId: string) => {
  try {
    const rest: REST = new REST({ version: "10" }).setToken(token);
    // strip "run" and "intents" from command object
    const body: any[] = Object.values(registeredCommands).map(
      ({ run, intents, ...rest }: Command) => rest
    );
    if (config.dev && config.discord.devGuildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, config.discord.devGuildId),
        {
          body,
        }
      );
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body,
      });
    }
  } catch (e: any) {
    console.error("Failed to publish slash commands", e);
    throw e;
  }
};
