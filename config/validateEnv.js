import logger from '../logger.js';

/**
 * Validates all required environment variables for the application
 * Exits the process if any critical variables are missing
 */
export const validateRequiredEnvVars = () => {
  // Critical environment variables
  const criticalEnvVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'JWT_SECRET'
  ];

  // OAuth environment variables
  const oauthEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_CALLBACK_URL',
    'FACEBOOK_APP_ID',
    'FACEBOOK_APP_SECRET',
    'FACEBOOK_CALLBACK_URL'
  ];

  // Email service environment variables
const emailEnvVars = [
  'RESEND_API_KEY',
  'MAIL_FROM',
  'MAIL_FROM_NAME'
];
  // Optional but recommended environment variables
  const optionalEnvVars = [
    'FRONTEND_URL',
    'NODE_ENV',
    'PORT',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_SECRET_KEY',
    'CLOUDINARY_NAME'
  ];

  // Check critical environment variables
  const missingCritical = criticalEnvVars.filter(key => !process.env[key]);
  
  if (missingCritical.length > 0) {
    logger.error('❌ Missing critical environment variables:', missingCritical);
    console.error('\n🔴 CRITICAL ERROR: Missing required environment variables');
    console.error('Missing variables:', missingCritical.join(', '));
    console.error('\nThe application cannot start without these variables.');
    console.error('Please check your .env file and ensure all required variables are set.\n');
    process.exit(1);
  }

  // Check OAuth environment variables
  const missingOAuth = oauthEnvVars.filter(key => !process.env[key]);
  
  if (missingOAuth.length > 0) {
    logger.warn('⚠️  Missing OAuth environment variables:', missingOAuth);
    console.warn('\n🟡 WARNING: Missing OAuth configuration');
    console.warn('Missing variables:', missingOAuth.join(', '));
    console.warn('OAuth authentication will not work properly.\n');
  }

  // Check email service variables
  const missingEmail = emailEnvVars.filter(key => !process.env[key]);
  
  if (missingEmail.length > 0) {
    logger.warn('⚠️  Missing email service environment variables:', missingEmail);
    console.warn('\n🟡 WARNING: Missing email service configuration');
    console.warn('Missing variables:', missingEmail.join(', '));
    console.warn('Password reset and email notifications will not work.\n');
  }

  // Check optional environment variables
  const missingOptional = optionalEnvVars.filter(key => !process.env[key]);
  
  if (missingOptional.length > 0) {
    logger.info('ℹ️  Missing optional environment variables:', missingOptional);
  }

  // Validate specific environment variable formats
  validateEnvVarFormats();

  // Log success
  logger.info('✅ Environment validation completed successfully');
  
  // Log configuration summary
  logConfigurationSummary();
};

/**
 * Validates the format and values of specific environment variables
 */
const validateEnvVarFormats = () => {
  // Validate NODE_ENV
  if (process.env.NODE_ENV && !['development', 'production', 'test'].includes(process.env.NODE_ENV)) {
    logger.warn('Invalid NODE_ENV value. Should be: development, production, or test');
  }

  // Validate PORT
  if (process.env.PORT && (isNaN(process.env.PORT) || Number(process.env.PORT) < 1 || Number(process.env.PORT) > 65535)) {
    logger.warn('Invalid PORT value. Should be a number between 1 and 65535');
  }

  // Validate SMTP_PORT
  if (process.env.SMTP_PORT && isNaN(process.env.SMTP_PORT)) {
    logger.warn('Invalid SMTP_PORT value. Should be a number');
  }

  // Validate URLs
  const urlVars = ['FRONTEND_URL', 'GOOGLE_CALLBACK_URL', 'FACEBOOK_CALLBACK_URL'];
  urlVars.forEach(varName => {
    if (process.env[varName]) {
      try {
        new URL(process.env[varName]);
      } catch (error) {
        logger.warn(`Invalid URL format for ${varName}: ${process.env[varName]}`);
      }
    }
  });

  // Validate email format
  if (process.env.SMTP_FROM && !isValidEmail(process.env.SMTP_FROM)) {
    logger.warn('Invalid SMTP_FROM email format');
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters long for security');
  }

  // Validate SESSION_SECRET length
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    logger.warn('SESSION_SECRET should be at least 32 characters long for security');
  }
};

/**
 * Validates email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Logs configuration summary
 */
const logConfigurationSummary = () => {
  const config = {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 4000,
    database: process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured',
    oauth: {
      google: (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ? '✅ Configured' : '❌ Not configured',
      facebook: (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) ? '✅ Configured' : '❌ Not configured'
    },
    email: (process.env.SMTP_HOST && process.env.SMTP_USER) ? '✅ Configured' : '❌ Not configured',
    cloudinary: (process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_SECRET_KEY) ? '✅ Configured' : '❌ Not configured',
    frontend: process.env.FRONTEND_URL || 'Not specified'
  };

  logger.info('📋 Configuration Summary:', config);
};

/**
 * Development environment helper
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV !== 'production';
};

/**
 * Production environment helper
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Get environment with fallback
 */
export const getEnvVar = (key, defaultValue = null) => {
  return process.env[key] || defaultValue;
};

/**
 * Get required environment variable with error
 */
export const getRequiredEnvVar = (key) => {
  const value = process.env[key];
  if (!value) {
    logger.error(`Missing required environment variable: ${key}`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export default {
  validateRequiredEnvVars,
  isDevelopment,
  isProduction,
  getEnvVar,
  getRequiredEnvVar
};
