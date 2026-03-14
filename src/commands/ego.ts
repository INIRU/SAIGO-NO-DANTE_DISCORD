import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { searchEgo, getEgoById } from '../db/ego.js';
import { buildEgoView } from '../components/ego-view.js';

export const data = new SlashCommandBuilder()
  .setName('에고')
  .setDescription('E.G.O 정보를 조회합니다')
  .addStringOption(opt =>
    opt.setName('이름')
      .setDescription('E.G.O 이름 (한글/영문)')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const name = interaction.options.getString('이름', true);
  const isUuid = name.includes('-') && name.length > 30;

  let ego;
  try {
    if (isUuid) {
      ego = await getEgoById(name);
    } else {
      const results = await searchEgo(name, 1);
      if (results.length === 0) {
        await interaction.editReply({ content: `"${name}"에 해당하는 E.G.O를 찾을 수 없습니다.` });
        return;
      }
      ego = await getEgoById(results[0].id);
    }
  } catch {
    await interaction.editReply({ content: `"${name}"에 해당하는 E.G.O를 찾을 수 없습니다.` });
    return;
  }

  const container = buildEgoView(ego);

  await interaction.editReply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

export async function autocomplete(interaction: { options: any; respond: (choices: any[]) => Promise<void> }) {
  const focused = interaction.options.getFocused();
  if (!focused || focused.length < 1) {
    await interaction.respond([]);
    return;
  }

  const results = await searchEgo(focused, 25);
  await interaction.respond(
    results.map(r => ({
      name: `[${r.grade}] ${r.name_kr ?? r.name} - ${(r as any).sinners?.name_kr ?? ''}`.trim(),
      value: r.id,
    }))
  );
}
