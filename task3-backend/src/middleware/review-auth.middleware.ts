import type { NextFunction, Request, Response } from 'express';

export function requireReviewRole(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ code: 401, message: '未登录', data: null });
    return;
  }
  if (!['admin', 'municipal'].includes(user.role)) {
    res.status(403).json({ code: 403, message: '无审核权限', data: null });
    return;
  }
  next();
}
