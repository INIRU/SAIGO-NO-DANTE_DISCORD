import { Client, GatewayIntentBits, Events, REST, Routes, ActivityType } from 'discord.js';
import { config } from './config.js';
import { handleInteraction } from './handlers/interaction.js';

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
import { startFeedPoller } from './services/feed-poller.js';

// 글로벌 커맨드
const globalCommandData = [
  identityCmd.data.toJSON(),
  egoCmd.data.toJSON(),
  sinnerCmd.data.toJSON(),
  keywordCmd.data.toJSON(),
  egoGiftCmd.data.toJSON(),
  helpCmd.data.toJSON(),
  notificationCmd.data.toJSON(),
];

// 메인 서버 전용 커맨드
const guildCommandData = [
  ticketCmd.data.toJSON(),
  warnCmd.data.toJSON(),
  manageCmd.data.toJSON(),
];

const MAIN_GUILD_ID = '1477908541871493253';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
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
    // 테스트 서버에 글로벌+길드 커맨드 모두 등록
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.devGuildId),
      { body: [...globalCommandData, ...guildCommandData] },
    );
    console.log(`[Bot] 테스트 서버(${config.discord.devGuildId})에 길드 커맨드 등록 완료!`);
  }

  // 메인 서버에 전용 커맨드 등록
  if (!config.isDev) {
    const rest = new REST({ version: '10' }).setToken(config.discord.token);
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, MAIN_GUILD_ID),
      { body: guildCommandData },
    );
    console.log(`[Bot] 메인 서버(${MAIN_GUILD_ID})에 길드 커맨드 등록 완료!`);
  }

  // 피드 폴링 시작
  startFeedPoller(c);
});

client.on(Events.InteractionCreate, handleInteraction);

client.login(config.discord.token);
