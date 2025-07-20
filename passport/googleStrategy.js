import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import {
  findAccount,
  findUserByEmail,
  findUserById,
  createUser,
  linkAccountToUser
} from '../services/OAuthService.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.CALLBACK_URL;

passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    // CONTROLLER LOGIC
    async (accessToken, refreshToken, profile, done) => {
      try {
        const emailObj = profile.emails?.find((e) => e.verified) || profile.emails?.[0];
        const googleEmail = emailObj?.value?.trim().toLowerCase();
        if (!googleEmail) return done(new Error('No email from Google account'), false);

        // First: See if this account is already linked
        const account = await findAccount('google', profile.id);
        if (account) {
          const user = await findUserById(account.userId);
          return done(null, user);
        }

        // If not, check if user exists by email
        let user = await findUserByEmail(googleEmail);
        if (!user) {
          user = await createUser({
            email: googleEmail,
            name: profile.displayName || 'Google User',
            emailVerified: profile.emails?.[0]?.verified || false,
          });
        }

        // Link new Google account to user
        await linkAccountToUser({
          provider: 'google',
          providerAccountId: profile.id,
          userId: user.id
        });

        return done(null, user);
      } catch (err) {
        console.error('Google OAuth error:', err);
        return done(err, false);
      }
    }
));

// Session (still in controller, because it's app/session logic)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await findUserById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
