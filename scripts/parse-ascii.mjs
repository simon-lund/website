import fs from 'fs';

const html = fs.readFileSync('ascii/41208671.html', 'utf8');

const COLORS = [
	'#555', '#0aa', '#aaa', '#55f', '#00a', '#a0a',
	'#000', '#a00', '#0a0', '#a50', '#fff', '#5ff',
	'#ff5', '#f55', '#5f5', '#f5f',
];

const colorIndex = Object.fromEntries(COLORS.map((c, i) => [c, i]));

// Parse each line
const lines = html.split(/<br\s*\/?>/i);
const grid = [];

for (const line of lines) {
	const row = [];
	const spanRe = /<span style="[^"]*color:(#[0-9a-f]{3,6});background-color:(#[0-9a-f]{3,6})"[^>]*>([^<]*)<\/span>/gi;
	let m;
	while ((m = spanRe.exec(line)) !== null) {
		const fg = m[1];
		const bg = m[2];
		const text = m[3];
		for (const char of text) {
			row.push({ char, fg: colorIndex[fg] ?? 0, bg: colorIndex[bg] ?? 0 });
		}
	}
	if (row.length > 0) grid.push(row);
}

console.log(`Parsed: ${grid.length} rows, ${grid[0]?.length} cols`);

// Downsample: take every 3rd col, every 2nd row → ~100×90
const SAMPLE_X = 3;
const SAMPLE_Y = 2;
const sampled = [];

for (let y = 0; y < grid.length; y += SAMPLE_Y) {
	const row = [];
	for (let x = 0; x < grid[y].length; x += SAMPLE_X) {
		row.push(grid[y][x]);
	}
	sampled.push(row);
}

console.log(`Sampled: ${sampled.length} rows, ${sampled[0]?.length} cols`);

const output = {
	colors: COLORS,
	rows: sampled.length,
	cols: sampled[0]?.length ?? 0,
	// Pack as flat arrays for compactness
	chars: sampled.flatMap(row => row.map(c => c.char)),
	fg: sampled.flatMap(row => row.map(c => c.fg)),
	bg: sampled.flatMap(row => row.map(c => c.bg)),
};

fs.writeFileSync('public/ascii-portrait.json', JSON.stringify(output));
console.log(`Written: public/ascii-portrait.json (${(fs.statSync('public/ascii-portrait.json').size / 1024).toFixed(1)}KB)`);
