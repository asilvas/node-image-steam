export default class Image {
  info: any;
  buffer: Buffer | null;

  constructor(info?: any, buffer?: Buffer | null) {
    this.info = info || {};
    this.buffer = buffer ?? null;
  }

  get contentType(): string {
    return this.info && 'image/' + this.info.format;
  }

  get ETag(): string | undefined {
    return this.info && this.info.hash && this.info.hash.toString();
  }
}
