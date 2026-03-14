import { SlashCommandBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { searchIdentities, getIdentityById, getSkillsByIdentity, getIdentitiesBySinner } from '../db/identities.js';
import { buildIdentityView } from '../components/identity-view.js';

export const data = new SlashCommandBuilder()
  .setName('인격')
  .setDescription('인격 정보를 조회합니다')
  .addStringOption(opt =>
    opt.setName('이름')
      .setDescription('인격 이름 (한글/영문)')
      .setRequired(true)
      .setAutocomplete(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const name = interaction.options.getString('이름', true);

  // autocomplete에서 UUID가 올 수도 있고, 직접 입력한 이름일 수도 있음
  const isUuid = name.includes('-') && name.length > 30;
  let identity;

  try {
    if (isUuid) {
      identity = await getIdentityById(name);
    } else {
      const results = await searchIdentities(name, 1);
      if (results.length === 0) {
        await interaction.editReply({ content: `"${name}"에 해당하는 인격을 찾을 수 없습니다.` });
        return;
      }
      identity = await getIdentityById(results[0].id);
    }
  } catch {
    await interaction.editReply({ content: `"${name}"에 해당하는 인격을 찾을 수 없습니다.` });
    return;
  }

  const uptie = 4;
  const [skills, siblings] = await Promise.all([
    getSkillsByIdentity(identity.id, uptie),
    getIdentitiesBySinner(identity.sinner_id),
  ]);

  const container = buildIdentityView(identity, skills, siblings, uptie);

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

  const results = await searchIdentities(focused, 25);
  await interaction.respond(
    results.map(r => ({
      name: `${r.name_kr} ${(r as any).sinners?.name_kr ?? ''}`.trim(),
      value: r.id,
    }))
  );
}
