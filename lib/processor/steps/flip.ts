export default function flip(context: any, stepInfo: any) {
  if (stepInfo.x !== undefined) {
    context.sharp.flop();
  }

  if (stepInfo.y !== undefined) {
    context.sharp.flip();
  }
}
