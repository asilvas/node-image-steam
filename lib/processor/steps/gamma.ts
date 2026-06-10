export default function gamma(context: any, stepInfo: any) {
  context.sharp.gamma(parseFloat(stepInfo.gamma || '2.2'));
}
