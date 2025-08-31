// googleStrategy.js
import dotenv from 'dotenv';
dotenv.config();

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL           // ← must be identical to Google-Cloud entry
} = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  throw new Error('Google OAuth env vars missing - check .env');
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        /* 1️⃣ Already linked? */
        const account = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: 'google',
              providerAccountId: profile.id
            }
          }
        });
        if (account) {
          const user = await prisma.user.findUnique({ where: { id: account.userId } });
          return done(null, user);
        }

        /* 2️⃣ Find or create user by email */
        const googleEmail = profile.emails?.[0]?.value?.toLowerCase() || '';
        let user = await prisma.user.findUnique({ where: { email: googleEmail } });

        if (!user) {
          user = await prisma.user.create({
            data: { email: googleEmail, name: profile.displayName || 'Google User' }
          });
        }

        /* 3️⃣ Link Google account */
        await prisma.account.create({
          data: {
            provider: 'google',
            providerAccountId: profile.id,
            userId: user.id
          }
        });

        return done(null, user);
      } catch (err) {
        // if Google sent an error payload, log it for clarity
        if (err?.oauthError?.data) console.error('Google token error:', err.oauthError.data);
        console.error('Google OAuth callback failed:', err);
        return done(err, false);
      }
    }
  )
);

/* Session handlers */
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
