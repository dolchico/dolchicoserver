import dotenv from 'dotenv';
dotenv.config();
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0]?.value?.trim().toLowerCase();
        
        if (!email) {
          return done(new Error('Email is required from Google profile'), null);
        }

        // Check if this Google account is already linked
        const account = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: 'google',
              providerAccountId: profile.id,
            },
          },
        });

        if (account) {
          // Account exists, fetch the associated user and update last login
          const user = await prisma.user.update({
            where: { id: account.userId },
            data: { lastLoginAt: new Date() }
          });
          return done(null, user);
        }

        // No linked account: find user by email or create a new user
        let user = await prisma.user.findUnique({
          where: { email }
        });

        if (!user) {
          // Create new user with Google data
          user = await prisma.user.create({
            data: {
              email,
              name: profile.displayName || '',
              firstName: profile.name?.givenName || '',
              lastName: profile.name?.familyName || '',
              avatar: profile.photos?.[0]?.value || null,
              emailVerified: true,
              isActive: true,
              lastLoginAt: new Date()
            },
          });
        } else {
          // Update existing user with Google data
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              firstName: user.firstName || profile.name?.givenName || '',
              lastName: user.lastName || profile.name?.familyName || '',
              avatar: user.avatar || profile.photos?.[0]?.value || null,
              emailVerified: true,
              lastLoginAt: new Date()
            }
          });
        }

        // Link Google account to user
        await prisma.account.create({
          data: {
            provider: 'google',
            providerAccountId: profile.id,
            userId: user.id,
          },
        });

        return done(null, user);
      } catch (error) {
        console.error('Google OAuth error:', error);
        return done(error, false);
      }
    }
  )
);

// Facebook OAuth Strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
      scope: ['email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.trim().toLowerCase();
        
        if (!email) {
          return done(new Error('Email is required from Facebook profile'), null);
        }

        // Check if user exists with Facebook ID
        let user = await prisma.user.findUnique({
          where: { facebookId: profile.id }
        });

        if (user) {
          // Update last login
          user = await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() }
          });
          return done(null, user);
        }

        // Check if user exists with same email (account linking)
        user = await prisma.user.findUnique({
          where: { email }
        });

        if (user) {
          // Link Facebook account to existing user
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              facebookId: profile.id,
              firstName: user.firstName || profile.name?.givenName || '',
              lastName: user.lastName || profile.name?.familyName || '',
              avatar: user.avatar || profile.photos?.[0]?.value || null,
              emailVerified: true,
              lastLoginAt: new Date()
            }
          });
          return done(null, user);
        }

        // Create new user with Facebook data
        user = await prisma.user.create({
          data: {
            email,
            name: profile.displayName || `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim(),
            facebookId: profile.id,
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            avatar: profile.photos?.[0]?.value || null,
            emailVerified: true,
            isActive: true,
            lastLoginAt: new Date()
          }
        });

        return done(null, user);
      } catch (error) {
        console.error('Facebook OAuth error:', error);
        return done(error, false);
      }
    }
  )
);

// Serialize user ID into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: Number(id) },
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        emailVerified: true,
        phoneVerified: true,
        isActive: true,
        createdAt: true
      }
    });
    
    if (!user || !user.isActive) {
      return done(null, false);
    }
    
    done(null, user);
  } catch (error) {
    console.error('Deserialize user error:', error);
    done(error, null);
  }
});

export default passport;
