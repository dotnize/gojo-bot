# Fun Command Ideas

Ideas to revisit after `/pick` and `/fortune`. The simplest useful version is listed first so
each command can start small.

## Easy

### `/rate`

Give a harmless subject a playful score and comment. Consider deriving the score
from the subject text so repeated ratings stay consistent. Avoid rating bodies or sensitive
personal traits.

No external API, package, persistence, or additional gateway intent is needed.

### `/prompt`

Return a random prompt from a selected category such as photo, drawing, voice chat, real-world
activity, hobbies, or community. Keep prompts in local curated lists.

No external API, package, persistence, or additional gateway intent is needed.

### `/confetti`

Celebrate a member or accomplishment with an embed, emoji, and a randomly selected bundled image
or GIF. Start with repository assets rather than dynamically generating an animation.

No external API or package is needed for the basic version.

### `/vibe-check`

Create a colorful embed using the member's avatar, a random vibe title, emoji, description, and
score. A later version could render a custom image card.

The embed version needs no new package. A rendered card would likely need a canvas package.

## Medium

### `/milestone`

Show how long a selected member has been in the server. A later automatic version could announce
meaningful server anniversaries in a configured channel.

The on-demand version is straightforward. Automatic announcements need scheduling, reliable member
access, persistence to prevent duplicate posts, and possibly the Guild Members intent.

### `/decision-wheel`

Present several choices with a dramatic visual reveal. Start with an embed; consider an animated
wheel or a **Spin Again** button later.

An embed needs no new package. Animation needs image-generation tooling, while buttons require
component interaction handling beyond the current slash-command-only handler.

### `/random-member`

Select an eligible member for a giveaway, spotlight, or harmless activity. Prefer an opt-in role and
allow configured roles, bots, or staff to be excluded.

Reliable server-wide selection may require fetching members and enabling the Guild Members intent.

## Larger Features

### `/match`

Pair opted-in members for a community prompt or activity. Define how members join and leave the
pool, prevent self-matches, and optionally avoid recent repeat pairings.

An opt-in role can support a basic version. More control requires persistence; voice-channel
matching would require the Guild Voice States intent.

### `/profile-card`

Generate a custom visual card containing a member's avatar, join date, selected role, and community
badges. It should add personality beyond Discord's existing profile display.

The visual version likely needs a canvas package, bundled fonts and assets, avatar downloading, and
careful layout handling.

### `/birthday`

Let members register, edit, remove, and optionally hide a month-and-day birthday. Post celebrations
in a configured channel without requiring a birth year.

This needs persistent storage, periodic scheduling, a time-zone policy, privacy controls, and
duplicate-announcement prevention. A cron package is optional; reliable storage is not.
