import {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { SITE_COLORS } from '../constants/colors.js';
import { addWarning, getWarnings, removeWarning, getWarningCount } from '../db/warnings.js';

const MAIN_GUILD_ID = '1477908541871493253';
const WARN_LOG_CHANNEL_ID = '1485347165600616611'; // ⚠〡경고-로그
const WARN_COLOR = 0xc83030;

export const data = new SlashCommandBuilder()
  .setName('경고')
  .setDescription('경고 관리 명령어 (관리자 전용)')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand(sub =>
    sub.setName('부여')
      .setDescription('경고를 부여합니다')
      .addUserOption(opt =>
        opt.setName('대상')
          .setDescription('경고를 받을 사용자')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('사유')
          .setDescription('경고 사유')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('목록')
      .setDescription('경고 목록을 조회합니다')
      .addUserOption(opt =>
        opt.setName('대상')
          .setDescription('조회할 사용자')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('삭제')
      .setDescription('경고를 삭제합니다')
      .addIntegerOption(opt =>
        opt.setName('번호')
          .setDescription('삭제할 경고 ID')
          .setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (interaction.guildId !== MAIN_GUILD_ID) {
    await interaction.reply({ content: '이 명령어는 메인 서버에서만 사용할 수 있습니다.', flags: MessageFlags.Ephemeral });
    return;
  }

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case '부여': {
      const target = interaction.options.getUser('대상', true);
      const reason = interaction.options.getString('사유', true);

      await addWarning(interaction.guildId, target.id, interaction.user.id, reason);
      const count = await getWarningCount(interaction.guildId, target.id);

      const container = new ContainerBuilder().setAccentColor(WARN_COLOR);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('## ⚠️ 경고 부여')
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      );

      const lines = [
        `> **대상**: <@${target.id}>`,
        `> **사유**: ${reason}`,
        `> **누적 경고**: ${count}회`,
        `> **처리자**: <@${interaction.user.id}>`,
      ];
      if (count >= 3) {
        lines.push(`\n⚠️ **경고 ${count}회 누적 — 제재를 검토해주세요**`);
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(lines.join('\n'))
      );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });

      // 경고 로그 채널에 기록
      try {
        const logChannel = await interaction.client.channels.fetch(WARN_LOG_CHANNEL_ID);
        if (logChannel?.isTextBased()) {
          const logContainer = new ContainerBuilder().setAccentColor(WARN_COLOR);
          logContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## ⚠️ 경고 부여\n` +
              `> **대상**: <@${target.id}>\n` +
              `> **사유**: ${reason}\n` +
              `> **누적**: ${count}회\n` +
              `> **처리자**: <@${interaction.user.id}>\n` +
              `> **시각**: ${new Date().toLocaleString('ko-KR')}`
            )
          );
          // @ts-expect-error - channel is text-based
          await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
        }
      } catch (logErr) {
        console.error('[Warn] 로그 채널 전송 실패:', logErr);
      }
      break;
    }

    case '목록': {
      const target = interaction.options.getUser('대상', true);
      const warnings = await getWarnings(interaction.guildId, target.id);

      const container = new ContainerBuilder().setAccentColor(SITE_COLORS.gold);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 경고 목록 — <@${target.id}>`)
      );
      container.addSeparatorComponents(
        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
      );

      if (warnings.length === 0) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent('> 경고 이력이 없습니다.')
        );
      } else {
        const lines = warnings.map((w: { id: number; reason: string; created_at: string; moderator_id: string }) => {
          const date = new Date(w.created_at).toLocaleDateString('ko-KR');
          return `**#${w.id}** — ${w.reason}\n> ${date} · <@${w.moderator_id}>`;
        });
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(lines.join('\n\n'))
        );
      }

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });
      break;
    }

    case '삭제': {
      const id = interaction.options.getInteger('번호', true);
      await removeWarning(id);

      const container = new ContainerBuilder().setAccentColor(SITE_COLORS.gold);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## 경고 삭제 완료\n> 경고 **#${id}**이(가) 삭제되었습니다.`)
      );

      await interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });

      // 경고 삭제 로그
      try {
        const logChannel = await interaction.client.channels.fetch(WARN_LOG_CHANNEL_ID);
        if (logChannel?.isTextBased()) {
          const logContainer = new ContainerBuilder().setAccentColor(SITE_COLORS.gold);
          logContainer.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## 🗑️ 경고 삭제\n` +
              `> **경고 #${id}** 삭제됨\n` +
              `> **처리자**: <@${interaction.user.id}>\n` +
              `> **시각**: ${new Date().toLocaleString('ko-KR')}`
            )
          );
          // @ts-expect-error - channel is text-based
          await logChannel.send({ components: [logContainer], flags: MessageFlags.IsComponentsV2 });
        }
      } catch (logErr) {
        console.error('[Warn] 로그 채널 전송 실패:', logErr);
      }
      break;
    }
  }
}
