const util = require('../../../utility/util.js');
const cfg = require('../../../config/config.js');
const PAGE_COUNT = cfg.SupportPages.PAGE_COUNT;

// Build the option list: core fields first, then one attachment option per support page.
const options = [
    { name: 'name', description: 'Your in-game name (IGN).', type: 3, required: false },
    { name: 'id', description: 'Your Friend ID.', type: 3, required: false },
    { name: 'description', description: 'A short note shown below your IGN and Friend ID (blank to clear).', type: 3, required: false, max_length: 1000 },
    { name: 'privacy', description: 'Hide your profile from others (true = private).', type: 5, required: false },
];
for (let i = 1; i <= PAGE_COUNT; i++) {
    options.push({ name: `support${i}`, description: `Support-list image for profile page ${i}.`, type: 11, required: false });
}

module.exports = {
    name: 'jp-profile-edit',
    description: 'Save or edit your FGO JP profile (IGN, Friend ID, description, support images, privacy).',
    type: 1,
    options,
    permissions: {
        DEFAULT_MEMBER_PERMISSIONS: 'SendMessages'
    },
    run: async (client, interaction, config, db) => {
        try {
            // Public defer so the pagination helper can editReply and the confirmation
            // followUp is safely ordered after the profile.
            await interaction.deferReply();

            const key = `fgoProfile_Jp_${interaction.user.id}`;
            const raw = await db.get(key);
            const profile = raw ? JSON.parse(raw) : {};

            let modified = false;
            const name = interaction.options.getString('name');
            const id = interaction.options.getString('id');
            const description = interaction.options.getString('description');
            const privacy = interaction.options.getBoolean('privacy'); // null when omitted
            if (name !== null) { profile.name = name; modified = true; }
            if (id !== null) { profile.id = id; modified = true; }
            if (description !== null) {
                // Trim, then treat a now-empty value as "clear the note".
                const trimmed = description.trim();
                if (trimmed) profile.description = trimmed; else delete profile.description;
                modified = true;
            }
            if (privacy !== null) { profile.privacy = privacy; modified = true; }
            for (let i = 1; i <= PAGE_COUNT; i++) {
                const att = interaction.options.getAttachment(`support${i}`);
                if (att) { profile[`support${i}`] = att.url; modified = true; }
            }

            if (!modified) {
                return interaction.editReply('Provide at least one field to update (name, id, description, privacy, or a support image).');
            }

            console.log(`[JP-PROFILE-EDIT] by ${interaction.user.id}`, profile);
            await db.set(key, JSON.stringify(profile));

            // Deferred above, so the helper editReplies. Only pages with images are shown.
            await util.fgoProfiles(interaction.user, profile, interaction, 'jp', PAGE_COUNT);
            interaction.followUp({ content: 'Profile saved successfully.', ephemeral: true }).catch(() => {});
        } catch (err) {
            console.error('[JP-PROFILE-EDIT]', err);
            const msg = { content: 'Something went wrong saving your profile.', ephemeral: true };
            (interaction.deferred || interaction.replied ? interaction.followUp(msg) : interaction.reply(msg)).catch(() => {});
        }
    },
};
