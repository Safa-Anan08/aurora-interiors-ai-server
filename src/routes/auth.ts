import { Router, Request, Response } from 'express';
import User from '../models/User';
import { signToken, requireAuth, AuthRequest } from '../middleware/auth';
import { OAuth2Client } from 'google-auth-library';

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Cookie settings helper
const setAuthCookie = (res: Response, token: string) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

// 1. User Registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: { message: 'Name, email, and password are required.' } });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: { message: 'Email address is already registered.' } });
    }

    // Create user (password gets hashed pre-save)
    const role = email.toLowerCase().includes('admin') ? 'admin' : 'user';
    const user = new User({ name, email, password, role });
    await user.save();

    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: { message: err.message || 'Error occurred during registration.' } });
  }
});

// 2. User Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { message: 'Email and password are required.' } });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid email credentials.' } });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: { message: 'Invalid password credentials.' } });
    }

    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Error during login.' } });
  }
});

// 3. Google Sign-In (Token verification via google-auth-library)
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: { message: 'Google credential token is required.' } });
    }

    let email = '';
    let name = '';
    let googleId = '';

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    if (GOOGLE_CLIENT_ID) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        if (payload) {
          email = payload.email || '';
          name = payload.name || '';
          googleId = payload.sub || '';
        }
      } catch (err: any) {
        return res.status(400).json({ error: { message: `Google Token Verification failed: ${err.message}` } });
      }
    } else {
      // Local mock verification fallback if Client ID is unset (useful for review/demo)
      if (credential.startsWith('g_uid_') || credential.includes('mock')) {
        email = 'google_user@gmail.com';
        name = 'Google Designer';
        googleId = credential;
      } else {
        return res.status(400).json({ error: { message: 'Google Client ID is not configured on server. Provide a mock credential to bypass.' } });
      }
    }

    if (!email || !name) {
      return res.status(400).json({ error: { message: 'Could not extract profile details from Google Login.' } });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, googleId, role: 'user' });
      await user.save();
    }

    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Google Auth processing error.' } });
  }
});

// 4. Demo Login (Quick credentials login for review and test)
router.post('/demo', async (req: Request, res: Response) => {
  try {
    const { type } = req.body; // 'user' | 'admin'
    const role = type === 'admin' ? 'admin' : 'user';
    const email = `demo_${role}@aurora.ai`;
    const name = `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, role });
      await user.save();
    }

    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role, name: user.name });
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Demo Auth generation error.' } });
  }
});

// 5. User Logout (Clears HTTP-only cookie)
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
});

// 6. Get Logged User details
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: { message: 'User profile not found.' } });
    }
    return res.status(200).json(user);
  } catch (err: any) {
    res.status(500).json({ error: { message: err.message || 'Profile retrieving error.' } });
  }
});

export default router;
