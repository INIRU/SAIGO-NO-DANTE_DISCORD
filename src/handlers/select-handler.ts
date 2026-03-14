import { type StringSelectMenuInteraction, MessageFlags } from 'discord.js';
import { getIdentityById, getSkillsByIdentity, getIdentitiesBySinner } from '../db/identities.js';
import { getEgoById } from '../db/ego.js';
import { buildIdentityView } from '../components/identity-view.js';
import { buildEgoView } from '../components/ego-view.js';

export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  const [action] = interaction.customId.split(':');
  const selectedId = interaction.values[0];

  await interaction.deferUpdate();

  switch (action) {
    case 'switch_identity':
    case 'select_identity': {
      const uptie = 4;
      const identity = await getIdentityById(selectedId);
      const [skills, siblings] = await Promise.all([
        getSkillsByIdentity(selectedId, uptie),
        getIdentitiesBySinner(identity.sinner_id),
      ]);

      const container = buildIdentityView(identity, skills, siblings, uptie);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'select_ego': {
      const ego = await getEgoById(selectedId);
      const container = buildEgoView(ego);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }
  }
}
