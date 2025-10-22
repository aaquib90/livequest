/*
  Parse a local markdown table exported from fantasy.premierleague.com into JSON.
  Input columns: | Player | Team | Points | Cost |
  We ignore Points and Cost.
*/

const fs = require("node:fs");
const path = require("node:path");

function parseMarkdownTable(md) {
  const lines = md.split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (/^\|\s*Player\s*\|/i.test(trimmed)) continue; // header
    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 2) continue;
    const [player, team] = cells;
    if (!player || !team) continue;
    rows.push({ name: player, team });
  }
  return dedupeRows(rows);
}

function dedupeRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = `${r.name}__${r.team}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: node ./src/scripts/generate-epl-players.cjs <absolute-path-to-md>");
    process.exit(1);
  }
  const md = fs.readFileSync(inputPath, "utf8");
  const rows = parseMarkdownTable(md);
  const outDir = path.join(process.cwd(), "src", "data");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "players-epl.json");
  fs.writeFileSync(outPath, JSON.stringify(rows, null, 2) + "\n", "utf8");
  console.log(`Wrote ${rows.length} players to ${outPath}`);
}

main();


