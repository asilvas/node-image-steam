export default function info(
  command: any,
  image: any,
  reqInfo: any,
  req: any,
  res: any,
  cb?: (err?: Error | null) => void
) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      info: image.info,
    })
  );

  cb && cb();
}
