import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  AttachmentBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { SITE_COLORS } from '../constants/colors.js';
import { getTicketByChannel, closeTicket } from '../db/tickets.js';
import { generateTranscript, type TranscriptMessage } from '../utils/transcript.js';

const GUILD_ID = '1477908541871493253';

export const data = new SlashCommandBuilder()
  .setName('티켓')
  .setDescription('티켓 시스템')
  .addSubcommand(sub =>
    sub.setName('설정')
      .setDescription('티켓 생성 패널을 현재 채널에 전송합니다 (관리자 전용)')
  )
  .addSubcommand(sub =>
    sub.setName('닫기')
      .setDescription('현재 티켓 채널을 닫고 트랜스크립트를 생성합니다')
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;

  if (!guildId || guildId !== GUILD_ID) {
    await interaction.reply({ content: '이 서버에서만 사용할 수 있습니다.', flags: MessageFlags.Ephemeral });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === '설정') {
    // Admin only
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({ content: '관리자만 사용할 수 있습니다.', flags: MessageFlags.Ephemeral });
      return;
    }

    const createRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('create_ticket')
        .setLabel('티켓 생성')
        .setEmoji('🎫')
        .setStyle(ButtonStyle.Success)
    );

    const container = new ContainerBuilder().setAccentColor(SITE_COLORS.gold);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          '## 🎫 티켓 시스템',
          '',
          '문의사항, 신고, 건의사항이 있으시면 아래 버튼을 눌러 티켓을 생성해주세요.',
          '',
          '> • **문의**: 게임 관련 질문, 봇 사용법 등',
          '> • **버그 신고**: 사이트·봇 오류 및 버그 제보',
          '> • **유저 신고**: 규칙 위반 사용자 신고',
          '> • **건의**: 서버·사이트 개선 건의사항',
          '',
          '티켓 생성 후 운영진이 빠른 시일 내에 확인하겠습니다.',
        ].join('\n')
      )
    );
    container.addSeparatorComponents(
      new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
    );

    await interaction.reply({
      components: [container, createRow],
      flags: MessageFlags.IsComponentsV2,
    });
    return;
  }

  if (subcommand === '닫기') {
    await interaction.deferReply();

    try {
      const ticket = await getTicketByChannel(interaction.channelId);
      if (!ticket) {
        await interaction.editReply({ content: '이 채널은 티켓 채널이 아닙니다.' });
        return;
      }

      // Fetch all messages (paginated, up to 500)
      const channel = interaction.channel!;
      if (!channel.isTextBased()) {
        await interaction.editReply({ content: '텍스트 채널에서만 사용할 수 있습니다.' });
        return;
      }

      const allMessages: TranscriptMessage[] = [];
      let lastId: string | undefined;

      while (true) {
        const fetched = await channel.messages.fetch({
          limit: 100,
          ...(lastId ? { before: lastId } : {}),
        });

        if (fetched.size === 0) break;

        for (const msg of fetched.values()) {
          allMessages.push({
            id: msg.id,
            author: {
              id: msg.author.id,
              username: msg.author.username,
              avatarURL: msg.author.displayAvatarURL({ size: 64 }),
              bot: msg.author.bot,
            },
            content: msg.content,
            createdAt: msg.createdAt,
            attachments: msg.attachments.map(a => ({ name: a.name, url: a.url })),
          });
        }

        lastId = fetched.last()?.id;
        if (fetched.size < 100 || allMessages.length >= 500) break;
      }

      allMessages.reverse();

      const now = new Date().toISOString();
      const html = generateTranscript(allMessages, {
        id: ticket.id,
        userId: ticket.user_id,
        createdAt: ticket.created_at,
        closedAt: now,
      });

      const buffer = Buffer.from(html, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: `ticket-${ticket.id}-transcript.html` });

      const container = new ContainerBuilder().setAccentColor(SITE_COLORS.gold);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## 🔒 티켓 닫힘\n> 트랜스크립트가 첨부되었습니다. 채널은 5초 후 삭제됩니다.')
      );

      await interaction.editReply({
        components: [container],
        files: [attachment],
        flags: MessageFlags.IsComponentsV2,
      });

      await closeTicket(interaction.channelId, interaction.user.id);

      setTimeout(async () => {
        try {
          await interaction.channel?.delete();
        } catch (err) {
          console.error('[Ticket] 채널 삭제 실패:', err);
        }
      }, 5000);
    } catch (err) {
      console.error('[Ticket] 닫기 처리 실패:', err);
      await interaction.editReply({ content: '티켓 닫기 중 오류가 발생했습니다.' }).catch(() => {});
    }
    return;
  }
}
