import { PrismaClient } from '@prisma/client';
import logger from '../logger.js';

const prisma = new PrismaClient();

/**
 * Privacy Policy Controller
 */
export const getPrivacyPolicy = (req, res) => {
  try {
    const privacyPolicyHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Privacy Policy - Dolchico</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; background-color: #f9f9f9; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 30px; }
            .last-updated { background: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
            .contact-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Privacy Policy</h1>
            <div class="last-updated">
                <strong>Last Updated:</strong> January 1, 2024
            </div>
            
            <h2>1. Information We Collect</h2>
            <p>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact us. This includes:</p>
            <ul>
                <li>Name and contact information (email, phone number)</li>
                <li>Payment information (processed securely through third-party payment processors)</li>
                <li>Shipping and billing addresses</li>
                <li>Account credentials</li>
                <li>Communication preferences</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
                <li>Process and fulfill your orders</li>
                <li>Communicate with you about your account and orders</li>
                <li>Provide customer support</li>
                <li>Send marketing communications (with your consent)</li>
                <li>Improve our services and develop new features</li>
                <li>Comply with legal obligations</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information with:</p>
            <ul>
                <li>Service providers who assist in our operations (payment processors, shipping companies)</li>
                <li>Legal authorities when required by law</li>
                <li>Business partners with your explicit consent</li>
            </ul>

            <h2>4. OAuth and Social Login</h2>
            <p>When you use social login (Google, Facebook), we collect:</p>
            <ul>
                <li>Basic profile information (name, email, profile picture)</li>
                <li>Information necessary for authentication</li>
            </ul>
            <p>We only access information that you explicitly grant permission for.</p>

            <h2>5. Data Security</h2>
            <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

            <h2>6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul>
                <li>Access your personal information</li>
                <li>Correct inaccurate information</li>
                <li>Request deletion of your information</li>
                <li>Object to processing of your information</li>
                <li>Data portability</li>
            </ul>

            <h2>7. Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to enhance your browsing experience, analyze site traffic, and personalize content.</p>

            <h2>8. Data Retention</h2>
            <p>We retain your information for as long as necessary to provide our services, comply with legal obligations, and resolve disputes.</p>

            <h2>9. International Transfers</h2>
            <p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place.</p>

            <h2>10. Children's Privacy</h2>
            <p>Our services are not intended for individuals under 13 years of age. We do not knowingly collect personal information from children under 13.</p>

            <h2>11. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>

            <div class="contact-info">
                <h2>Contact Us</h2>
                <p>If you have any questions about this Privacy Policy, please contact us at:</p>
                <p>
                    <strong>Email:</strong> privacy@dolchico.com<br>
                    <strong>Website:</strong> <a href="https://dolchico.com">https://dolchico.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(privacyPolicyHTML);
  } catch (error) {
    logger.error('Privacy policy error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load privacy policy'
    });
  }
};

/**
 * Terms of Service Controller
 */
export const getTermsOfService = (req, res) => {
  try {
    const termsHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Terms of Service - Dolchico</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; background-color: #f9f9f9; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; border-bottom: 3px solid #28a745; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 30px; }
            .last-updated { background: #e8f5e8; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
            .contact-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Terms of Service</h1>
            <div class="last-updated">
                <strong>Last Updated:</strong> January 1, 2024
            </div>
            
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing and using Dolchico's services, you accept and agree to be bound by the terms and provision of this agreement.</p>

            <h2>2. Description of Service</h2>
            <p>Dolchico is an e-commerce platform that provides online shopping services for fashion and lifestyle products.</p>

            <h2>3. User Accounts</h2>
            <p>To access certain features, you must create an account. You are responsible for:</p>
            <ul>
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Providing accurate and up-to-date information</li>
            </ul>

            <h2>4. Prohibited Uses</h2>
            <p>You may not use our service:</p>
            <ul>
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                <li>To submit false or misleading information</li>
            </ul>

            <h2>5. Products and Services</h2>
            <p>All products and services are subject to availability. We reserve the right to:</p>
            <ul>
                <li>Modify or discontinue products and services</li>
                <li>Limit quantities of products or services</li>
                <li>Refuse service to anyone for any reason</li>
            </ul>

            <h2>6. Pricing and Payment</h2>
            <p>All prices are subject to change without notice. Payment is due at the time of purchase. We accept various payment methods as displayed at checkout.</p>

            <h2>7. Shipping and Returns</h2>
            <p>Shipping and return policies are outlined separately and incorporated by reference into these terms.</p>

            <h2>8. Intellectual Property</h2>
            <p>The service and its original content, features, and functionality are owned by Dolchico and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.</p>

            <h2>9. Privacy Policy</h2>
            <p>Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service.</p>

            <h2>10. Limitation of Liability</h2>
            <p>In no event shall Dolchico be liable for any indirect, incidental, special, consequential, or punitive damages.</p>

            <h2>11. Indemnification</h2>
            <p>You agree to defend, indemnify, and hold harmless Dolchico from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including attorney's fees).</p>

            <h2>12. Termination</h2>
            <p>We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, for any reason whatsoever.</p>

            <h2>13. Governing Law</h2>
            <p>These terms shall be interpreted and governed by the laws of the jurisdiction in which Dolchico operates.</p>

            <h2>14. Changes to Terms</h2>
            <p>We reserve the right to modify or replace these terms at any time. If a revision is material, we will try to provide at least 30 days notice.</p>

            <div class="contact-info">
                <h2>Contact Information</h2>
                <p>If you have any questions about these Terms of Service, please contact us at:</p>
                <p>
                    <strong>Email:</strong> legal@dolchico.com<br>
                    <strong>Website:</strong> <a href="https://dolchico.com">https://dolchico.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(termsHTML);
  } catch (error) {
    logger.error('Terms of service error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load terms of service'
    });
  }
};

/**
 * Cookie Policy Controller
 */
export const getCookiePolicy = (req, res) => {
  try {
    const cookiePolicyHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cookie Policy - Dolchico</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; background-color: #f9f9f9; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; border-bottom: 3px solid #ff9800; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 30px; }
            .last-updated { background: #fff3e0; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Cookie Policy</h1>
            <div class="last-updated">
                <strong>Last Updated:</strong> January 1, 2024
            </div>
            
            <h2>What Are Cookies</h2>
            <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website.</p>

            <h2>How We Use Cookies</h2>
            <p>We use cookies to:</p>
            <ul>
                <li>Remember your preferences and settings</li>
                <li>Keep you signed in</li>
                <li>Provide personalized content</li>
                <li>Analyze how our services are used</li>
                <li>Improve our services</li>
            </ul>

            <h2>Types of Cookies We Use</h2>
            <ul>
                <li><strong>Essential Cookies:</strong> Required for the website to function properly</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our website</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements</li>
            </ul>

            <h2>Managing Cookies</h2>
            <p>You can control and manage cookies in various ways. Please note that removing or blocking cookies can impact your user experience.</p>
        </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(cookiePolicyHTML);
  } catch (error) {
    logger.error('Cookie policy error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load cookie policy'
    });
  }
};

/**
 * GDPR Information Controller
 */
export const getGDPRInfo = (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'GDPR Information',
      rights: [
        'Right to be informed',
        'Right of access',
        'Right to rectification',
        'Right to erasure',
        'Right to restrict processing',
        'Right to data portability',
        'Right to object',
        'Rights related to automated decision making'
      ],
      contact: {
        email: 'gdpr@dolchico.com',
        dpo: 'privacy@dolchico.com'
      },
      lastUpdated: '2024-01-01'
    }
  });
};

/**
 * Data Deletion Instructions Controller
 */
export const getDataDeletionInstructions = (req, res) => {
  try {
    const deletionHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Data Deletion Instructions - Dolchico</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; background-color: #f9f9f9; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; border-bottom: 3px solid #dc3545; padding-bottom: 10px; }
            h2 { color: #555; margin-top: 30px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Data Deletion Instructions</h1>
            
            <div class="warning">
                <strong>Important:</strong> Deleting your data is irreversible. Please make sure you want to proceed.
            </div>

            <h2>How to Request Data Deletion</h2>
            <ol>
                <li>Send an email to: <strong>privacy@dolchico.com</strong></li>
                <li>Include your account email address</li>
                <li>Specify what data you want deleted</li>
                <li>We will process your request within 30 days</li>
            </ol>

            <h2>What Data Will Be Deleted</h2>
            <ul>
                <li>Personal information (name, email, phone)</li>
                <li>Account data</li>
                <li>Order history (anonymized)</li>
                <li>Marketing preferences</li>
            </ul>

            <h2>Data Retention</h2>
            <p>Some data may be retained for legal compliance purposes, such as:</p>
            <ul>
                <li>Transaction records (for tax purposes)</li>
                <li>Legal obligations</li>
            </ul>

            <p>For questions about data deletion, contact us at <strong>privacy@dolchico.com</strong></p>
        </div>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(deletionHTML);
  } catch (error) {
    logger.error('Data deletion instructions error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load data deletion instructions'
    });
  }
};

/**
 * Handle Data Deletion Request Status
 */
export const handleDataDeletionRequest = async (req, res) => {
  try {
    const { confirmationCode } = req.params;
    
    const deletionRequest = await prisma.dataDeletionRequest.findUnique({
      where: { confirmationCode },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        completedAt: true,
        provider: true
      }
    });
    
    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Deletion request not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        status: deletionRequest.status,
        provider: deletionRequest.provider,
        requestedAt: deletionRequest.requestedAt,
        completedAt: deletionRequest.completedAt,
        message: getStatusMessage(deletionRequest.status)
      }
    });
  } catch (error) {
    logger.error('Data deletion status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deletion status'
    });
  }
};

/**
 * Get status message for deletion request
 */
const getStatusMessage = (status) => {
  switch (status) {
    case 'PENDING':
      return 'Your data deletion request is being processed';
    case 'COMPLETED':
      return 'Your data has been successfully deleted';
    case 'FAILED':
      return 'Data deletion request failed. Please contact support';
    default:
      return 'Unknown status';
  }
};

export default {
  getPrivacyPolicy,
  getTermsOfService,
  getCookiePolicy,
  getGDPRInfo,
  getDataDeletionInstructions,
  handleDataDeletionRequest
};
