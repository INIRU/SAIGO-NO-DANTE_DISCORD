import { type Interaction, type ChatInputCommandInteraction } from 'discord.js';
import * as identityCmd from '../commands/identity.js';
import * as egoCmd from '../commands/ego.js';
import * as sinnerCmd from '../commands/sinner.js';
import * as keywordCmd from '../commands/keyword.js';
import * as egoGiftCmd from '../commands/ego-gift.js';
import * as helpCmd from '../commands/help.js';
import { handleButton } from './button-handler.js';
import { handleSelectMenu } from './select-handler.js';

interface Command {
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: any) => Promise<void>;
}

const commands = new Map<string, Command>([
  ['인격', identityCmd],
  ['에고', egoCmd],
  ['수감자', sinnerCmd],
  ['키워드', keywordCmd],
  ['기프트', egoGiftCmd],
  ['도움말', helpCmd],
]);

export async function handleInteraction(interaction: Interaction) {
  console.log(`[Interaction] type=${interaction.type} ${interaction.isAutocomplete() ? 'autocomplete:' + interaction.commandName : interaction.isChatInputCommand() ? 'command:' + interaction.commandName : interaction.isButton() ? 'button:' + (interaction as any).customId : 'other'}`);
  try {
    if (interaction.isAutocomplete()) {
      const cmd = commands.get(interaction.commandName);
      if (cmd?.autocomplete) {
        try {
          await cmd.autocomplete(interaction);
        } catch (err) {
          console.error(`[Autocomplete Error] ${interaction.commandName}:`, err);
          await interaction.respond([]).catch(() => {});
        }
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const cmd = commands.get(interaction.commandName);
      if (cmd) {
        await cmd.execute(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
      return;
    }
  } catch (error) {
    console.error(`[Interaction Error] ${interaction.id}:`, error);

    const reply = { content: '오류가 발생했습니다. 잠시 후 다시 시도해주세요.', ephemeral: true };

    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  }
}
