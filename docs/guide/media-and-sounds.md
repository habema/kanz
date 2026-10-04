# Media and sounds

Media and sounds are set on `/setup` → الهوية والوسائط (identity and media) and الأصوات (sounds). Anything you don't upload uses the built-in default. Each row previews its file (the upload, or the default it replaces); a row with an upload has a button that brings back the default, or removes the upload where there is no default.

## Logo

Optional. Shown next to the quiz name on the board and the control pages. SVG or PNG with a transparent background works best.

## كنز and كشكول celebrations

When a كنز or كشكول tile opens, the main screen celebrates until the host ends it from the admin. Each has its own mode:

| mode | what plays |
|---|---|
| **Picture with music** (صورة وموسيقى) | The picture animates over rays and sparkles/confetti while the celebration music loops. |
| **Video** (فيديو) | The video plays framed, with its own sound, then fades to the animated picture. |

- Both default to picture mode. There is no built-in video: in video mode each shows the picture with music until you upload one.
- Each has its own picture, video and music, all set on its card (the music also appears under الأصوات). The كشكول music defaults to the same track as the كنز.
- The onboarding's كنز and كشكول step shows the same cards, together with the points.

## Background music

A track that loops quietly whenever nothing else plays, fading out under other sounds. The host turns it on or off and sets its volume from the admin's soundboard.

## Game sounds

Played automatically at their moments, each replaceable:

| sound | when |
|---|---|
| question-open | a plain question opens |
| suspense | loops after the tile opens until the answer is shown or the tile closes |
| kanz / kashkool | celebration music in picture mode |
| correct / wrong | answer shown as correct / wrong |
| whoosh | leaderboard reveal: each card |
| drumroll | leaderboard reveal: top-3 spotlight before the name |
| clapping | leaderboard reveal: 2nd and 3rd place named |
| fanfare | leaderboard reveal: the champion |
| applause | leaderboard reveal: the final pyramid |

## Soundboard

The buttons on the admin's soundboard are a list you edit under الأصوات → لوحة المؤثرات:

- **Add sounds**: upload one or several files at once; each becomes a button named after its file.
- **Rename**, **reorder**, **replace the file** or **delete** any button, and preview it.
- **إعادة تعيين** (reset), shown once the list has been edited, brings back the 8 built-in buttons: صح (correct), خطأ (wrong), تصفيق (applause), ضحك (laugh), طبول (drumroll), عدّ تنازلي (10-second countdown), انتهى الوقت (time's up) and ترومبون حزين (sad trombone).

Until you edit the list, the built-in buttons are used. The admin's **stop** button silences the current clip, the celebration music and the suspense loop; background music keeps playing.

## Files

Accepted uploads, up to 100 MB each:

| kind | types |
|---|---|
| images | PNG, JPEG, GIF, WebP, SVG |
| audio | MP3, WAV, OGG, M4A, AAC |
| video | MP4, WebM |

Uploads are stored in the `media` Docker volume under content-hash names and served from `/api/media/…` with a long cache, so replacing a file always gets a new URL.

Sources and licenses of the built-in media are in `apps/web/public/sounds/SOURCES.md`.
