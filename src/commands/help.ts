import {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type MessageActionRowComponentBuilder,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { SITE_COLORS } from '../constants/colors.js';

export const data = new SlashCommandBuilder()
  .setName('도움말')
  .setDescription('봇 사용법을 안내합니다');

export async function execute(interaction: ChatInputCommandInteraction) {
  const container = new ContainerBuilder()
    .setAccentColor(SITE_COLORS.gold);

  // ── 헤더 ──
  const header = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# 최애의 관리자\n-# SAIGO NO DANTE — 림버스 컴퍼니 정보 봇'
      )
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder({ media: { url: interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 }) } })
    );
  container.addSectionComponents(header);

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // ── 정보 검색 ──
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '### 🔍 정보 검색\n' +
      '> `/인격` `이름` — 스킬 · 패시브 · 스탯 · 내성\n' +
      '> `/에고` `이름` — 코스트 · 내성 · 각성/침식 스킬\n' +
      '> `/수감자` `이름` — 보유 인격 & E.G.O 목록\n' +
      '-# 예: `/인격 R사 이상`, `/에고 크러드 번딩`'
    )
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
  );

  // ── 도감 검색 ──
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '### 📖 도감 검색\n' +
      '> `/키워드` `키워드` — 키워드 설명 + 보유 인격 목록\n' +
      '> `/기프트` `이름` — E.G.O 기프트 효과 (기본/+/++)\n' +
      '-# 예: `/키워드 출혈`, `/기프트 뱀의 지혜`'
    )
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
  );

  // ── 서버 설정 ──
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '### ⚙️ 서버 설정\n' +
      '> `/알림설정` — Steam · X(트위터) 공지 알림 채널 설정\n' +
      '-# 서버 관리 권한 필요'
    )
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // ── 사용 팁 ──
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '### 💡 사용 팁\n' +
      '> 이름을 입력하면 **자동완성** 목록이 표시됩니다\n' +
      '> **버튼**으로 스킬 상세 · 패시브 · 동기화 전환\n' +
      '> **드롭다운**으로 같은 수감자의 다른 인격/EGO 선택\n' +
      '> **3동기화 ↔ 4동기화** 버튼으로 데이터 전환'
    )
  );

  // ── 웹사이트 버튼 ──
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  const linkRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('saigo-no-dante.com')
        .setStyle(ButtonStyle.Link)
        .setURL('https://saigo-no-dante.com')
        .setEmoji('🌐'),
    );
  container.addActionRowComponents(linkRow);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '-# 더 자세한 정보는 웹사이트에서 확인하세요'
    )
  );

  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}
