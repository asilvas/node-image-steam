import http from 'node:http';
import sharp from 'sharp';

const IMAGE_URL =
  'http://blobby.wsimg.com/go/0296993c-cade-4ae8-8a65-b3172f22a3a0/6e14af04-904c-4654-936e-2bd7e6e08dd8.jpg';

function getImage(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    http
      .get(IMAGE_URL, (res) => {
        if (res.statusCode !== 200)
          return void reject(new Error(`Invalid response: ${res.statusCode}`));

        const chunks: Buffer[] = [];

        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      })
      .on('error', reject);
  });
}

const imageData = await getImage();

const image = sharp(imageData);

// the below options won't matter, including output format.. anything will result in:
//   Error: VipsJpeg: Invalid SOS parameters for sequential JPEG
//   VipsJpeg: out of order read at line 0
await image.withMetadata().resize(640, 480).toFormat('jpeg').toBuffer();
