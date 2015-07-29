module.exports = {
  getXAspect: getXAspect,
  getYAspect: getYAspect,
  getInfo: getInfo,
  resolveStep: resolveStep
};

function resolveStep(originalImage, imageStep) {
  var info;

  if (typeof imageStep.width === 'string') {
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

  if (typeof imageStep.height === 'string') {
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

  if (typeof imageStep.left === 'string') {
    info = getInfo(imageStep.left);
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
  }

  if (typeof imageStep.top === 'string') {
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

  if (typeof imageStep.right === 'string') {
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

  if (typeof imageStep.bottom === 'string') {
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
