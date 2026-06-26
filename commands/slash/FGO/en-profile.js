const util = require('../../../utility/util.js');
const cfg = require('../../../config/config.js');
const PAGE_COUNT = cfg.SupportPages.PAGE_COUNT;

module.exports = {
    name: 'en-profile',
    description: "View a saved FGO EN profile (yours or another player's).",
    type: 1,
    options: [
        { name: 'user', description: 'Whose profile to view (defaults to you).', type: 6, required: false },
    ],
    permissions: {
        DEFAULT_MEMBER_PERMISSIONS: 'SendMessages'
    },
    run: async (client, interaction, config, db) => {
        try {
            const target = interaction.options.getUser('user') || interaction.user;
            const isOther = target.id !== interaction.user.id;

            const raw = await db.get(`fgoProfile_En_${target.id}`);
            if (!raw) {
                return interaction.reply({
                    content: isOther
                        ? 'Cannot find a profile for that player.'
                        : 'You have no EN profile yet. Use `/en-profile-edit` to create one.',
                    ephemeral: true,
                });
            }

            const data = JSON.parse(raw);

            // NOTE: Privacy is intentionally NOT enforced here, preserving the original
            // behavior. The legacy command had a latent bug (it checked `.privacy` on the
            // Promise.all result array, which was always undefined), so profiles were
            // always shown. To enforce later:
            //   if (isOther && data.privacy === true) return interaction.reply({ content: 'This player has set their profile to private.', ephemeral: true });

            // No defer: the pagination helper makes the public reply() itself.
            await util.fgoProfiles(target, data, interaction, 'en', false, PAGE_COUNT);
        } catch (err) {
            console.error('[EN-PROFILE]', err);
            if (!interaction.replied && !interaction.deferred) {
                interaction.reply({ content: 'Something went wrong loading that profile.', ephemeral: true }).catch(() => {});
            }
        }
    },
};
