import express from 'express';
import { 
  getPrivacyPolicy, 
  getTermsOfService, 
  getDataDeletionInstructions,
  getCookiePolicy,
  getGDPRInfo,
  handleDataDeletionRequest
} from '../controllers/legalController.js';
import { apiLimiter } from '../middleware/authMiddleware.js';

const router = express.Router();

// Privacy Policy Route
router.get('/privacy-policy', apiLimiter, getPrivacyPolicy);

// Terms of Service Route
router.get('/terms-of-service', apiLimiter, getTermsOfService);

// Cookie Policy Route
router.get('/cookie-policy', apiLimiter, getCookiePolicy);

// GDPR Information Route
router.get('/gdpr-info', apiLimiter, getGDPRInfo);

// Data Deletion Instructions (for Facebook compliance)
router.get('/data-deletion', apiLimiter, getDataDeletionInstructions);

// Data deletion status check
router.get('/data-deletion-status/:confirmationCode', apiLimiter, handleDataDeletionRequest);

// Legal documents API endpoints
router.get('/api/legal/privacy', apiLimiter, (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Privacy Policy',
      lastUpdated: '2024-01-01',
      url: `${req.protocol}://${req.get('host')}/privacy-policy`
    }
  });
});

router.get('/api/legal/terms', apiLimiter, (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Terms of Service',
      lastUpdated: '2024-01-01',
      url: `${req.protocol}://${req.get('host')}/terms-of-service`
    }
  });
});

// Health check for legal routes
router.get('/legal/health', (req, res) => {
  res.json({
    status: 'OK',
    routes: {
      privacy: '/privacy-policy',
      terms: '/terms-of-service',
      cookies: '/cookie-policy',
      gdpr: '/gdpr-info',
      dataDeletion: '/data-deletion'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
