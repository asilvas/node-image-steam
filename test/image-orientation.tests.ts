import http from 'node:http';
import { expect } from 'chai';
import sharp from 'sharp';
import isteam from '../lib/index.ts';
import serverOptions from './image-server.config.ts';

// angel.jpg stores 4032x3024 (landscape) pixels with EXIF Orientation 6,
// meaning it must display as portrait (3024 wide, 4032 high). The processor
// bakes that rotation into the pixels, so the output must NOT retain an
// EXIF Orientation tag or EXIF-honoring browsers (e.g. Safari with WebP)
// rotate the image a second time.

const WEBP_ACCEPT = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8';

function getImage(
  path: string,
  headers: any = {}
): Promise<{ status: number; headers: any; body: Buffer }> {
  return new Promise((resolve, reject) => {
    http
      .get(
        { host: 'localhost', port: 13337, path, headers, agent: false },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({
              status: res.statusCode as number,
              headers: res.headers,
              body: Buffer.concat(chunks),
            })
          );
        }
      )
      .on('error', reject);
  });
}

describe('#Image Orientation (EXIF)', function () {
  this.timeout(10000);

  let server: any;

  before(function () {
    server = isteam.http.start(serverOptions);
  });

  after(function () {
    isteam.http.stop(server);
  });

  it('bakes orientation into pixels and neutralizes EXIF Orientation (webp)', async function () {
    const res = await getImage('/angel.jpg/:/rs=w:640?cache=false', {
      accept: WEBP_ACCEPT,
    });
    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.equal('image/webp');
    const meta = await sharp(res.body).metadata();
    expect(`${meta.width}x${meta.height}`).to.equal('640x853'); // portrait
    expect(meta.orientation || 1).to.equal(1); // no stale rotation tag
  });

  it('bakes orientation into pixels and neutralizes EXIF Orientation (jpeg)', async function () {
    const res = await getImage('/angel.jpg/:/rs=w:640?cache=false');
    expect(res.status).to.equal(200);
    expect(res.headers['content-type']).to.equal('image/jpeg');
    const meta = await sharp(res.body).metadata();
    expect(`${meta.width}x${meta.height}`).to.equal('640x853'); // portrait
    expect(meta.orientation || 1).to.equal(1); // no stale rotation tag
  });

  it('emits no EXIF Orientation when metadata step is disabled', async function () {
    const res = await getImage('/angel.jpg/:/rs=w:640/md=e:false?cache=false');
    expect(res.status).to.equal(200);
    const meta = await sharp(res.body).metadata();
    expect(`${meta.width}x${meta.height}`).to.equal('640x853'); // portrait
    expect(meta.orientation).to.equal(undefined); // no metadata at all
  });

  it('composes explicit rotation with EXIF orientation and neutralizes the tag', async function () {
    // orientation (90deg) + explicit 90deg = 180deg net, so pixel dimensions
    // remain landscape and no further browser rotation may occur
    const res = await getImage('/angel.jpg/:/rt=d:90/rs=w:640?cache=false');
    expect(res.status).to.equal(200);
    const meta = await sharp(res.body).metadata();
    expect(`${meta.width}x${meta.height}`).to.equal('640x480'); // landscape
    expect(meta.orientation || 1).to.equal(1); // no stale rotation tag
  });

  it('neutralizes EXIF Orientation when processed from cached optimized original', async function () {
    // first request generates + caches the optimized original (which keeps
    // its EXIF orientation), second request is processed from that artifact
    await getImage('/angel.jpg/:/rs=w:200', { accept: WEBP_ACCEPT });
    const res = await getImage('/angel.jpg/:/rs=w:201', {
      accept: WEBP_ACCEPT,
    });
    expect(res.status).to.equal(200);
    const meta = await sharp(res.body).metadata();
    expect(`${meta.width}x${meta.height}`).to.equal('201x268'); // portrait
    expect(meta.orientation || 1).to.equal(1); // no stale rotation tag
  });

  it('optimized original retains the original EXIF orientation', async function () {
    // the optimized original intentionally has no rotate step: its pixels
    // stay as stored and the EXIF Orientation tag remains authoritative
    const res = await getImage('/angel.jpg/:/rs=w:200?optimized=true', {
      accept: WEBP_ACCEPT,
    });
    expect(res.status).to.equal(200);
    const meta = await sharp(res.body).metadata();
    expect(`${meta.width}x${meta.height}`).to.equal('2560x1920'); // as stored
    expect(meta.orientation).to.equal(6); // EXIF still authoritative
  });
});
