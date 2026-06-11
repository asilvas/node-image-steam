import { expect } from 'chai';
import StorageAWSS3 from '../lib/index.ts';

// minimal fake of S3Client -- records commands, returns queued results
class FakeS3 {
  sent: any[] = [];
  results: any[] = [];

  send(command: any): Promise<any> {
    this.sent.push(command);
    const result = this.results.shift();
    if (result instanceof Error) return Promise.reject(result);
    return Promise.resolve(result);
  }
}

function body(buffer: Buffer) {
  return {
    transformToByteArray: () =>
      Promise.resolve(
        new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      ),
  };
}

function createStorage(opts: any = {}) {
  const client = new FakeS3();
  const storage = new StorageAWSS3({
    bucket: 'test-bucket',
    region: 'us-west-2',
    client,
    ...opts,
  });
  return { client, storage };
}

describe('#StorageAWSS3', () => {
  describe('fetch', () => {
    it('fetches an original by path', (done) => {
      const { client, storage } = createStorage();
      const buf = Buffer.from('image-data');
      client.results.push({
        Body: body(buf),
        Metadata: {},
        LastModified: new Date('2026-01-01'),
      });

      storage.fetch({}, 'some/img.jpg', null as any, (err, info, data) => {
        expect(err).to.not.exist;
        expect(client.sent[0].constructor.name).to.equal('GetObjectCommand');
        expect(client.sent[0].input).to.deep.include({
          Bucket: 'test-bucket',
          Key: 'some/img.jpg',
        });
        expect(info.path).to.equal(encodeURIComponent('some/img.jpg'));
        expect(info.lastModified).to.deep.equal(new Date('2026-01-01'));
        expect(Buffer.isBuffer(data)).to.be.true;
        expect(data.toString()).to.equal('image-data');
        done();
      });
    });

    it('fetches an artifact under isteam/ with pathPrefix and isteam meta', (done) => {
      const { client, storage } = createStorage({ pathPrefix: 'pre/' });
      client.results.push({
        Body: body(Buffer.from('x')),
        Metadata: { isteam: '{"width":10}' },
      });

      storage.fetch({}, 'img.jpg', 'abc123', (err, info) => {
        expect(err).to.not.exist;
        expect(client.sent[0].input.Key).to.equal('isteam/pre/img.jpg/abc123');
        expect(info.width).to.equal(10);
        expect(info.stepsHash).to.equal('abc123');
        done();
      });
    });

    it('decodes encoded path segments, failing safe', (done) => {
      const { client, storage } = createStorage();
      client.results.push({ Body: body(Buffer.from('x')), Metadata: {} });

      storage.fetch({}, 'a%20b/img%.jpg', null as any, (err) => {
        expect(err).to.not.exist;
        expect(client.sent[0].input.Key).to.equal('a b/img%.jpg');
        done();
      });
    });

    it('maps NoSuchKey to statusCode 404', (done) => {
      const { client, storage } = createStorage();
      const s3err: any = new Error('no key');
      s3err.name = 'NoSuchKey';
      client.results.push(s3err);

      storage.fetch({}, 'img.jpg', null as any, (err: any) => {
        expect(err).to.exist;
        expect(err.statusCode).to.equal(404);
        done();
      });
    });

    it('maps other errors to $metadata.httpStatusCode', (done) => {
      const { client, storage } = createStorage();
      const s3err: any = new Error('denied');
      s3err.$metadata = { httpStatusCode: 403 };
      client.results.push(s3err);

      storage.fetch({}, 'img.jpg', null as any, (err: any) => {
        expect(err.statusCode).to.equal(403);
        done();
      });
    });
  });

  describe('store', () => {
    it('puts artifact with metadata and content type', (done) => {
      const { client, storage } = createStorage();
      client.results.push({});

      const image: any = {
        info: { format: 'webp' },
        buffer: Buffer.from('data'),
        contentType: 'image/webp',
      };
      storage.store({}, 'img.jpg', 'abc123', image, (err: any) => {
        expect(err).to.not.exist;
        const { input } = client.sent[0];
        expect(client.sent[0].constructor.name).to.equal('PutObjectCommand');
        expect(input.Key).to.equal('isteam/img.jpg/abc123');
        expect(input.ContentType).to.equal('image/webp');
        expect(image.info.stepsHash).to.equal('abc123');
        expect(JSON.parse(input.Metadata.isteam).stepsHash).to.equal('abc123');
        done();
      });
    });
  });

  describe('touch', () => {
    it('copies object onto itself with replaced metadata', (done) => {
      const { client, storage } = createStorage();
      client.results.push({});

      const image: any = { info: {}, buffer: Buffer.from('d') };
      storage.touch({}, 'img.jpg', 'abc123', image, (err: any) => {
        expect(err).to.not.exist;
        const { input } = client.sent[0];
        expect(client.sent[0].constructor.name).to.equal('CopyObjectCommand');
        expect(input.CopySource).to.equal('/test-bucket/isteam/img.jpg/abc123');
        expect(input.MetadataDirective).to.equal('REPLACE');
        done();
      });
    });
  });

  describe('deleteCache', () => {
    it('lists with the exact artifact prefix (single pathPrefix) and deletes', (done) => {
      const { client, storage } = createStorage({ pathPrefix: 'pre/' });
      client.results.push({
        IsTruncated: false,
        Contents: [{ Key: 'isteam/pre/img.jpg/aaa' }],
      });
      client.results.push({}); // delete result
      client.results.push({ IsTruncated: false, Contents: [] }); // final list

      storage.deleteCache({}, 'img.jpg', (err: any) => {
        expect(err).to.not.exist;
        expect(client.sent[0].constructor.name).to.equal(
          'ListObjectsV2Command'
        );
        expect(client.sent[0].input.Prefix).to.equal('isteam/pre/img.jpg/');
        expect(client.sent[1].constructor.name).to.equal(
          'DeleteObjectsCommand'
        );
        expect(client.sent[1].input.Delete.Objects).to.deep.equal([
          { Key: 'isteam/pre/img.jpg/aaa' },
        ]);
        done();
      });
    });

    it('paginates deletions until exhausted', (done) => {
      const { client, storage } = createStorage();
      client.results.push({
        IsTruncated: true,
        NextContinuationToken: 'next',
        Contents: [{ Key: 'isteam/img.jpg/a' }],
      });
      client.results.push({}); // delete page 1
      client.results.push({
        IsTruncated: false,
        Contents: [{ Key: 'isteam/img.jpg/b' }],
      });
      client.results.push({}); // delete page 2
      client.results.push({ IsTruncated: false, Contents: [] });

      storage.deleteCache({}, 'img.jpg', (err: any) => {
        expect(err).to.not.exist;
        const deletes = client.sent.filter(
          (c) => c.constructor.name === 'DeleteObjectsCommand'
        );
        expect(deletes.length).to.equal(2);
        done();
      });
    });

    it('completes immediately when nothing to delete', (done) => {
      const { client, storage } = createStorage();
      client.results.push({ IsTruncated: false, Contents: [] });

      storage.deleteCache({}, 'img.jpg', (err: any) => {
        expect(err).to.not.exist;
        expect(client.sent.length).to.equal(1);
        done();
      });
    });
  });

  describe('list', () => {
    it('lists with pathPrefix applied once and decodes keys', (done) => {
      const { client, storage } = createStorage({ pathPrefix: 'pre/' });
      client.results.push({
        IsTruncated: false,
        Contents: [{ Key: 'pre/dir/a%20b+c' }],
      });

      storage.list('dir', (err: any, result: any) => {
        expect(err).to.not.exist;
        expect(client.sent[0].input.Prefix).to.equal('pre/dir/');
        expect(result.files[0].Key).to.equal('pre/dir/a b c');
        expect(result.resumeKey).to.be.undefined;
        done();
      });
    });
  });
});
