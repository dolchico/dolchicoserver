// controllers/userController.js
import validator from 'validator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { findUserByEmail, createUser } from '../services/userService.js';

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ✅ Login Controller
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      return res.json({ success: false, message: "User doesn't exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: 'Invalid credentials' });
    }

    const token = createToken(user.id);
    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Register Controller
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (await findUserByEmail(email)) {
      return res.json({ success: false, message: 'User already exists' });
    }

    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: 'Please enter a valid email' });
    }

    if (password.length < 8) {
      return res.json({ success: false, message: 'Password must be at least 8 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createUser({
      name,
      email,
      password: hashedPassword,
      cartData: {},
    });

    const token = createToken(user.id);
    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
