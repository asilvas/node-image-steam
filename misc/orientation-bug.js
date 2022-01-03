const fs = require('fs/promises');
const sharp = require('sharp');

/*
imageSteps: [
  {
    name: 'resize',
    width: 2560,
    height: 1920,
    max: 'true',
    canGrow: 'false'
  },
  { name: 'quality', quality: '95' },
  { name: 'metadata', enabled: 'true' },
  { name: 'format', format: 'webp' }
]

resize: 2560 1920 {
  interpolator: 'bicubic',
  fit: 'fill',
  position: 'centre',
  background: null
}
toFormat: webp { quality: 95 }
*/

(async () => {
  const inputBuffer = await fs.readFile('./test/files/Portrait_6.jpg');
  //const inputBuffer = await fs.readFile('./test/files/IMG_20211014_091852131.jpeg');

  const noMetaBuffer = await sharp(inputBuffer).resize(2560, 1920, {
    interpolator: 'bicubic',
    fit: 'fill',
    position: 'centre',
    background: null
  }).toFormat('webp', { quality: 95 }).toBuffer();
  await fs.writeFile('./image-no-meta.webp', noMetaBuffer);

  const withMetaBuffer = await sharp(inputBuffer).resize(2560, 1920, {
    interpolator: 'bicubic',
    fit: 'fill',
    position: 'centre',
    background: null
  }).toFormat('webp', { quality: 95 }).withMetadata().toBuffer();
  await fs.writeFile('./image-with-meta.webp', withMetaBuffer);
})();
