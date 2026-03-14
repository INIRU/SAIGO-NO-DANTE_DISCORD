import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { getKeywordMeta, searchKeywords, getIdentitiesByKeyword } from '../db/keywords.js';
import { buildKeywordView } from '../components/search-results.js';

export const data = new SlashCommandBuilder()
  .setName('키워드')
  .setDescription('키워드로 인격을 검색합니다')
  .addStringOption(opt =>
    opt.setName('검색')
      .setDescription('키워드명')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const query = interaction.options.getString('검색', true);

  const keyword = await getKeywordMeta(query);
  if (!keyword) {
    await interaction.editReply({ content: `"${query}" 키워드를 찾을 수 없습니다.` });
    return;
  }

  const identities = await getIdentitiesByKeyword(keyword.name);

  const container = buildKeywordView(keyword, identities, 0);

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

  const results = await searchKeywords(focused, 25);
  await interaction.respond(
    results.map(r => ({
      name: r.name,
      value: r.name,
    }))
  );
}
