import _ from 'lodash';

export default class StorageBase {
  options: any;
  name?: string;

  constructor(options?: any) {
    this.options = options || {};
  }

  fetch(options: any, originalPath: string, stepsHash: string, cb: any): void {
    cb(new Error('not implemented'));
  }

  store(
    options: any,
    originalPath: string,
    stepsHash: string,
    image: any,
    cb: any
  ): void {
    cb(new Error('not implemented'));
  }

  touch(
    options: any,
    originalPath: string,
    stepsHash: string,
    image: any,
    cb: any
  ): void {
    // unless an optimal path is provided by storage client, overwrite the file
    this.store(options, originalPath, stepsHash, image, cb);
  }

  getOptions(options?: any) {
    return _.merge({}, this.options, options);
  }
}
