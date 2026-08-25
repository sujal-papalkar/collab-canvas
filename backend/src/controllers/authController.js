import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { cleanUpGuestUserRooms } from '../utils/cleanup.js';

// Register standard user
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    // Check existing email or username
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(409).json({ success: false, message: 'Username is already taken.' });
    }

    const passwordHash = await User.hashPassword(password);

    const newUser = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      isGuest: false,
    });

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        avatarColor: newUser.avatarColor,
        isGuest: false,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
};

// Login standard user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarColor: user.avatarColor,
        isGuest: user.isGuest,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
};

// Guest instant login
export const guestLogin = async (req, res) => {
  try {
    const { nickname } = req.body;
    const name = nickname?.trim() || `Artist_${Math.floor(1000 + Math.random() * 9000)}`;
    const guestEmail = `guest_${uuidv4().substring(0, 8)}@collabcanvas.local`;
    const randomPassword = uuidv4();
    const passwordHash = await User.hashPassword(randomPassword);

    const guestUser = await User.create({
      username: `${name}_${Math.floor(100 + Math.random() * 900)}`,
      email: guestEmail,
      passwordHash,
      isGuest: true,
    });

    const token = generateToken(guestUser);

    res.status(201).json({
      success: true,
      message: 'Guest session created.',
      token,
      user: {
        id: guestUser._id,
        username: guestUser.username,
        email: guestUser.email,
        avatarColor: guestUser.avatarColor,
        isGuest: true,
      },
    });
  } catch (err) {
    console.error('Guest login error:', err);
    res.status(500).json({ success: false, message: 'Failed to create guest session.' });
  }
};

// Get current user profile
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatarColor: user.avatarColor,
        isGuest: user.isGuest,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ success: false, message: 'Error retrieving user profile.' });
  }
};

// Logout user and clean up guest room resources
export const logout = async (req, res) => {
  try {
    const userId = req.user?.id;
    const isGuest = !!req.user?.isGuest;

    if (isGuest && userId) {
      const result = await cleanUpGuestUserRooms(userId);
      console.log(`🧹 [Logout] Cleaned up ${result?.deletedRooms || 0} room(s) for guest ${userId}`);
    }

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
};
