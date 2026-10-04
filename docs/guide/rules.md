# Game rules

## Board and tile values

Each category is a column of tiles in the order you list them. Tile *n* is worth *n* × the first tile's value (`pointsStep`, 100 by default): 100, 200, 300, and so on. Order means difficulty: put easier questions first.

## كنز (treasure)

Any question can be marked a كنز, and a category can have several or none. A كنز is worth its tile value × the كنز multiplier (2 by default): a كنز on tile 8 is worth 1600. On the main screen it looks like any other tile until it opens; then a celebration plays before the question.

## كشكول (challenge)

A كشكول is a row with a challenge (a physical or party task) and no answer. A category can have any number of them, anywhere in its column. Whatever its position, it is worth a flat number of points (`kashkoolPoints`, 1000 by default). Like a كنز, it is hidden until opened and starts with a celebration.

Text before the first colon is shown as the challenge's title and the rest as its description, for example `تحدي الأكواب: ابنِ هرماً من عشرة أكواب` (cup challenge: build a pyramid of ten cups).

## Scores

Every opened tile is recorded with the team that won it (if any) and its points. A team's score is always the sum of its recorded awards, so corrections from the admin never leave totals out of step.

## Rounds

Optionally, a [schedule](./schedule) decides which two teams play each tile and which of them picks it. Without a schedule the host picks freely and can award any team.
