import { expect } from 'chai';
import jwt from 'jsonwebtoken';

import { config } from '../../src/config/env';
import { UnauthorizedError } from '../../src/errors/apiError';
import { JwtTokenService } from '../../src/security/tokenService';

describe('JwtTokenService', () => {
  const tokens = new JwtTokenService();

  it('round-trips a user id', () => {
    expect(tokens.verify(tokens.issue('user-1').value)).to.equal('user-1');
  });

  it('puts nothing in the payload except sub, iss, iat and exp', () => {
    const decoded = jwt.decode(tokens.issue('user-1').value, { json: true }) as jwt.JwtPayload;
    expect(Object.keys(decoded).sort()).to.deep.equal(['exp', 'iat', 'iss', 'sub']);
  });

  it('rejects a token signed with another secret', () => {
    const forged = jwt.sign({}, 'another-secret', { subject: 'user-1', issuer: config.jwt.issuer });
    expect(() => tokens.verify(forged)).to.throw(UnauthorizedError);
  });

  it('rejects a token issued by another service', () => {
    const foreign = jwt.sign({}, config.jwt.secret, { subject: 'user-1', issuer: 'somewhere-else' });
    expect(() => tokens.verify(foreign)).to.throw(UnauthorizedError);
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign({}, config.jwt.secret, {
      subject: 'user-1',
      issuer: config.jwt.issuer,
      expiresIn: '-1s',
    });
    expect(() => tokens.verify(expired)).to.throw(UnauthorizedError);
  });

  it('rejects a token with no subject', () => {
    const anonymous = jwt.sign({}, config.jwt.secret, { issuer: config.jwt.issuer });
    expect(() => tokens.verify(anonymous)).to.throw(UnauthorizedError);
  });

  it('rejects a syntactically invalid token', () => {
    expect(() => tokens.verify('not-a-jwt')).to.throw(UnauthorizedError);
  });
});
