import jwt from 'jsonwebtoken';

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      // ✅ SIGN with object
      const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
      return res.json({ success: true, token });
    }

    res.json({ success: false, message: 'Invalid credentials' });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};
