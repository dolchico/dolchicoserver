import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('[Passport] Google profile received:', profile.id);
        
        const email = profile.emails?.[0]?.value?.toLowerCase();
        if (!email) {
          return done(new Error('No email found in Google profile'), null);
        }

        // Check for existing account link
        let account = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: 'google',
              providerAccountId: profile.id,
            },
          },
          include: { user: true },
        });

        if (account) {
          console.log('[Passport] Found existing account link');
          return done(null, account.user);
        }

        // Find or create user by email
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          console.log('[Passport] Creating new user');
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName || 'Google User',
              emailVerified: true,
              isActive: true,
              role: 'USER',
            },
          });
        } else {
          console.log('[Passport] Found existing user, updating verification');
          // Update verification status for existing user
          user = await prisma.user.update({
            where: { id: user.id },
            data: { emailVerified: true },
          });
        }

        // Create account link
        await prisma.account.create({
          data: {
            provider: 'google',
            providerAccountId: profile.id,
            userId: user.id,
            accessToken,
            refreshToken,
          },
        });

        console.log('[Passport] User authenticated:', user.id);
        done(null, user);
      } catch (error) {
        console.error('[Passport] Strategy error:', error);
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
