# Onboarding

On a fresh install the main screen (`/`) shows a welcome with a link to `/setup`, which runs a wizard. Until the wizard saves a game, `/admin` and `/mc` redirect to `/`. The main screen keeps polling and switches to the board on its own once the game is saved, and plays no background music before then.

The draft lives in the browser tab (`sessionStorage`), so reloading the page doesn't lose it. Nothing reaches the screens until the final save. Everything can be changed afterwards from `/setup`.

## 1. Admin password

The first visitor creates the admin password (كلمة مرور الإدارة), at least 6 characters. It guards `/setup`, `/admin` and `/mc`, and is used on every device that runs the game. Once created, this step is marked done; if the session expires before the wizard finishes, `/setup` asks for the password and the draft is kept.

## 2. Name (الاسم)

- **Quiz name** (required), an optional **subtitle** shown at the bottom of the board, and an optional **logo** (SVG or PNG with transparency).
- **استعادة نسخة** restores a backup (a full JSON configuration) from another install.

The teams and questions steps start filled with the sample game (6 teams, 4 categories) for you to edit or replace.

## 3. Teams (الفرق)

At least two teams, each with a name (up to 40 characters) and a colour. The sample's six teams are filled in to start with. Names can also be changed during the game from the admin's corrections tab.

## 4. Questions (الأسئلة)

Each category is a column on the board, and each row is one tile in order of difficulty: the first row is worth the least.

- **Points** (النقاط), at the top: the first tile's value (each later tile adds the same again), the flat كشكول points, and the كنز multiplier.
- **+ سؤال** adds a question (text and answer).
- **كشكول** adds a challenge row (text only, no answer). Add as many as you like, anywhere in the column.
- The **gem button** on a question marks it as a كنز (treasure). **كنز عشوائي** replaces the category's كنز with random questions; the counter beside it sets how many (0 removes them all), and follows the gems you mark.
- Reorder rows with the arrows, or drag the handle on the left (desktop).
- **تنزيل ملف Excel** / **استيراد من Excel** move the questions through a spreadsheet; see [Importing questions](./questions-import).

To move on, every category needs a name, every row needs text, and every question needs an answer.

## 5. Rounds (الجولات)

The [schedule](./schedule) is switched on when you reach this step. Choose بلا جدول (no schedule) to let the host pick freely.

## 6. كنز and كشكول

Their celebrations: for each, a **picture with music** or a **video** (with its own sound) followed by the picture, with a preview of every file. Pictures and music have built-in defaults; a video has to be uploaded. See [Media and sounds](./media-and-sounds). The soundboard and other sounds come ready to use and can be changed later under `/setup` → الأصوات.

## 7. Review (المراجعة)

The review shows a summary with an edit link for each part, plus any problems that block saving. **حفظ وتجهيز المسابقة** saves the game. If tiles were played on the sample game before this first save, they are cleared.

## Ready

The ready screen lists the three pages (main screen, admin and MC room) with their URLs on the address the setup was opened from. To open them from other devices, use the computer's network address instead; see [Opening the screens](./getting-started#opening-the-screens). **متابعة تعديل الإعداد** opens the regular tabbed setup editor.
