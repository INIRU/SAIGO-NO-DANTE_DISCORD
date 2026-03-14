import {
  SlashCommandBuilder,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { SITE_COLORS } from '../constants/colors.js';

export const data = new SlashCommandBuilder()
  .setName('도움말')
  .setDescription('봇 사용법을 안내합니다');

export async function execute(interaction: ChatInputCommandInteraction) {
  const container = new ContainerBuilder()
    .setAccentColor(SITE_COLORS.gold);

  // 헤더
  const header = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '# SAIGO NO DANTE\n-# 최애의 관리자 — 림버스 컴퍼니 정보 봇'
      )
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder({ media: { url: interaction.client.user.displayAvatarURL({ extension: 'png', size: 128 }) } })
    );
  container.addSectionComponents(header);

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // 명령어 목록
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## 명령어')
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        '> `/인격 <이름>` — 인격 상세 정보 (스킬, 패시브, 스탯)',
        '> `/에고 <이름>` — E.G.O 정보 (코스트, 내성, 스킬)',
        '> `/수감자 <이름>` — 수감자별 인격 & EGO 목록',
        '> `/키워드 <키워드>` — 키워드 보유 인격 검색',
        '> `/기프트 <이름>` — E.G.O 기프트 검색',
      ].join('\n')
    )
  );

  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small)
  );

  // 사용법
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('## 사용법')
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        '> 모든 검색은 **자동완성**을 지원합니다',
        '> **버튼**으로 스킬 상세, 패시브, 동기화 전환',
        '> **드롭다운**으로 같은 수감자의 다른 인격/EGO 탐색',
        '> **3동기화 ↔ 4동기화** 토글 지원',
      ].join('\n')
    )
  );

  // 푸터
  container.addSeparatorComponents(
    new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small)
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      '-# [saigo-no-dante.com](https://saigo-no-dante.com) | 데이터 출처: SAIGO NO DANTE'
    )
  );

  await interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}
