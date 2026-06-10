import { hash } from './xxhash.ts';

export default function getHashFromImage(image: { buffer: Buffer }): number {
  // IMPORTANT! DO NOT EVER CHANGE MY SEED VALUE UNLESS YOU WANT TO INVALIDATE
  //            EXISTING PROCESSED IMAGES!
  return hash(image.buffer, 0xabcd1133);
}
