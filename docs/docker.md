# Running the bot from the Docker image

CI builds a Docker image on every push to `main` and on `v*` tags and publishes it
to the GitHub Container Registry (GHCR):

```
ghcr.io/r-grandorder/mandricardobot-fgo-friend-id-discord-bot
```

## Tags

- `latest`: the most recent build of the default branch (`main`).
- `sha-<short>`: one immutable tag per commit (for example `sha-9712a37`). Pin to this for reproducible deploys.
- `<version>` and `<major>.<minor>`: published when a `v*` tag is pushed (for example `v1.2.3` produces `1.2.3` and `1.2`).

## Configuration is not baked into the image

The bot token and IDs live in `config/config.js`, which is deliberately kept out of
the image. The SQLite database under `db/` is runtime state and is also excluded.
Provide both at run time with mounts.

First create your config from the template and fill it in:

```
cp config/config.js.example config/config.js
```

Then run:

```
docker run -d --name mandricardo \
  -v "$(pwd)/config/config.js:/usr/src/bot/config/config.js:ro" \
  -v mandricardo-db:/usr/src/bot/db \
  ghcr.io/r-grandorder/mandricardobot-fgo-friend-id-discord-bot:latest
```

- The config file is mounted read-only.
- `mandricardo-db` is a named volume, so saved profiles survive restarts and image updates.

## Building locally

```
docker build -t mandricardo .
docker run -d --name mandricardo \
  -v "$(pwd)/config/config.js:/usr/src/bot/config/config.js:ro" \
  -v mandricardo-db:/usr/src/bot/db \
  mandricardo
```

The image targets `linux/amd64`. better-sqlite3 is compiled during the build, so a
cold build is slower; CI reuses the layer cache on later runs.
