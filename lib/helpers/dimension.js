module.exports = {
  getXAspect: getXAspect,
  getYAspect: getYAspect,
  getInfo: getInfo,
  resolveStep: resolveStep
};

function resolveStep(originalImage, imageStep) {
  var info;

  if (imageStep.width) {
    info = getInfo(imageStep.width);

    if (info.unit === '%') {
      imageStep.width = parseInt(originalImage.info.width * (info.value/100));
    } else { // px
      if (info.modifier === '+') {
        imageStep.width = originalImage.info.width + info.value;
      } else if (info.modifier === '-') {
        imageStep.width = originalImage.info.width - info.value;
      } else {
        imageStep.width = info.value;
      }
    }
  }

  if (imageStep.height) {
    info = getInfo(imageStep.height);

    if (info.unit === '%') {
      imageStep.height = parseInt(originalImage.info.height * (info.value/100));
    } else { // px
      if (info.modifier === '+') {
        imageStep.height = originalImage.info.height + info.value;
      } else if (info.modifier === '-') {
        imageStep.height = originalImage.info.height - info.value;
      } else {
        imageStep.height = info.value;
      }
    }
  }

  if (imageStep.left) {
    info = getInfo(imageStep.left);
    console.log('left from', imageStep.left, 'to', info);
    if (info.unit === '%') {
      if (info.modifier === '-') {
        imageStep.left = parseInt(originalImage.info.width * (info.value/100) * -1);
      } else {
        imageStep.left = parseInt(originalImage.info.width * (info.value/100));
      }
    } else { // px
      if (info.modifier === '-') {
        imageStep.left = 0 - info.value;
      } else {
        imageStep.left = info.value;
      }
    }
    console.log('left result', imageStep.left);
  }

  if (imageStep.top) {
    info = getInfo(imageStep.top);

    if (info.unit === '%') {
      if (info.modifier === '-') {
        imageStep.top = parseInt(originalImage.info.height * (info.value/100) * -1);
      } else {
        imageStep.top = parseInt(originalImage.info.height * (info.value/100));
      }
    } else { // px
      if (info.modifier === '-') {
        imageStep.top = 0 - info.value;
      } else {
        imageStep.top = info.value;
      }
    }
  }

  if (imageStep.right) {
    info = getInfo(imageStep.right);

    if (info.unit === '%') {
      if (info.modifier === '+') {
        imageStep.right = parseInt(originalImage.info.width + (originalImage.info.width * (info.value/100)));
      } else if (info.modifier === '-') {
        imageStep.right = parseInt(originalImage.info.width - (originalImage.info.width * (info.value/100)));
      } else {
        imageStep.right = parseInt(originalImage.info.width * (info.value/100));
      }
    } else { // px
      if (info.modifier === '+') {
        imageStep.right = originalImage.info.width + info.value;
      } else if (info.modifier === '-') {
        imageStep.right = (originalImage.info.width - info.value);
      } else {
        imageStep.right = info.value;
      }
    }
  }

  if (imageStep.bottom) {
    info = getInfo(imageStep.bottom);

    if (info.unit === '%') {
      if (info.modifier === '+') {
        imageStep.bottom = parseInt(originalImage.info.height + (originalImage.info.height * (info.value/100)));
      } else if (info.modifier === '-') {
        imageStep.bottom = parseInt(originalImage.info.height - (originalImage.info.height * (info.value/100)));
      } else {
        imageStep.bottom = parseInt(originalImage.info.height * (info.value/100));
      }
    } else { // px
      if (info.modifier === '+') {
        imageStep.bottom = originalImage.info.height + info.value;
      } else if (info.modifier === '-') {
        imageStep.bottom = (originalImage.info.height - info.value);
      } else {
        imageStep.bottom = info.value;
      }
    }
  }
}

function getInfo(value) {
  return {
    unit: /\%$/.test(value) ? '%' : 'px',
    modifier: value[0] === '+' ? '+' : value[0] === '-' ? '-' : null,
    value: parseInt(value.match(/\d+/)[0])
  };
}

function getXAspect(image) {
  return image.info.width / image.info.height;
}

function getYAspect(image) {
  return image.info.height / image.info.width;
}
