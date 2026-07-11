const { requireReviewRole } = require('../dist/middleware/review-auth.middleware');

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('requireReviewRole', () => {
  test.each(['admin', 'municipal'])('allows %s', role => {
    const next = jest.fn();
    requireReviewRole({ user: { role } }, response(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 401 without a user', () => {
    const res = response();
    requireReviewRole({}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 403 for other roles', () => {
    const res = response();
    requireReviewRole({ user: { role: 'visitor' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
