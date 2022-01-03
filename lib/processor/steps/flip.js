module.exports = function (context, stepInfo) {
  if (stepInfo.x !== undefined) {
    context.sharp.flop();
  }

  if (stepInfo.y !== undefined) {
    context.sharp.flip();
  }
};
