# Getting started

## The three screens

| page | who uses it | where |
|---|---|---|
| **Main screen** (`/`) | the audience | the computer running the app, shared or cast to a projector or TV |
| **Admin** (`/admin`) | the host, who runs the game | another screen or device |
| **MC room** (`/mc`), optional | a co-host reading out questions | a phone or tablet |

The main screen is view-only: everything on it follows the admin. The MC room is read-only and shows every answer.

## Requirements

- Docker with Compose, on the computer that shows the main screen.
- For the admin and MC room on other devices: the same network as that computer.

## Install and run

```sh
git clone https://github.com/habema/kanz.git && cd kanz
cp .env.example .env
# Put a long random string in SESSION_SECRET, e.g. the output of: openssl rand -hex 32
docker compose up --build -d
```

`.env` holds these settings:

| variable | meaning |
|---|---|
| `SESSION_SECRET` | Signs the host's login cookie. Required. |
| `WEB_PORT` | Port for every page (default `8000`). |

Open <http://localhost:8000>. On a fresh install the main screen shows a welcome with a link to `/setup`, where the [onboarding wizard](./onboarding) starts by creating the admin password. **Do this right after starting**: whoever opens a control page first sets the password.

## Opening the screens

1. On the computer, open <http://localhost:8000/> full screen, share or cast it, and click it once to allow sound.
2. On another device, open `/admin` at the computer's address, for example `http://192.168.1.20:8000/admin`. (`ipconfig getifaddr en0` on a Mac, `hostname -I` on Linux or `ipconfig` on Windows shows the address.)
3. Optionally, open `/mc` the same way on the co-host's phone or tablet.

Once built, the app needs no internet connection: fonts, sounds and media are all served locally.

## Data

Compose keeps two volumes:

| volume | contents |
|---|---|
| `db-data` | Postgres: the game configuration, scores and the password hash |
| `media` | Files uploaded from `/setup` (logo, images, videos, sounds) |

Both survive `docker compose up --build`. `docker compose down -v` deletes both, so you start over with onboarding.

## Plain HTTP and cookies

The bundled setup serves plain HTTP on the LAN, so `docker-compose.yml` sets `COOKIE_SECURE=false` for the API. If you put the app behind HTTPS, set `COOKIE_SECURE=true` so the login cookie is marked `Secure`. See [Security](./security).
