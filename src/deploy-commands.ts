import { REST, Routes } from 'discord.js';
import { config } from './config.js';

import * as identityCmd from './commands/identity.js';
import * as egoCmd from './commands/ego.js';
import * as sinnerCmd from './commands/sinner.js';
import * as keywordCmd from './commands/keyword.js';
import * as egoGiftCmd from './commands/ego-gift.js';
import * as helpCmd from './commands/help.js';

const commands = [
  identityCmd.data.toJSON(),
  egoCmd.data.toJSON(),
  sinnerCmd.data.toJSON(),
  keywordCmd.data.toJSON(),
  egoGiftCmd.data.toJSON(),
  helpCmd.data.toJSON(),
];

const rest = new REST({ version: '10' }).setToken(config.discord.token);

async function deploy() {
  try {
    console.log(`[Deploy] ${commands.length}개 글로벌 커맨드 등록 중...`);

    await rest.put(
      Routes.applicationCommands(config.discord.clientId),
      { body: commands },
    );

    console.log('[Deploy] 글로벌 커맨드 등록 완료!');
  } catch (error) {
    console.error('[Deploy] 커맨드 등록 실패:', error);
    process.exit(1);
  }
}

deploy();
