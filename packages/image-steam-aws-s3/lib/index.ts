import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

/*
  AWS S3 storage driver for image-steam. Implements the StorageBase contract
  (fetch/store/touch/deleteCache) without importing image-steam itself, so the
  package has no runtime dependency on its host.

  v2 of this package replaces the deprecated aws-sdk v2 monolith with the
  modular @aws-sdk/client-s3 (faster cold start, smaller install, HTTP
  keep-alive by default).
*/

// maps AWS SDK v3 errors onto the err.statusCode contract expected by
// image-steam (v2 of the SDK set statusCode natively)
function normalizeError(err: any): any {
  if (err && err.statusCode === undefined) {
    if (err.name === 'NoSuchKey' || err.name === 'NotFound') {
      err.statusCode = 404;
    } else if (err.$metadata && err.$metadata.httpStatusCode) {
      err.statusCode = err.$metadata.httpStatusCode;
    }
  }
  return err;
}

function getMetaFromData({ Metadata = {}, LastModified }: any) {
  let info: any = {};

  const isteamMeta = Metadata.isteam;
  if (isteamMeta) {
    info = JSON.parse(isteamMeta);
  }

  if (LastModified) {
    info.lastModified = LastModified;
  }

  return info;
}

function getMetaFromImage(info: any) {
  return {
    isteam: JSON.stringify(info),
  };
}

export default class StorageAWSS3 {
  options: any;
  s3: any;
  Bucket: string;
  pathPrefix: string;
  name?: string;

  constructor(opts: any = {}) {
    this.options = opts;

    const { region, bucket, pathPrefix, endpoint, forcePathStyle, client } =
      opts;
    // `client` permits injection (tests, custom credentials/agents);
    // `clientOptions` is an escape hatch forwarded to the S3Client constructor
    this.s3 =
      client ||
      new S3Client({
        region,
        endpoint,
        forcePathStyle,
        ...(opts.clientOptions || {}),
      });
    this.Bucket = bucket;
    this.pathPrefix = pathPrefix || '';
  }

  // artifacts (objects with a stepsHash) are namespaced under `isteam/`
  #artifactKey(originalPath: string, stepsHash: string): string {
    return `isteam/${this.pathPrefix + originalPath}/${stepsHash}`;
  }

  fetch(
    { etag }: any = {},
    originalPath: string,
    stepsHash: string,
    cb: any
  ): void {
    const { Bucket, pathPrefix } = this;
    const imagePath = stepsHash
      ? this.#artifactKey(originalPath, stepsHash)
      : pathPrefix + originalPath;
    const Key = imagePath
      .split('/')
      .map((p) => {
        try {
          // this decode is unnecessary in most cases but is for backward compatibility, but must fail safe
          return decodeURIComponent(p);
        } catch (ex) {
          return p;
        }
      })
      .join('/');

    const params: any = { Bucket, Key };
    if (etag) params.IfNoneMatch = etag;

    this.s3.send(new GetObjectCommand(params)).then(
      async (data: any) => {
        const info = Object.assign(
          { path: encodeURIComponent(originalPath), stepsHash },
          getMetaFromData(data)
        );

        try {
          // zero-copy view over the streamed bytes
          const bytes = await data.Body.transformToByteArray();
          const buffer = Buffer.from(
            bytes.buffer,
            bytes.byteOffset,
            bytes.byteLength
          );
          cb(null, info, buffer);
        } catch (err: any) {
          cb(normalizeError(err));
        }
      },
      (err: any) => cb(normalizeError(err))
    );
  }

  store(
    opts: any,
    originalPath: string,
    stepsHash: string,
    image: any,
    cb: any
  ): void {
    image.info.stepsHash = stepsHash;

    const params = {
      Bucket: this.Bucket,
      Key: this.#artifactKey(originalPath, stepsHash),
      Body: image.buffer,
      Metadata: getMetaFromImage(image.info),
      ContentType: image.contentType || 'application/octet-stream', // default to binary if unknown
    };

    this.s3.send(new PutObjectCommand(params)).then(
      () => cb(),
      (err: any) => cb(normalizeError(err))
    );
  }

  touch(
    opts: any,
    originalPath: string,
    stepsHash: string,
    image: any,
    cb: any
  ): void {
    image.info.stepsHash = stepsHash;

    const Key = this.#artifactKey(originalPath, stepsHash);
    const params: any = {
      Bucket: this.Bucket,
      Key,
      CopySource: `/${this.Bucket}/${Key}`,
      MetadataDirective: 'REPLACE',
      Metadata: getMetaFromImage(image.info),
      ContentType: image.contentType || 'application/octet-stream', // default to binary if unknown
    };

    this.s3.send(new CopyObjectCommand(params)).then(
      (data: any) => cb(null, data),
      (err: any) => cb(normalizeError(err))
    );
  }

  deleteCache(opts: any, originalPath: string, cb: any): void {
    // artifact keys are `isteam/${pathPrefix}${originalPath}/${hash}` --
    // build the exact prefix here (v1 incorrectly applied pathPrefix twice
    // and in the wrong position via list())
    const prefix = `isteam/${this.pathPrefix + originalPath}/`;

    const listAndDelete = (resumeKey?: string) => {
      this.#list(prefix, { resumeKey }, (err: any, result: any) => {
        if (err) return void cb(err);

        const { files, resumeKey: nextKey } = result;

        // no more files, we're done
        if (files.length === 0) return void cb();

        // only provide the Key
        const params = {
          Bucket: this.Bucket,
          Delete: { Objects: files.map(({ Key }: any) => ({ Key })) },
        };
        this.s3.send(new DeleteObjectsCommand(params)).then(
          () => {
            if (!nextKey) return void cb(); // no more to delete

            // continue recursive deletions
            listAndDelete(nextKey);
          },
          (err: any) => cb(normalizeError(err))
        );
      });
    };

    listAndDelete();
  }

  list(originalPath: string, listOptions: any = {}, cb?: any): void {
    if (typeof listOptions === 'function') {
      cb = listOptions;
      listOptions = {};
    }
    this.#list(`${this.pathPrefix + originalPath}/`, listOptions, cb);
  }

  #list(
    Prefix: string,
    { resumeKey, maxCount = 1000 }: any = {},
    cb?: any
  ): void {
    const params: any = {
      Bucket: this.Bucket,
      Delimiter: '/',
      EncodingType: 'url',
      FetchOwner: false,
      ContinuationToken: resumeKey,
      MaxKeys: maxCount,
      Prefix,
    };

    this.s3.send(new ListObjectsV2Command(params)).then(
      (data: any) => {
        cb(null, {
          resumeKey: data.IsTruncated ? data.NextContinuationToken : undefined,
          files: (data.Contents || []).map((f: any) => {
            f.Key = decodeURIComponent(f.Key.replace(/\+/g, ' ')); // account for encoding... https://docs.aws.amazon.com/lambda/latest/dg/with-s3-example-deployment-pkg.html#with-s3-example-deployment-pkg-nodejs
            return f;
          }),
        });
      },
      (err: any) => cb(normalizeError(err))
    );
  }
}
