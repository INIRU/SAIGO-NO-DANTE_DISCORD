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
} from 'discord.js';
import { SITE_COLORS } from '../constants/colors.js';
import { getGuildSettings, setNotificationChannel, toggleSource } from '../db/guild-settings.js';

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
