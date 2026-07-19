import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
    name: string;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'aurorasecretkey1029384756';

// Middleware to secure user endpoints
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: { message: 'Authentication required. Access denied.' } });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: { message: 'Invalid or expired authentication session.' } });
  }
};

// Middleware to secure admin endpoints
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  requireAuth(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      return res.status(403).json({ error: { message: 'Administrative access required. Request denied.' } });
    }
  });
};

// Token signing helper
export const signToken = (payload: { id: string; email: string; role: string; name: string }) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};
