import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { searchEgoGifts, getEgoGiftById } from '../db/ego-gifts.js';
import { buildEgoGiftView } from '../components/search-results.js';

export const data = new SlashCommandBuilder()
  .setName('기프트')
  .setDescription('E.G.O 기프트를 검색합니다')
  .addStringOption(opt =>
    opt.setName('검색')
      .setDescription('기프트명 또는 키워드')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const query = interaction.options.getString('검색', true);
  const isUuid = query.includes('-') && query.length > 30;

  let gift;
  try {
    if (isUuid) {
      gift = await getEgoGiftById(query);
    } else {
      const results = await searchEgoGifts(query, 1);
      if (results.length === 0) {
        await interaction.editReply({ content: `"${query}"에 해당하는 기프트를 찾을 수 없습니다.` });
        return;
      }
      gift = await getEgoGiftById(results[0].id);
    }
  } catch {
    await interaction.editReply({ content: `"${query}"에 해당하는 기프트를 찾을 수 없습니다.` });
    return;
  }

  const container = buildEgoGiftView(gift);

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

  const results = await searchEgoGifts(focused.trim(), 25);
  console.log(`[Autocomplete:기프트] query="${focused.trim()}" results=${results.length}`);
  await interaction.respond(
    results.map(r => ({
      name: `${r.name}${r.keyword ? ` (${r.keyword})` : ''}`,
      value: r.id,
    }))
  );
}
