import { REST, Routes } from 'discord.js';
import { config } from './config.js';

import * as identityCmd from './commands/identity.js';
import * as egoCmd from './commands/ego.js';
import * as sinnerCmd from './commands/sinner.js';
import * as keywordCmd from './commands/keyword.js';
import * as egoGiftCmd from './commands/ego-gift.js';
import * as helpCmd from './commands/help.js';
import * as notificationCmd from './commands/notification.js';
import * as ticketCmd from './commands/ticket.js';
import * as warnCmd from './commands/warn.js';
import * as manageCmd from './commands/manage.js';

// 글로벌 커맨드 (모든 서버에서 사용 가능)
const globalCommands = [
  identityCmd.data.toJSON(),
  egoCmd.data.toJSON(),
  sinnerCmd.data.toJSON(),
  keywordCmd.data.toJSON(),
  egoGiftCmd.data.toJSON(),
  helpCmd.data.toJSON(),
  notificationCmd.data.toJSON(),
];

// 길드 전용 커맨드 (메인 서버에서만 표시)
const guildCommands = [
  ticketCmd.data.toJSON(),
  warnCmd.data.toJSON(),
  manageCmd.data.toJSON(),
];

const MAIN_GUILD_ID = '1477908541871493253';

const rest = new REST({ version: '10' }).setToken(config.discord.token);

async function deploy() {
  try {
    console.log(`[Deploy] ${globalCommands.length}개 글로벌 커맨드 등록 중...`);
    await rest.put(
      Routes.applicationCommands(config.discord.clientId),
      { body: globalCommands },
    );
    console.log('[Deploy] 글로벌 커맨드 등록 완료!');

    console.log(`[Deploy] ${guildCommands.length}개 길드 커맨드 등록 중... (${MAIN_GUILD_ID})`);
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, MAIN_GUILD_ID),
      { body: guildCommands },
    );
    console.log('[Deploy] 길드 커맨드 등록 완료!');
  } catch (error) {
    console.error('[Deploy] 커맨드 등록 실패:', error);
    process.exit(1);
  }
}

deploy();
