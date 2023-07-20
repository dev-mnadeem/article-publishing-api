import { expect } from 'chai';

import { escapeLikePattern } from '../../src/repositories/postRepository';

describe('escapeLikePattern', () => {
  it('leaves an ordinary search term alone', () => {
    expect(escapeLikePattern('Mastering React')).to.equal('Mastering React');
  });

  it('escapes the LIKE wildcards % and _', () => {
    expect(escapeLikePattern('100% a_b')).to.equal('100\\% a\\_b');
  });

  it('escapes the escape character itself', () => {
    expect(escapeLikePattern('C:\\temp')).to.equal('C:\\\\temp');
  });
});
