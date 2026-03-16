import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { SITE_COLORS } from '../constants/colors.js';
import { getGuildSettings, setNotificationChannel, toggleSource } from '../db/guild-settings.js';
import { fetchLatestSteamPost, fetchRecentPosts } from '../services/feed-poller.js';

export const data = new SlashCommandBuilder()
  .setName('알림설정')
  .setDescription('업데이트 알림을 설정합니다 (관리자 전용)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand(sub =>
    sub.setName('채널')
      .setDescription('알림을 받을 채널을 설정합니다')
      .addChannelOption(opt =>
        opt.setName('채널')
          .setDescription('알림 채널')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
      )
  )
  .addSubcommand(sub =>
    sub.setName('상태')
      .setDescription('현재 알림 설정을 확인합니다')
  )
  .addSubcommand(sub =>
    sub.setName('테스트')
      .setDescription('최신 Steam 공지를 미리봅니다 (관리자 전용)')
  )
  .addSubcommand(sub =>
    sub.setName('최근')
      .setDescription('최근 공지를 전송합니다')
      .addStringOption(opt =>
        opt.setName('소스')
          .setDescription('알림 소스')
          .setRequired(true)
          .addChoices(
            { name: 'Steam 공지', value: 'steam' },
            { name: 'X(Twitter)', value: 'twitter' },
          )
      )
      .addIntegerOption(opt =>
        opt.setName('개수')
          .setDescription('가져올 글 수 (기본 3)')
          .setMinValue(1)
          .setMaxValue(20)
      )
  )
  .addSubcommand(sub =>
    sub.setName('토글')
      .setDescription('알림 소스를 켜거나 끕니다')
      .addStringOption(opt =>
        opt.setName('소스')
          .setDescription('알림 소스')
          .setRequired(true)
          .addChoices(
            { name: 'Steam 공지', value: 'steam' },
            { name: 'X(Twitter)', value: 'twitter' },
          )
      )
      .addBooleanOption(opt =>
        opt.setName('활성화')
          .setDescription('활성화 여부')
          .setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;

  if (!guildId) {
    await interaction.reply({ content: '서버에서만 사용할 수 있습니다.', ephemeral: true });
    return;
  }

  switch (subcommand) {
    case '채널': {
      const channel = interaction.options.getChannel('채널', true);
      await setNotificationChannel(guildId, channel.id);

      const container = new ContainerBuilder().setAccentColor(SITE_COLORS.gold);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `## 알림 채널 설정 완료\n> <#${channel.id}>에서 업데이트 알림을 받습니다.`
        )
      );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      break;
    }

    case '상태': {
      const settings = await getGuildSettings(guildId);

      const container = new ContainerBuilder().setAccentColor(SITE_COLORS.gold);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## 알림 설정 현황')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      );

      if (settings?.notification_channel_id) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [
              `> **알림 채널**: <#${settings.notification_channel_id}>`,
              `> **Steam 공지**: ${settings.steam_enabled !== false ? '✅ 활성화' : '❌ 비활성화'}`,
              `> **X(Twitter)**: ${settings.twitter_enabled !== false ? '✅ 활성화' : '❌ 비활성화'}`,
            ].join('\n')
          )
        );
      } else {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('> 알림이 설정되지 않았습니다.\n> `/알림설정 채널`로 채널을 지정해주세요.')
        );
      }

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      break;
    }

    case '테스트': {
      await interaction.deferReply();
      const result = await fetchLatestSteamPost();
      if (result) {
        await interaction.editReply({
          components: [result.container],
          files: result.extraFiles ?? (result.bannerFile ? [result.bannerFile] : []),
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await interaction.editReply({ content: '피드를 가져올 수 없습니다.' });
      }
      break;
    }

    case '최근': {
      const source = interaction.options.getString('소스', true) as 'steam' | 'twitter';
      const count = interaction.options.getInteger('개수') ?? 3;

      // 설정된 알림 채널로 전송
      const recentSettings = await getGuildSettings(guildId);
      if (!recentSettings?.notification_channel_id) {
        await interaction.reply({ content: '알림 채널이 설정되지 않았습니다. `/알림설정 채널`로 먼저 설정해주세요.', ephemeral: true });
        break;
      }

      await interaction.deferReply({ ephemeral: true });

      const targetChannel = await interaction.client.channels.fetch(recentSettings.notification_channel_id) as TextChannel | null;
      if (!targetChannel?.isTextBased()) {
        await interaction.editReply({ content: '알림 채널에 접근할 수 없습니다.' });
        break;
      }

      const results = await fetchRecentPosts(source, count);
      if (results.length === 0) {
        await interaction.editReply({ content: '피드를 가져올 수 없습니다.' });
        break;
      }

      for (const result of results.reverse()) {
        await targetChannel.send({
          components: [result.container],
          files: result.extraFiles ?? (result.bannerFile ? [result.bannerFile] : []),
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const sourceLabel = source === 'steam' ? 'Steam' : 'X(Twitter)';
      await interaction.editReply({ content: `${sourceLabel} 최근 ${results.length}개 글을 <#${recentSettings.notification_channel_id}>에 전송했습니다.` });
      break;
    }

    case '토글': {
      const source = interaction.options.getString('소스', true) as 'steam' | 'twitter';
      const enabled = interaction.options.getBoolean('활성화', true);
      await toggleSource(guildId, source, enabled);

      const label = source === 'steam' ? 'Steam 공지' : 'X(Twitter)';
      const status = enabled ? '✅ 활성화' : '❌ 비활성화';

      await interaction.reply({
        content: `**${label}** 알림이 ${status}되었습니다.`,
        ephemeral: true,
      });
      break;
    }
  }
}
