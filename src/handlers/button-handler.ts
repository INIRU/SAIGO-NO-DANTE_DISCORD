import { type ButtonInteraction, MessageFlags } from 'discord.js';
import { computeSkillMeta } from '../utils/format.js';
import { getIdentityById, getSkillsByIdentity, getPassivesByIdentity, getIdentitiesBySinner } from '../db/identities.js';
import { getEgoById } from '../db/ego.js';
import { getKeywordMeta, getIdentitiesByKeyword } from '../db/keywords.js';
import { buildIdentityView, buildSkillDetailView, buildPassiveView } from '../components/identity-view.js';
import { buildEgoView, buildEgoPassiveView } from '../components/ego-view.js';
import { buildKeywordView } from '../components/search-results.js';

export async function handleButton(interaction: ButtonInteraction) {
  const [action, ...params] = interaction.customId.split(':');

  await interaction.deferUpdate();

  switch (action) {
    case 'skill_detail': {
      const identityId = params[0];
      const uptie = parseInt(params[1], 10) || 4;
      const identity = await getIdentityById(identityId);
      const skills = await getSkillsByIdentity(identityId, uptie);
      if (skills.length === 0) return;
      const metaMap = computeSkillMeta(skills);

      const container = buildSkillDetailView(identity, skills[0], skills.length, 0, uptie, undefined, metaMap.get(skills[0].id));
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'skill_nav': {
      const identityId = params[0];
      const index = parseInt(params[1], 10);
      const uptie = parseInt(params[2], 10) || 4;
      const identity = await getIdentityById(identityId);
      const skills = await getSkillsByIdentity(identityId, uptie);
      const clampedIndex = Math.max(0, Math.min(index, skills.length - 1));
      const metaMap = computeSkillMeta(skills);

      const container = buildSkillDetailView(identity, skills[clampedIndex], skills.length, clampedIndex, uptie, undefined, metaMap.get(skills[clampedIndex].id));
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'passive': {
      const identityId = params[0];
      const uptie = parseInt(params[1], 10) || 4;
      const identity = await getIdentityById(identityId);
      let passives = await getPassivesByIdentity(identityId, uptie);
      // uptie 4에 패시브가 없으면 3으로 폴백
      if (passives.length === 0 && uptie === 4) {
        passives = await getPassivesByIdentity(identityId, 3);
      }

      const container = buildPassiveView(identity, passives, uptie);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'def_skill': {
      const identityId = params[0];
      const uptie = parseInt(params[1], 10) || 4;
      const identity = await getIdentityById(identityId);
      const skills = await getSkillsByIdentity(identityId, uptie);
      const defIndex = skills.findIndex(s =>
        s.skill_type === 'evade' || s.skill_type === 'defense' || s.skill_type === 'counter'
      );
      if (defIndex < 0) return;
      const metaMap = computeSkillMeta(skills);

      const container = buildSkillDetailView(identity, skills[defIndex], skills.length, defIndex, uptie, undefined, metaMap.get(skills[defIndex].id));
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'uptie_toggle': {
      const identityId = params[0];
      const uptie = parseInt(params[1], 10) || 4;
      const identity = await getIdentityById(identityId);
      const [skills, siblings] = await Promise.all([
        getSkillsByIdentity(identityId, uptie),
        getIdentitiesBySinner(identity.sinner_id),
      ]);

      const container = buildIdentityView(identity, skills, siblings, uptie);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'passive_nav': {
      const identityId = params[0];
      const uptie = parseInt(params[1], 10) || 4;
      const page = parseInt(params[2], 10) || 0;
      const identity = await getIdentityById(identityId);
      let passives = await getPassivesByIdentity(identityId, uptie);
      if (passives.length === 0 && uptie === 4) {
        passives = await getPassivesByIdentity(identityId, 3);
      }

      const container = buildPassiveView(identity, passives, uptie, page);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'back_identity': {
      const identityId = params[0];
      const uptie = parseInt(params[1], 10) || 4;
      const identity = await getIdentityById(identityId);
      const [skills, siblings] = await Promise.all([
        getSkillsByIdentity(identityId, uptie),
        getIdentitiesBySinner(identity.sinner_id),
      ]);

      const container = buildIdentityView(identity, skills, siblings, uptie);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'ego_toggle': {
      const egoId = params[0];
      const mode = params[1];
      const construe = parseInt(params[2], 10) || 4;
      const ego = await getEgoById(egoId);

      const container = buildEgoView(ego, mode === 'corrosion', construe);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'ego_construe': {
      const egoId = params[0];
      const mode = params[1];
      const construe = parseInt(params[2], 10) || 4;
      const ego = await getEgoById(egoId);

      const container = buildEgoView(ego, mode === 'corrosion', construe);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'ego_passive': {
      const egoId = params[0];
      const ego = await getEgoById(egoId);

      const container = buildEgoPassiveView(ego);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'back_ego': {
      const egoId = params[0];
      const ego = await getEgoById(egoId);

      const container = buildEgoView(ego);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }

    case 'kw_page': {
      const keywordName = params[0];
      const page = parseInt(params[1], 10);
      const keyword = await getKeywordMeta(keywordName);
      if (!keyword) return;

      const identities = await getIdentitiesByKeyword(keyword.name);
      const container = buildKeywordView(keyword, identities, page);
      await interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      break;
    }
  }
}
