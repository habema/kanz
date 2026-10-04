# Security

The app is meant for a **trusted local network**.

- One admin password guards `/setup`, `/admin` and `/mc`, and every API route under `/api/admin`. It is hashed with scrypt and stored in the database.
- A signed, HTTP-only cookie keeps a device signed in for 24 hours. The signature is bound to the password hash, so resetting the password signs every device out.
- After 10 wrong passwords, an address must wait 15 minutes before trying again.
- The main screen (`/`) is public and never reveals answers or the position of كنز/كشكول tiles before they open.

## The first visitor sets the password

Until a password exists, whoever opens a control page creates it. Do the [onboarding](./onboarding) right after starting the app, before others join the network.

## Exposing it beyond the LAN

The bundled setup serves plain HTTP. If the app must be reachable from outside, put an HTTPS reverse proxy in front of it, and set `COOKIE_SECURE=true` for the API in `docker-compose.yml` so the cookie is only sent over HTTPS.

## Resetting the password

There is no reset screen. To clear the password while keeping the game and scores, remove it from the live state row:

```sh
docker compose exec db psql -U postgres -d kanz \
  -c "UPDATE live_game SET state = state - 'passwordHash' WHERE id = 1;"
```

The next visitor to a control page creates a new one. `docker compose down -v` also clears it, along with everything else (game, scores and uploads).
