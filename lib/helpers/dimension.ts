export interface DimensionInfo {
  unit: '%' | 'px';
  modifier: '+' | '-' | null;
  value: number;
}

export function resolveStep(originalImage: any, imageStep: any): void {
  let info: DimensionInfo;

  if (typeof imageStep.width === 'string') {
    info = getInfo(imageStep.width);

    if (info.unit === '%') {
      if (info.modifier === '+') {
        imageStep.width = originalImage.info.width;
      } else if (info.modifier === '-') {
        imageStep.width =
          originalImage.info.width -
          Math.trunc(originalImage.info.width * (info.value / 100));
      } else {
        imageStep.width = Math.trunc(
          originalImage.info.width * (info.value / 100)
        );
      }
    } else {
      // px
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
      if (info.modifier === '+') {
        imageStep.height = originalImage.info.height;
      } else if (info.modifier === '-') {
        imageStep.height =
          originalImage.info.height -
          Math.trunc(originalImage.info.height * (info.value / 100));
      } else {
        imageStep.height = Math.trunc(
          originalImage.info.height * (info.value / 100)
        );
      }
    } else {
      // px
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
        imageStep.left = Math.trunc(
          originalImage.info.width * (info.value / 100) * -1
        );
      } else {
        imageStep.left = Math.trunc(
          originalImage.info.width * (info.value / 100)
        );
      }
    } else {
      // px
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
        imageStep.top = Math.trunc(
          originalImage.info.height * (info.value / 100) * -1
        );
      } else {
        imageStep.top = Math.trunc(
          originalImage.info.height * (info.value / 100)
        );
      }
    } else {
      // px
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
        imageStep.right = Math.trunc(
          originalImage.info.width +
            originalImage.info.width * (info.value / 100)
        );
      } else if (info.modifier === '-') {
        imageStep.right = Math.trunc(
          originalImage.info.width -
            originalImage.info.width * (info.value / 100)
        );
      } else {
        imageStep.right = Math.trunc(
          originalImage.info.width * (info.value / 100)
        );
      }
    } else {
      // px
      if (info.modifier === '+') {
        imageStep.right = originalImage.info.width + info.value;
      } else if (info.modifier === '-') {
        imageStep.right = originalImage.info.width - info.value;
      } else {
        imageStep.right = info.value;
      }
    }
  }

  if (typeof imageStep.bottom === 'string') {
    info = getInfo(imageStep.bottom);

    if (info.unit === '%') {
      if (info.modifier === '+') {
        imageStep.bottom = Math.trunc(
          originalImage.info.height +
            originalImage.info.height * (info.value / 100)
        );
      } else if (info.modifier === '-') {
        imageStep.bottom = Math.trunc(
          originalImage.info.height -
            originalImage.info.height * (info.value / 100)
        );
      } else {
        imageStep.bottom = Math.trunc(
          originalImage.info.height * (info.value / 100)
        );
      }
    } else {
      // px
      if (info.modifier === '+') {
        imageStep.bottom = originalImage.info.height + info.value;
      } else if (info.modifier === '-') {
        imageStep.bottom = originalImage.info.height - info.value;
      } else {
        imageStep.bottom = info.value;
      }
    }
  }

  const hasAnchor = typeof imageStep.anchor === 'string';
  const hasAnchorX = typeof imageStep.anchorX === 'string';
  const hasAnchorY = typeof imageStep.anchorY === 'string';

  if (imageStep.anchor !== 'auto' && (hasAnchor || hasAnchorX || hasAnchorY)) {
    const anchorCenter = convertAnchorCenter(imageStep, originalImage);

    if (hasAnchorX) {
      info = getInfo(imageStep.anchorX);
      const anchorXPixels =
        info.unit === '%'
          ? Math.floor((originalImage.info.width * info.value) / 100)
          : info.value;
      if (info.modifier === '+') {
        imageStep.anchorX = anchorCenter.x + anchorXPixels;
      } else if (info.modifier === '-') {
        imageStep.anchorX = anchorCenter.x - anchorXPixels;
      } else {
        imageStep.anchorX = anchorXPixels;
      }
    } else {
      imageStep.anchorX = anchorCenter.x;
    }

    if (hasAnchorY) {
      info = getInfo(imageStep.anchorY);
      const anchorYPixels =
        info.unit === '%'
          ? Math.floor((originalImage.info.height * info.value) / 100)
          : info.value;
      if (info.modifier === '+') {
        imageStep.anchorY = anchorCenter.y + anchorYPixels;
      } else if (info.modifier === '-') {
        imageStep.anchorY = anchorCenter.y - anchorYPixels;
      } else {
        imageStep.anchorY = anchorYPixels;
      }
    } else {
      imageStep.anchorY = anchorCenter.y;
    }
  }
}

export function getInfo(value: string): DimensionInfo {
  const unit = /\%$/.test(value) ? '%' : 'px';
  const decMatch =
    unit === '%' ? value.match(/(\d+(\.\d+)?)|(\.\d+)/) : value.match(/\d+/);
  const parsedVal = (decMatch && parseFloat(decMatch[0])) || 0;

  return {
    unit,
    modifier: value[0] === '+' ? '+' : value[0] === '-' ? '-' : null,
    value: parsedVal,
  };
}

export function getXAspect(image: any): number {
  return image.info.width / image.info.height;
}

export function getYAspect(image: any): number {
  return image.info.height / image.info.width;
}

function convertAnchorCenter(imageStep: any, originalImage: any) {
  const anchor =
    typeof imageStep.anchor === 'string' && imageStep.anchor.length === 2
      ? imageStep.anchor
      : 'cc';
  const convertedAnchor = { x: 0, y: 0 };
  const height = imageStep.height || originalImage.info.height;
  const width = imageStep.width || originalImage.info.width;

  switch (anchor[0]) {
    case 't':
      convertedAnchor.y = Math.floor(height / 2);
      break;
    case 'b':
      convertedAnchor.y = Math.floor(originalImage.info.height - height / 2);
      break;
    default:
      convertedAnchor.y = Math.floor(originalImage.info.height / 2);
      break;
  }

  switch (anchor[1]) {
    case 'l':
      convertedAnchor.x = Math.floor(width / 2);
      break;
    case 'r':
      convertedAnchor.x = Math.floor(originalImage.info.width - width / 2);
      break;
    default:
      convertedAnchor.x = Math.floor(originalImage.info.width / 2);
      break;
  }

  return convertedAnchor;
}
