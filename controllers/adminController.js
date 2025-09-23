import jwt from 'jsonwebtoken';
import { findUserByEmail, createUser } from '../services/userService.js';

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // Find or create a real admin user in the database so middleware that
      // fetches user status can locate the user by id.
      let adminUser = await findUserByEmail(email);
      if (!adminUser) {
        // Create a minimal admin user record. No public password saved here;
        // this account is authenticated via ADMIN_EMAIL/ADMIN_PASSWORD env vars.
        adminUser = await createUser({
          name: 'Administrator',
          email,
          role: 'ADMIN',
          emailVerified: true,
          phoneVerified: false,
          isProfileComplete: true,
        });
      }

      const payload = {
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role || 'ADMIN',
        loginMethod: 'admin',
        emailVerified: adminUser.emailVerified ?? true,
        phoneVerified: adminUser.phoneVerified ?? false,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token });
    }

    res.json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    console.error('adminLogin error:', error);
    res.json({ success: false, message: error.message });
  }
};

export default { adminLogin };
