import { expect } from 'chai';
import { getHashFromSteps } from '../lib/helpers/image-steps.ts';

describe('#XXHash', function () {
  it('Any object', function () {
    const res = getHashFromSteps({ hello: 'world' });
    expect(res).to.equal(623007140);
  });

  it('Any stringify-able value', function () {
    const res = getHashFromSteps(true);
    expect(res).to.equal(2113053669);
  });

  it('Obj 2', function () {
    const res = getHashFromSteps({ something: 'unique' });
    expect(res).to.equal(1136321441);
  });

  it('Obj 3', function () {
    const res = getHashFromSteps({ something: 'unique2' });
    expect(res).to.equal(422463611);
  });
});
