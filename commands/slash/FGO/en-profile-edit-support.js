const util = require('../../../utility/util.js');
const cfg = require('../../../config/config.js');
const PAGE_COUNT = cfg.SupportPages.PAGE_COUNT;

module.exports = {
    name: 'en-profile-edit-support',
    description: 'Set the support-list image for one page of your FGO EN profile.',
    type: 1,
    options: [
        { name: 'page', description: 'Profile page to set.', type: 4, required: true, min_value: 1, max_value: PAGE_COUNT },
        { name: 'image', description: 'Upload the support image.', type: 11, required: false },
        { name: 'url', description: 'Direct image URL (used instead of an attachment).', type: 3, required: false },
    ],
    permissions: {
        DEFAULT_MEMBER_PERMISSIONS: 'SendMessages'
    },
    run: async (client, interaction, config, db) => {
        try {
            const page = interaction.options.getInteger('page');
            const image = interaction.options.getAttachment('image');
            const url = interaction.options.getString('url');
            // url wins over the attachment, matching the legacy template behavior.
            const value = (url && url.trim()) ? url.trim() : (image ? image.url : null);

            if (!value) {
                return interaction.reply({ content: 'Provide either an image attachment or a url.', ephemeral: true });
            }

            await interaction.deferReply();

            const key = `fgoProfile_En_${interaction.user.id}`;
            const raw = await db.get(key);
            const profile = raw ? JSON.parse(raw) : {};

            profile[`support${page}`] = value;
            console.log(`[EN-PROFILE-EDIT-SUPPORT] page ${page} by ${interaction.user.id}`);
            await db.set(key, JSON.stringify(profile));

            await util.fgoProfiles(interaction.user, profile, interaction, 'en', PAGE_COUNT);
            interaction.followUp({ content: 'Profile saved successfully.', ephemeral: true }).catch(() => {});
        } catch (err) {
            console.error('[EN-PROFILE-EDIT-SUPPORT]', err);
            const msg = { content: 'Something went wrong saving your support page.', ephemeral: true };
            (interaction.deferred || interaction.replied ? interaction.followUp(msg) : interaction.reply(msg)).catch(() => {});
        }
    },
};
