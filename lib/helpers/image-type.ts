import sharp from 'sharp';

export default function imageType(
  image: { buffer: Buffer },
  cb: (err?: Error | null, contentType?: string) => void
) {
  sharp(image.buffer).metadata(function (err, metadata) {
    if (err) return void cb(err);
    switch (metadata.format) {
      case 'jpeg':
        cb(null, 'image/jpeg');
        break;
      case 'png':
        cb(null, 'image/png');
        break;
      case 'gif':
        cb(null, 'image/gif');
        break;
      default:
        cb();
    }
  });
}
