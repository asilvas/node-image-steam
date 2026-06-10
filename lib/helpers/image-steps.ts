import { hash } from './xxhash.ts';

export function getHashFromSteps(imageSteps: unknown): number {
  // IMPORTANT! DO NOT EVER CHANGE MY SEED VALUE UNLESS YOU WANT TO INVALIDATE
  //            EXISTING PROCESSED IMAGES!
  return hash(Buffer.from(JSON.stringify(imageSteps)), 0xabcd1133);
}
