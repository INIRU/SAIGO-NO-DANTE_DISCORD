import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { getSinnerById } from '../db/sinners.js';
import { getIdentitiesBySinner } from '../db/identities.js';
import { getEgoBySinner } from '../db/ego.js';
import { buildSinnerView } from '../components/sinner-view.js';
import { SINNERS } from '../constants/sinners.js';

export const data = new SlashCommandBuilder()
  .setName('수감자')
  .setDescription('수감자 정보를 조회합니다')
  .addStringOption(opt =>
    opt.setName('이름')
      .setDescription('수감자 이름 (한글/영문)')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const name = interaction.options.getString('이름', true);

  // slug or name으로 수감자 찾기
  const sinnerInfo = SINNERS.find(s =>
    s.id === name || s.nameKr === name || s.name.toLowerCase() === name.toLowerCase()
  );

  if (!sinnerInfo) {
    await interaction.editReply({ content: `"${name}"에 해당하는 수감자를 찾을 수 없습니다.` });
    return;
  }

  const [sinner, identities, egos] = await Promise.all([
    getSinnerById(sinnerInfo.id),
    getIdentitiesBySinner(sinnerInfo.id),
    getEgoBySinner(sinnerInfo.id),
  ]);

  const container = buildSinnerView(sinner, identities, egos);

  await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

export async function autocomplete(interaction: { options: any; respond: (choices: any[]) => Promise<void> }) {
  const focused = interaction.options.getFocused().toLowerCase();

  const filtered = SINNERS.filter(s =>
    s.nameKr.includes(focused) || s.name.toLowerCase().includes(focused) || s.id.includes(focused)
  );

  await interaction.respond(
    filtered.map(s => ({
      name: `${s.nameKr} (${s.name})`,
      value: s.id,
    }))
  );
}
