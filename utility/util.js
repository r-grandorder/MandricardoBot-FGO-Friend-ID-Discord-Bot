const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// Persistent pagination controls.
//
// Profile pages are navigated with buttons whose entire state lives in the
// button's customId rather than in an in-memory message-component collector.
// That means the buttons keep working indefinitely - including after the bot
// restarts - because every click is handled fresh from the global
// interactionCreate listener (see handlePaginationButton). On each click the
// page list is rebuilt from the database, so no per-message state is retained.
//
// customId format: fgopage|<dir>|<locale>|<userId>|<edited>|<page>
//   dir    'prev' | 'next'        navigation direction
//   locale 'en' | 'jp'            selects the profile's db key
//   userId profile owner's Discord ID (NOT necessarily the clicker)
//   edited '1' shows every page; '0' shows only pages that have an image
//   page   0-based index of the page currently displayed
const PAGINATION_PREFIX = 'fgopage';
const ID_SEP = '|';

function fgoProfileEmbed(user, data, image) {
  const embed = new EmbedBuilder();
  embed.setTitle("FGO Profile for " + user.username);
  embed.setDescription("\u200b");
  embed.setThumbnail(user.displayAvatarURL());
  embed.addFields(
    { name: 'IGN', value: data.name || "Not Provided" },
    { name: 'Friend ID', value: data.id || "Not Provided" },
  );
  if (image) embed.setImage(image);
  return embed;
}

// Build the ordered list of page embeds for a profile. Shared by the initial
// render and the button handler so a click reproduces the same pages even after
// a restart. In view mode (edited=false) only support slots with a valid image
// URL are shown; in edit mode every slot is shown so the user can review what
// they just saved.
function buildProfilePages(user, data, edited, pageCount) {
  const pages = [];
  for (let i = 1; i <= pageCount; i++) {
    let img = null;
    const candidate = data[`support${i}`];
    if (candidate) {
      try {
        new URL(candidate);
        img = candidate;
      } catch (error) {
        img = null;
      }
    }
    if (img || edited) pages.push(fgoProfileEmbed(user, data, img));
  }
  if (pages.length === 0) pages.push(fgoProfileEmbed(user, data, null));
  return pages;
}

function buildButtonId(dir, locale, userId, edited, page) {
  return [PAGINATION_PREFIX, dir, locale, userId, edited ? '1' : '0', page].join(ID_SEP);
}

function buildPaginationRow(locale, userId, edited, page) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(buildButtonId('prev', locale, userId, edited, page))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('◀️'),
    new ButtonBuilder()
      .setCustomId(buildButtonId('next', locale, userId, edited, page))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('▶️'),
  );
}

// Turn a prebuilt page list into a message payload showing `index`. The footer
// reports the position and the persistent prev/next buttons (which encode
// `index`) are only attached when there is more than one page.
function renderPayload(pages, user, locale, edited, index) {
  let page = Number.isInteger(index) ? index : 0;
  if (page >= pages.length) page = pages.length - 1;
  if (page < 0) page = 0;
  const embed = pages[page].setFooter({ text: `Page ${page + 1} / ${pages.length}` });
  const components = pages.length > 1 ? [buildPaginationRow(locale, user.id, edited, page)] : [];
  return { embeds: [embed], components };
}

// Render the first page of a profile in response to a slash command. The edit
// commands defer first, so we editReply in that case; the view commands do not,
// so we reply.
async function fgoProfiles(user, data, interaction, locale, edited, pageCount) {
  const pages = buildProfilePages(user, data, edited, pageCount);
  const payload = renderPayload(pages, user, locale, edited, 0);
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

function isProfilePaginationId(customId) {
  return typeof customId === 'string' && customId.startsWith(PAGINATION_PREFIX + ID_SEP);
}

// Handle a click on a persistent pagination button. Rebuilds the profile from
// the database, flips the page (with wraparound, matching the old library
// behavior), and edits the message in place. No-op for buttons that aren't
// ours, so it is safe to call for any button interaction.
async function handlePaginationButton(client, interaction, db, pageCount) {
  if (!isProfilePaginationId(interaction.customId)) return;

  const [, dir, locale, userId, editedFlag, pageStr] = interaction.customId.split(ID_SEP);
  const edited = editedFlag === '1';

  const key = locale === 'jp' ? `fgoProfile_Jp_${userId}` : `fgoProfile_En_${userId}`;
  const raw = await db.get(key);
  if (!raw) {
    return interaction.reply({ content: 'That profile is no longer available.', ephemeral: true });
  }
  const data = JSON.parse(raw);

  let user;
  try {
    user = client.users.cache.get(userId) || (await client.users.fetch(userId));
  } catch (err) {
    console.error('[PAGINATION] could not resolve profile owner', userId, err);
    return interaction.reply({ content: 'Could not load that profile.', ephemeral: true });
  }

  const pages = buildProfilePages(user, data, edited, pageCount);
  let page = parseInt(pageStr, 10);
  if (!Number.isInteger(page)) page = 0;
  page = dir === 'next'
    ? (page + 1 < pages.length ? page + 1 : 0)
    : (page > 0 ? page - 1 : pages.length - 1);

  return interaction.update(renderPayload(pages, user, locale, edited, page));
}

module.exports = { fgoProfiles, fgoProfileEmbed, handlePaginationButton, isProfilePaginationId, PAGINATION_PREFIX };
