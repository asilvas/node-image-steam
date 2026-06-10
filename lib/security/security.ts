import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import _ from 'lodash';
import defaults from './security-defaults.ts';

export class SecurityError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export default class Security extends EventEmitter {
  static SecurityError = SecurityError;
  SecurityError = SecurityError;
  options: any;

  constructor(options?: any) {
    super();
    this.options = _.merge({}, defaults, options || {});

    if (this.options.enabled && !this.options.secret) {
      throw new SecurityError('You must set a secret to enable Security');
    }
  }

  checkSignature(toSign: string, signature?: string): void {
    if (!this.options.enabled) {
      return;
    }

    if (!signature || typeof signature !== 'string') {
      throw new SecurityError(
        'This resource is protected, please use a signed url'
      );
    }

    const shasum = crypto.createHash(this.options.algorithm);
    shasum.update(toSign + this.options.secret);
    const expectedSignature = shasum
      .digest('base64')
      .replace(/\//g, '_')
      .replace(/\+/g, '-')
      .substring(0, 8);

    if (signature !== expectedSignature) {
      throw new SecurityError('Signature does not match');
    }
  }
}
