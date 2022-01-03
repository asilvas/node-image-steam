const sharp = require('sharp');

const IN_FILE = process.argv[2] || './test/files/steam-engine.jpg';
const OUT_FILE = process.argv[3] || './node16-bug.avif';

sharp(IN_FILE).avif().toFile(OUT_FILE);
