module.exports = function(context, stepInfo) {
  if (stepInfo.enabled === 'true') {
    return;
  }

  // defaults to pulling over meta data

  context.sharp.withMetadata();
};
