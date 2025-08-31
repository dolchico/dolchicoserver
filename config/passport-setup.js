// config/passport-setup.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { 
  findUserByEmail, 
  findUserById, 
  createUser, 
  updateProfile 
} from '../services/userService.js';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    const name = profile.displayName;
    const googleId = profile.id;

    if (!email) {
      return done(new Error('No email found in Google profile'), null);
    }

    // Use your existing findUserByEmail function
    let user = await findUserByEmail(email);
    
    if (user) {
      // User exists - update with OAuth info using your updateProfile function
      try {
        user = await updateProfile(user.id, {
          name: user.name || name,
          emailVerified: true,
          isProfileComplete: true
        });
        console.log('Updated existing user via Google OAuth:', user.id);
      } catch (updateError) {
        console.log('User exists, continuing with existing data');
        // Continue with existing user data if update fails
      }
    } else {
      // Create new user using your existing createUser function
      user = await createUser({
        email: email,
        name: name,
        emailVerified: true,
        isProfileComplete: true,
        role: 'USER'
      });
      console.log('Created new user via Google OAuth:', user.id);
    }

    return done(null, user);
    
  } catch (error) {
    console.error('Google OAuth Strategy Error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Use your existing findUserById function
    const user = await findUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
