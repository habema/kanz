# Importing questions

Questions can be typed in on `/setup` → الأسئلة (or in the onboarding questions step), or imported from a spreadsheet with **استيراد من Excel**.

## Excel and CSV layout

One row per tile, in board order, with a header row:

| الفئة | النوع | النص | الإجابة |
|---|---|---|---|
| علوم | سؤال | ما الكوكب الملقب بالكوكب الأحمر؟ | المريخ |
| | كشكول | تحدي الأكواب: ابنِ هرماً من عشرة أكواب | |
| | كنز | ما الرمز الكيميائي للذهب؟ | Au |
| جغرافيا | سؤال | ما عاصمة اليابان؟ | طوكيو |

- **Headers** can be Arabic or English: `الفئة`/`category`, `النوع`/`type`, `النص`/`السؤال`/`text`/`question`, `الإجابة`/`الجواب`/`answer`. The header row needs the text column and at least one other; other columns are ignored.
- **Type**: `سؤال`/`question` (or empty) for a question, `كنز`/`kanz`/`treasure` for a question worth the كنز multiplier, `كشكول`/`kashkool`/`challenge`/`تحدي` for a challenge (its answer is ignored).
- **A blank category** continues the category of the row above.
- **No category column:** each sheet becomes one category, named after the sheet. A CSV has no sheet name, so it needs the category column.
- Leading emoji are stripped from text. In answers, a `الجواب:` prefix and a trailing full stop are stripped too.
- **CSV** uses the same columns. Save it as UTF-8.

**تنزيل ملف Excel** downloads the current questions in this layout (the sample game if nothing is written yet), so you can edit them in Excel and import them back. A copy of the template is in the repository at `examples/questions-template.xlsx`.

## What happens on import

- The imported categories **replace** the current ones (you are asked first).
- If the file marks **no كنز at all**, one random question in each category becomes the كنز; if it marks any, nothing is added.
- Imported categories get fresh ids, so a game in progress never confuses them with old tiles.
- Review the result, then save.

## Backup (JSON)

**نسخة احتياطية**, at the bottom of `/setup`, downloads the whole game as one JSON file: title, points, categories, teams, rounds, media and soundboard. Uploaded files are not in it, only links to them, so on another install uploads must be added again. **استعادة نسخة** loads such a file and replaces everything (you are asked first); it is also offered on the first onboarding step. Example: `examples/sample-game.json` in the repository.

## During a game

Once any tile has been played, you can still edit text, answers, points and media. Changing the board's structure is refused until you press **بدء لعبة جديدة** (start a new game), which clears scores and played tiles. Structure here means adding, removing or reordering tiles or categories, changing which tiles are كنز or كشكول, or changing the number of teams. While a game runs, `/setup` also disables reordering tiles and adding or removing teams, since recorded plays refer to tiles by position and teams by number.
