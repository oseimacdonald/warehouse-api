const GoogleStrategy = require('passport-google-oauth20').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

/**
 * JWT Strategy for token authentication
 */
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
};

const jwtStrategy = new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await User.findById(payload.id).select('-password');
    
    if (user) {
      return done(null, user);
    } else {
      return done(null, false);
    }
  } catch (error) {
    console.error('JWT Strategy Error:', error);
    return done(error, false);
  }
});

/**
 * Google OAuth Strategy
 */
const googleStrategy = new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      // Update last login for existing user
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    }

    // Check if user exists with the same email (to link accounts)
    user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.image = profile.photos[0].value;
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    }

    // Create new user with Google OAuth
    user = await User.create({
      googleId: profile.id,
      displayName: profile.displayName,
      firstName: profile.name?.givenName || profile.displayName.split(' ')[0],
      lastName: profile.name?.familyName || profile.displayName.split(' ').slice(1).join(' ') || 'User',
      email: profile.emails[0].value,
      image: profile.photos[0].value,
      lastLogin: new Date()
    });

    console.log(`New user created via Google OAuth: ${user.email}`);
    return done(null, user);
    
  } catch (error) {
    console.error('Google OAuth Strategy Error:', error);
    
    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern && error.keyPattern.email) {
      return done(null, false, { message: 'Email already exists with different authentication method' });
    }
    
    return done(error, false);
  }
});

/**
 * Initialize passport with strategies
 */
module.exports = function(passport) {
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Use strategies
  passport.use(jwtStrategy);
  passport.use(googleStrategy);

  console.log('✅ Passport strategies initialized');
};