# image-steam-aws-s3

[AWS S3](https://aws.amazon.com/s3/) client for
[Image Steam](https://github.com/asilvas/node-image-steam).
If you're using AWS, you're in the right place. If all you need
is an S3-compatible client, check out [image-steam-s3](https://github.com/asilvas/image-steam-s3).

As of v2 this package is built on the modular
[`@aws-sdk/client-s3`](https://www.npmjs.com/package/@aws-sdk/client-s3)
(the deprecated `aws-sdk` v2 monolith is gone), ships as ESM, and requires
Node.js >= 24. Credentials resolve through the standard AWS SDK v3 provider
chain (env vars, shared config, IMDS/IRSA, etc).

## Options

```js
import isteamAWSS3 from 'image-steam-awss3';

const s3 = new isteamAWSS3({
  region: 'us-west-2',
  bucket: 'isteam',
});
```

| Option         | Type       | Default    | Info                                                                |
| -------------- | ---------- | ---------- | ------------------------------------------------------------------- |
| region         | `string`   | _required_ | AWS Region of S3 bucket                                             |
| bucket         | `string`   | _required_ | Unique name of S3 bucket                                            |
| pathPrefix     | `string`   | `''`       | Prefix of all paths                                                 |
| endpoint       | `string`   | _optional_ | Custom S3 endpoint (S3-compatible stores)                           |
| forcePathStyle | `boolean`  | _optional_ | Use path-style addressing (typically paired with `endpoint`)        |
| clientOptions  | `Object`   | _optional_ | Additional options forwarded verbatim to the `S3Client` constructor |
| client         | `S3Client` | _optional_ | Bring your own pre-configured client (overrides the options above)  |

## Usage

Example:

```js
import isteam from 'image-steam';

const options = {
  storage: {
    app: {
      static: {
        driver: 'http',
        endpoint: 'https://some-endpoint.com',
      },
    },
    cache: {
      driverPath: 'image-steam-awss3',
      options: {
        region: 'us-west-2',
        bucket: 'isteam-cache',
      },
    },
  },
};

http
  .createServer(new isteam.http.Connect(options).getHandler())
  .listen(13337, '127.0.0.1');
```

## Changes in v2

This package now lives in the
[node-image-steam](https://github.com/asilvas/node-image-steam) monorepo
(the standalone `image-steam-aws-s3` repo is archived).

### Performance

- Migrated from `aws-sdk` v2 (deprecated, maintenance mode) to the modular
  `@aws-sdk/client-s3` v3 -- roughly 10x smaller install, faster startup, and
  **HTTP keep-alive enabled by default**, so per-request S3 calls reuse
  connections instead of paying TLS setup every time.
- Zero-copy fetches: response bytes are wrapped in a `Buffer` view rather than
  copied.
- `store` issues a single `PutObject` instead of v2's managed `upload`,
  avoiding multipart negotiation overhead for typical artifact sizes.

### Fixes

- `deleteCache` applied `pathPrefix` twice (and in the wrong position), so
  cache deletes never matched stored artifacts when `pathPrefix` was set.
- AWS SDK v3 errors are normalized back onto the `err.statusCode` contract
  image-steam expects (`NoSuchKey`/`NotFound` map to 404), keeping
  storage-fallback behavior intact.

### Other

- Rewritten in TypeScript (ESM-only, Node.js >= 24); published as compiled
  JS with type declarations.
- New options: `endpoint` and `forcePathStyle` for S3-compatible stores,
  `clientOptions` forwarded to the `S3Client` constructor, and `client` for
  injecting a pre-configured client.
- Now covered by unit tests (no network required, via `client` injection).
- Object key layout, `isteam` metadata format, and the driver API are
  unchanged -- existing buckets continue to work as-is.
