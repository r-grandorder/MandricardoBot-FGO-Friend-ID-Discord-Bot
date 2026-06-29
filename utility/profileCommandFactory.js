// EN and JP profile commands are identical apart from the locale, so they are
// generated from one place. Each factory returns a ready-to-load slash-command
// module (name, description, options, permissions, run) for the given locale.
// The locale drives the command name, the db key, the embed locale, the display
// label, and the log tags; nothing else differs between EN and JP.
const util = require('./util.js');
const cfg = require('../config/config.js');
const PAGE_COUNT = cfg.SupportPages.PAGE_COUNT;

const LABEL = { en: 'EN', jp: 'JP' };   // display text + log-tag prefix
const KEYCAP = { en: 'En', jp: 'Jp' };  // db key segment: fgoProfile_En_ / fgoProfile_Jp_
const PERMISSIONS = { DEFAULT_MEMBER_PERMISSIONS: 'SendMessages' };

const keyFor = (locale, userId) => `fgoProfile_${KEYCAP[locale]}_${userId}`;

// Edit-command option list: core fields, one attachment option per support page,
// then the bulk support-clear field. Identical for every locale.
function buildEditOptions() {
    const options = [
        { name: 'name', description: 'Your in-game name (IGN).', type: 3, required: false },
        { name: 'id', description: 'Your Friend ID.', type: 3, required: false },
        { name: 'description', description: 'A short note shown below your IGN and Friend ID.', type: 3, required: false, max_length: 1000 },
        { name: 'clear_description', description: 'Remove your saved description.', type: 5, required: false },
        { name: 'privacy', description: 'Hide your profile from others (true = private).', type: 5, required: false },
    ];
    for (let i = 1; i <= PAGE_COUNT; i++) {
        options.push({ name: `support${i}`, description: `Support-list image for profile page ${i}.`, type: 11, required: false });
    }
    options.push({ name: 'clear_supports', description: 'Support page number(s) to remove, e.g. 1,3 or all.', type: 3, required: false });
    return options;
}

// /<locale>-profile: view a saved profile (yours or another player's).
function makeProfileView(locale) {
    const LOC = LABEL[locale];
    return {
        name: `${locale}-profile`,
        description: `View a saved FGO ${LOC} profile (yours or another player's).`,
        type: 1,
        options: [
            { name: 'user', description: 'Whose profile to view (defaults to you).', type: 6, required: false },
        ],
        permissions: PERMISSIONS,
        run: async (client, interaction, config, db) => {
            try {
                const target = interaction.options.getUser('user') || interaction.user;
                const isOther = target.id !== interaction.user.id;

                const raw = await db.get(keyFor(locale, target.id));
                if (!raw) {
                    return interaction.reply({
                        content: isOther
                            ? 'Cannot find a profile for that player.'
                            : `You have no ${LOC} profile yet. Use \`/${locale}-profile-edit\` to create one.`,
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
                await util.fgoProfiles(target, data, interaction, locale, PAGE_COUNT);
            } catch (err) {
                console.error(`[${LOC}-PROFILE]`, err);
                if (!interaction.replied && !interaction.deferred) {
                    interaction.reply({ content: 'Something went wrong loading that profile.', ephemeral: true }).catch(() => {});
                }
            }
        },
    };
}

// /<locale>-profile-edit: save or edit a profile's core fields and support images.
function makeProfileEdit(locale) {
    const LOC = LABEL[locale];
    return {
        name: `${locale}-profile-edit`,
        description: `Save or edit your FGO ${LOC} profile (IGN, Friend ID, description, support images, privacy).`,
        type: 1,
        options: buildEditOptions(),
        permissions: PERMISSIONS,
        run: async (client, interaction, config, db) => {
            try {
                // Public defer so the pagination helper can editReply and the confirmation
                // followUp is safely ordered after the profile.
                await interaction.deferReply();

                const key = keyFor(locale, interaction.user.id);
                const raw = await db.get(key);
                const profile = raw ? JSON.parse(raw) : {};

                let modified = false;
                let imageWarning = false; // set when an upload could not be re-hosted
                const name = interaction.options.getString('name');
                const id = interaction.options.getString('id');
                const description = interaction.options.getString('description');
                const clearDescription = interaction.options.getBoolean('clear_description');
                const privacy = interaction.options.getBoolean('privacy'); // null when omitted
                if (name !== null) { profile.name = name; modified = true; }
                if (id !== null) { profile.id = id; modified = true; }
                // Discord never submits an empty string option, so a typed description is always
                // non-empty; clearing needs its own flag. A typed value wins over the clear flag.
                if (description !== null) { profile.description = description.trim(); modified = true; }
                else if (clearDescription) { delete profile.description; modified = true; }
                if (privacy !== null) { profile.privacy = privacy; modified = true; }
                // Clear one or more support pages. Accepts "all" or any list of numbers
                // (1,3 / 1 3 / etc.); out-of-range and junk entries are ignored. An upload of
                // the same page below wins, so an image can be swapped in the same command.
                const clearSupports = interaction.options.getString('clear_supports');
                if (clearSupports !== null) {
                    const pages = /^\s*all\s*$/i.test(clearSupports)
                        ? Array.from({ length: PAGE_COUNT }, (_, i) => i + 1)
                        : [...new Set((clearSupports.match(/\d+/g) || []).map(Number))].filter(n => n >= 1 && n <= PAGE_COUNT);
                    for (const n of pages) delete profile[`support${n}`];
                    if (pages.length) modified = true;
                }
                // Collect uploaded support images, then re-host them into this channel so
                // their URLs persist (option uploads are ephemeral and get deleted).
                const uploads = [];
                for (let i = 1; i <= PAGE_COUNT; i++) {
                    const att = interaction.options.getAttachment(`support${i}`);
                    if (att) uploads.push({ page: i, url: att.url });
                }
                if (uploads.length) {
                    const { urls: hosted, persisted } = await util.rehostImages(interaction.channel, uploads.map(u => u.url));
                    uploads.forEach((u, idx) => { profile[`support${u.page}`] = hosted[idx]; });
                    if (!persisted) imageWarning = true;
                    modified = true;
                }

                if (!modified) {
                    return interaction.editReply('Provide at least one field to update (name, id, description, clear_description, privacy, a support image, or clear_supports).');
                }

                console.log(`[${LOC}-PROFILE-EDIT] by ${interaction.user.id}`, profile);
                await db.set(key, JSON.stringify(profile));

                // Deferred above, so the helper editReplies. Only pages with images are shown.
                await util.fgoProfiles(interaction.user, profile, interaction, locale, PAGE_COUNT);
                interaction.followUp({ content: 'Profile saved successfully.' + (imageWarning ? util.REHOST_FALLBACK_NOTE : ''), ephemeral: true }).catch(() => {});
            } catch (err) {
                console.error(`[${LOC}-PROFILE-EDIT]`, err);
                const msg = { content: 'Something went wrong saving your profile.', ephemeral: true };
                (interaction.deferred || interaction.replied ? interaction.followUp(msg) : interaction.reply(msg)).catch(() => {});
            }
        },
    };
}

// /<locale>-profile-edit-support: set one support page's image (upload or url).
function makeProfileEditSupport(locale) {
    const LOC = LABEL[locale];
    return {
        name: `${locale}-profile-edit-support`,
        description: `Set the support-list image for one page of your FGO ${LOC} profile.`,
        type: 1,
        options: [
            { name: 'page', description: 'Profile page to set.', type: 4, required: true, min_value: 1, max_value: PAGE_COUNT },
            { name: 'image', description: 'Upload the support image.', type: 11, required: false },
            { name: 'url', description: 'Direct image URL (used instead of an attachment).', type: 3, required: false },
        ],
        permissions: PERMISSIONS,
        run: async (client, interaction, config, db) => {
            try {
                const page = interaction.options.getInteger('page');
                const image = interaction.options.getAttachment('image');
                const url = interaction.options.getString('url');

                if (!(url && url.trim()) && !image) {
                    return interaction.reply({ content: 'Provide either an image attachment or a url.', ephemeral: true });
                }

                await interaction.deferReply();

                // url wins over the attachment, matching the legacy template behavior. An
                // uploaded image is re-hosted into this channel so its URL persists (option
                // uploads are ephemeral and Discord deletes them after a few days).
                let value;
                let imageWarning = false; // set when the upload could not be re-hosted
                if (url && url.trim()) {
                    value = url.trim();
                } else {
                    const result = await util.rehostImages(interaction.channel, [image.url]);
                    value = result.urls[0];
                    imageWarning = !result.persisted;
                }

                const key = keyFor(locale, interaction.user.id);
                const raw = await db.get(key);
                const profile = raw ? JSON.parse(raw) : {};

                profile[`support${page}`] = value;
                console.log(`[${LOC}-PROFILE-EDIT-SUPPORT] page ${page} by ${interaction.user.id}`);
                await db.set(key, JSON.stringify(profile));

                await util.fgoProfiles(interaction.user, profile, interaction, locale, PAGE_COUNT);
                interaction.followUp({ content: 'Profile saved successfully.' + (imageWarning ? util.REHOST_FALLBACK_NOTE : ''), ephemeral: true }).catch(() => {});
            } catch (err) {
                console.error(`[${LOC}-PROFILE-EDIT-SUPPORT]`, err);
                const msg = { content: 'Something went wrong saving your support page.', ephemeral: true };
                (interaction.deferred || interaction.replied ? interaction.followUp(msg) : interaction.reply(msg)).catch(() => {});
            }
        },
    };
}

module.exports = { makeProfileView, makeProfileEdit, makeProfileEditSupport };
