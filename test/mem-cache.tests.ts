import { expect } from 'chai';
import MemCache from '../lib/storage/mem-cache.ts';

function image(bytes: number): any {
  return { info: {}, buffer: Buffer.alloc(bytes) };
}

describe('#MemCache', () => {
  it('defaults', () => {
    const cache = new MemCache();
    expect(cache.maxSize).to.equal(100 * 1024 * 1024);
    expect(cache.ttsMs).to.equal(30000);
  });

  it('get returns undefined on miss', () => {
    const cache = new MemCache();
    expect(cache.get('nope')).to.be.undefined;
  });

  it('set/get roundtrip', () => {
    const cache = new MemCache();
    const img = image(100);
    img.info.byteSize = 100;
    cache.set('a', img);
    const hit = cache.get('a');
    expect(hit.buffer).to.equal(img.buffer); // buffer shared
    expect(hit.info).to.deep.equal(img.info);
    expect(cache.size).to.equal(100);
    expect(cache.count).to.equal(1);
  });

  it('caller mutations of info cannot corrupt the cached entry', () => {
    const cache = new MemCache();
    const img = image(100);
    img.info.byteSize = 100;
    cache.set('a', img);

    img.info.byteSize = 1; // mutate after set
    const hit = cache.get('a');
    expect(hit.info.byteSize).to.equal(100);

    hit.info.byteSize = 2; // mutate a fetched copy
    expect(cache.get('a').info.byteSize).to.equal(100);
  });

  it('overwriting a key replaces accounting', () => {
    const cache = new MemCache();
    cache.set('a', image(100));
    cache.set('a', image(50));
    expect(cache.size).to.equal(50);
    expect(cache.count).to.equal(1);
  });

  it('ignores empty or oversized images', () => {
    const cache = new MemCache({ maxSize: 100 });
    cache.set('empty', { info: {}, buffer: null });
    cache.set('big', image(101));
    expect(cache.count).to.equal(0);
  });

  it('evicts least-recently-used beyond maxSize', () => {
    const cache = new MemCache({ maxSize: 250 });
    cache.set('a', image(100));
    cache.set('b', image(100));
    cache.get('a'); // refresh recency of `a`
    cache.set('c', image(100)); // exceeds budget -> evicts `b`
    expect(cache.get('b')).to.be.undefined;
    expect(cache.get('a')).to.not.be.undefined;
    expect(cache.get('c')).to.not.be.undefined;
    expect(cache.size).to.equal(200);
  });

  it('expires entries after tts', async () => {
    const cache = new MemCache({ tts: 0.01 });
    cache.set('a', image(100));
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(cache.get('a')).to.be.undefined;
    expect(cache.size).to.equal(0);
  });

  it('clear resets everything', () => {
    const cache = new MemCache();
    cache.set('a', image(100));
    cache.clear();
    expect(cache.count).to.equal(0);
    expect(cache.size).to.equal(0);
    expect(cache.get('a')).to.be.undefined;
  });
});
