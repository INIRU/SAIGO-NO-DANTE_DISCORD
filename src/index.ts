import { Client, GatewayIntentBits, Events, REST, Routes, ActivityType } from 'discord.js';
import { config } from './config.js';
import { handleInteraction } from './handlers/interaction.js';

import * as identityCmd from './commands/identity.js';
import * as egoCmd from './commands/ego.js';
import * as sinnerCmd from './commands/sinner.js';
import * as keywordCmd from './commands/keyword.js';
import * as egoGiftCmd from './commands/ego-gift.js';
import * as helpCmd from './commands/help.js';

const commandData = [
  identityCmd.data.toJSON(),
  egoCmd.data.toJSON(),
  sinnerCmd.data.toJSON(),
  keywordCmd.data.toJSON(),
  egoGiftCmd.data.toJSON(),
  helpCmd.data.toJSON(),
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async (c) => {
  console.log(`[Bot] ${c.user.tag} 로그인 완료!`);
  console.log(`[Bot] ${c.guilds.cache.size}개 서버에서 활동 중`);

  c.user.setPresence({
    activities: [{ name: 'saigo-no-dante.com', type: ActivityType.Playing }],
    status: 'online',
  });

  // dev 모드일 때 길드 커맨드 즉시 등록
  if (config.isDev && config.discord.devGuildId) {
    const rest = new REST({ version: '10' }).setToken(config.discord.token);
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.devGuildId),
      { body: commandData },
    );
    console.log(`[Bot] 테스트 서버(${config.discord.devGuildId})에 길드 커맨드 등록 완료!`);
  }
});

client.on(Events.InteractionCreate, handleInteraction);

client.login(config.discord.token);
