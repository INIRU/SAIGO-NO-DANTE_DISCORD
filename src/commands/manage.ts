import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ChannelType,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  type ChatInputCommandInteraction,
  type TextChannel,
} from 'discord.js';
import { SITE_COLORS } from '../constants/colors.js';

const GUILD_ID = '1477908541871493253';

export const data = new SlashCommandBuilder()
  .setName('관리')
  .setDescription('서버 관리 명령어')
  .addSubcommand(sub =>
    sub.setName('청소')
      .setDescription('메시지를 일괄 삭제합니다 (ManageMessages 권한 필요)')
      .addIntegerOption(opt =>
        opt.setName('개수')
          .setDescription('삭제할 메시지 수 (1–100)')
          .setRequired(true)
          .setMinValue(1)
          .setMaxValue(100)
      )
  )
  .addSubcommand(sub =>
    sub.setName('슬로우')
      .setDescription('슬로우모드를 설정합니다 (0=해제, ManageChannels 권한 필요)')
      .addIntegerOption(opt =>
        opt.setName('초')
          .setDescription('슬로우모드 간격 (초, 0–21600)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(21600)
      )
  )
  .addSubcommand(sub =>
    sub.setName('서버정보')
      .setDescription('서버 정보를 표시합니다')
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.guildId !== GUILD_ID) {
    await interaction.reply({ content: '이 명령어는 지정된 서버에서만 사용할 수 있습니다.', flags: MessageFlags.Ephemeral });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  // ── 청소 ──
  if (subcommand === '청소') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({ content: '메시지 관리 권한이 필요합니다.', flags: MessageFlags.Ephemeral });
      return;
    }

    const count = interaction.options.getInteger('개수', true);
    const channel = interaction.channel as TextChannel;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const deleted = await channel.bulkDelete(count, true);

    await interaction.editReply({ content: `✅ ${deleted.size}개 메시지 삭제 완료` });
    return;
  }

  // ── 슬로우 ──
  if (subcommand === '슬로우') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: '채널 관리 권한이 필요합니다.', flags: MessageFlags.Ephemeral });
      return;
    }

    const seconds = interaction.options.getInteger('초', true);
    const channel = interaction.channel as TextChannel;

    await channel.setRateLimitPerUser(seconds);

    const message = seconds === 0
      ? '✅ 슬로우모드 해제'
      : `✅ 슬로우모드 ${seconds}초 설정`;

    await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    return;
  }

  // ── 서버정보 ──
  if (subcommand === '서버정보') {
    const guild = interaction.guild!;

    await interaction.deferReply();

    // 온라인 멤버 수를 위해 approximatePresenceCount 가져오기
    const fetchedGuild = await guild.fetch();

    const totalMembers = fetchedGuild.memberCount;
    const onlineMembers = fetchedGuild.approximatePresenceCount ?? '알 수 없음';

    // 채널 종류별 카운트
    const channels = guild.channels.cache;
    const textCount = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceCount = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const forumCount = channels.filter(c => c.type === ChannelType.GuildForum).size;
    const categoryCount = channels.filter(c => c.type === ChannelType.GuildCategory).size;

    const roleCount = guild.roles.cache.size - 1; // @everyone 제외
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount ?? 0;

    const createdAt = fetchedGuild.createdAt;
    const createdStr = `${createdAt.getFullYear()}.${String(createdAt.getMonth() + 1).padStart(2, '0')}.${String(createdAt.getDate()).padStart(2, '0')}`;

    const container = new ContainerBuilder()
      .setAccentColor(SITE_COLORS.gold);

    // ── 헤더 (서버명 + 아이콘) ──
    const header = new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `# ${guild.name}\n-# 서버 정보`
        )
      )
      .setThumbnailAccessory(
        new ThumbnailBuilder({
          media: {
            url: guild.iconURL({ extension: 'png', size: 128 }) ?? interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 }),
          },
        })
      );
    container.addSectionComponents(header);

    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    // ── 멤버 / 채널 / 역할 ──
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '### 👥 멤버',
          `> **전체**: ${totalMembers.toLocaleString()}명　**온라인**: ${typeof onlineMembers === 'number' ? onlineMembers.toLocaleString() : onlineMembers}명`,
        ].join('\n')
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '### 💬 채널',
          `> 텍스트 **${textCount}** · 음성 **${voiceCount}** · 포럼 **${forumCount}** · 카테고리 **${categoryCount}**`,
        ].join('\n')
      )
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '### 🏷️ 역할 / 부스트 / 기타',
          `> **역할**: ${roleCount}개`,
          `> **부스트 레벨**: ${boostLevel}　**부스트 수**: ${boostCount}개`,
          `> **서버 개설일**: ${createdStr}`,
          `> **오너**: <@${guild.ownerId}>`,
        ].join('\n')
      )
    );

    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }
}
