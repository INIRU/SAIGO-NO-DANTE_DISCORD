import {
  type ButtonInteraction,
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
  Collection,
  type Message,
} from 'discord.js';
import { SITE_COLORS } from '../constants/colors.js';
import { createTicket, getOpenTicketByUser, getTicketByChannel, closeTicket } from '../db/tickets.js';
import { generateTranscript, type TranscriptMessage } from '../utils/transcript.js';

const GUILD_ID = '1477908541871493253';
const TICKET_LOG_CHANNEL_ID = '1485346890185838672'; // 📋〡티켓-로그

async function fetchAllMessages(channelId: string, client: ButtonInteraction['client']): Promise<Message[]> {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) return [];

  const allMessages: Message[] = [];
  let lastId: string | undefined;

  while (true) {
    const fetched: Collection<string, Message> = await channel.messages.fetch({
      limit: 100,
      ...(lastId ? { before: lastId } : {}),
    });

    if (fetched.size === 0) break;

    allMessages.push(...fetched.values());
    lastId = fetched.last()?.id;

    if (fetched.size < 100 || allMessages.length >= 500) break;
  }

  return allMessages.reverse();
}

async function buildAndSendTranscript(
  interaction: ButtonInteraction,
  ticket: { id: number; user_id: string; created_at: string; channel_id: string }
): Promise<void> {
  const rawMessages = await fetchAllMessages(interaction.channelId!, interaction.client);

  const transcriptMessages: TranscriptMessage[] = rawMessages.map(msg => ({
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
  }));

  const now = new Date().toISOString();
  const html = generateTranscript(transcriptMessages, {
    id: ticket.id,
    userId: ticket.user_id,
    createdAt: ticket.created_at,
    closedAt: now,
  });

  const buffer = Buffer.from(html, 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: `ticket-${ticket.id}-transcript.html` });

  // V2 컴포넌트와 파일 첨부는 별도 메시지로 전송
  await interaction.editReply({
    content: '## 🔒 티켓 닫힘\n> 트랜스크립트가 첨부되었습니다. 채널은 5초 후 삭제됩니다.',
    files: [attachment],
  });
}

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  const action = interaction.customId;

  if (action === 'create_ticket') {
    // Guild lock
    if (interaction.guildId !== GUILD_ID) {
      await interaction.reply({ content: '이 서버에서는 사용할 수 없습니다.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Check for existing open ticket
      const existing = await getOpenTicketByUser(interaction.guildId, interaction.user.id);
      if (existing) {
        const container = new ContainerBuilder().setAccentColor(SITE_COLORS.darkGold);
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`이미 열린 티켓이 있습니다: <#${existing.channel_id}>`)
        );
        await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        return;
      }

      // Create ticket channel
      const guild = interaction.guild!;
      const parentCategoryId = (interaction.channel as any)?.parentId ?? null;

      const ticketChannel = await guild.channels.create({
        name: `티켓-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: parentCategoryId,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: guild.members.me!.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ManageMessages,
            ],
          },
          // Moderators (ModerateMembers permission)
          ...guild.roles.cache
            .filter(role => role.permissions.has(PermissionFlagsBits.ModerateMembers))
            .map(role => ({
              id: role.id,
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
              ],
            })),
        ],
      });

      // Save to DB
      const ticket = await createTicket(interaction.guildId, interaction.user.id, ticketChannel.id);

      // Send welcome message in new channel
      const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('티켓 닫기')
          .setEmoji('🔒')
          .setStyle(ButtonStyle.Danger)
      );

      const welcomeContainer = new ContainerBuilder().setAccentColor(SITE_COLORS.gold);
      welcomeContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `## 🎫 티켓 #${ticket.id}`,
            `> 안녕하세요, <@${interaction.user.id}>님!`,
            `> 문의사항을 남겨주시면 운영진이 확인 후 답변드리겠습니다.`,
            `>`,
            `> 티켓을 닫으려면 아래 버튼을 눌러주세요.`,
          ].join('\n')
        )
      );
      welcomeContainer.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      );

      await ticketChannel.send({
        components: [welcomeContainer, closeRow],
        flags: MessageFlags.IsComponentsV2,
      });

      // Confirm to user
      const confirmContainer = new ContainerBuilder().setAccentColor(SITE_COLORS.gold);
      confirmContainer.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`티켓이 생성되었습니다: <#${ticketChannel.id}>`)
      );
      await interaction.editReply({ components: [confirmContainer], flags: MessageFlags.IsComponentsV2 });
    } catch (err) {
      console.error('[Ticket] create_ticket 처리 실패:', err);
      await interaction.editReply({ content: '티켓 생성 중 오류가 발생했습니다.' });
    }
    return;
  }

  if (action === 'close_ticket') {
    // Guild lock
    if (interaction.guildId !== GUILD_ID) {
      await interaction.reply({ content: '이 서버에서는 사용할 수 없습니다.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply();

    try {
      const ticket = await getTicketByChannel(interaction.channelId!);
      if (!ticket) {
        await interaction.editReply({ content: '이 채널은 티켓 채널이 아닙니다.' });
        return;
      }

      await buildAndSendTranscript(interaction, ticket);
      await closeTicket(interaction.channelId!, interaction.user.id);

      // 운영 채널에 트랜스크립트 로그 전송
      try {
        const logChannel = await interaction.client.channels.fetch(TICKET_LOG_CHANNEL_ID);
        if (logChannel?.isTextBased()) {
          const rawMsgs = await fetchAllMessages(interaction.channelId!, interaction.client);
          const tMsgs: TranscriptMessage[] = rawMsgs.map(msg => ({
            id: msg.id,
            author: { id: msg.author.id, username: msg.author.username, avatarURL: msg.author.displayAvatarURL({ size: 64 }), bot: msg.author.bot },
            content: msg.content,
            createdAt: msg.createdAt,
            attachments: msg.attachments.map(a => ({ name: a.name, url: a.url })),
          }));
          const html = generateTranscript(tMsgs, { id: ticket.id, userId: ticket.user_id, createdAt: ticket.created_at, closedAt: new Date().toISOString() });
          const logAttachment = new AttachmentBuilder(Buffer.from(html, 'utf-8'), { name: `ticket-${ticket.id}-transcript.html` });

          // @ts-expect-error - logChannel is text-based
          await logChannel.send({
            content: `## 🎫 티켓 #${ticket.id} 닫힘\n` +
              `> 생성자: <@${ticket.user_id}>\n` +
              `> 닫은 사람: <@${interaction.user.id}>\n` +
              `> 생성: ${new Date(ticket.created_at).toLocaleString('ko-KR')}`,
            files: [logAttachment],
          });
        }
      } catch (logErr) {
        console.error('[Ticket] 로그 채널 전송 실패:', logErr);
      }

      // Delete channel after 5 seconds
      setTimeout(async () => {
        try {
          await interaction.channel?.delete();
        } catch (err) {
          console.error('[Ticket] 채널 삭제 실패:', err);
        }
      }, 5000);
    } catch (err) {
      console.error('[Ticket] close_ticket 처리 실패:', err);
      await interaction.editReply({ content: '티켓 닫기 중 오류가 발생했습니다.' }).catch(() => {});
    }
    return;
  }
}
