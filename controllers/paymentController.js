// // controllers/paymentController.js
// import PaytmChecksum from '../utils/PaytmChecksum.js';
// import PaytmConfig from '../config/paytmConfig.js';
// import axios from 'axios';

// // Generate unique order ID
// const generateOrderId = () => `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

// // Helper function to make Paytm API call for initiating transaction
// const makePaytmAPICall = async (paytmParams, orderId) => {
//     const url = `https://securestage.paytmpayments.com/theia/api/v1/initiateTransaction?mid=${PaytmConfig.MID}&orderId=${orderId}`;
//     try {
//         const response = await axios.post(url, paytmParams, {
//             headers: { 'Content-Type': 'application/json' },
//         });
//         return response.data;
//     } catch (error) {
//         const errorMessage = error.response?.data?.body?.resultInfo?.resultMsg || 'Failed to communicate with Paytm API';
//         throw new Error(errorMessage);
//     }
// };

// // Helper function to verify payment status
// const verifyPaymentStatus = async (orderId) => {
//     const paytmParams = {
//         body: {
//             mid: PaytmConfig.MID,
//             orderId: orderId,
//         },
//     };

//     const checksum = await PaytmChecksum.generateSignature(
//         JSON.stringify(paytmParams.body),
//         PaytmConfig.MERCHANT_KEY
//     );

//     paytmParams.head = {
//         signature: checksum,
//     };

//     const response = await axios.post(PaytmConfig.STATUS_QUERY_URL, paytmParams, {
//         headers: { 'Content-Type': 'application/json' },
//     });

//     return response.data;
// };

// // 1. Initiate Payment
// export const initiatePayment = async (req, res) => {
//     try {
//         const { amount, customerId, customerEmail, customerPhone } = req.body;

//         if (!amount || amount <= 0) {
//             return res.status(400).json({ success: false, message: 'Invalid amount' });
//         }

//         const orderId = generateOrderId();

//         const paytmParams = {
//             body: {
//                 requestType: "Payment",
//                 mid: PaytmConfig.MID,
//                 websiteName: PaytmConfig.WEBSITE,
//                 orderId: orderId,
//                 callbackUrl: PaytmConfig.CALLBACK_URL,
//                 txnAmount: {
//                     value: amount.toString(),
//                     currency: "INR",
//                 },
//                 userInfo: {
//                     custId: customerId || `CUST_${Date.now()}`,
//                     email: customerEmail,
//                     mobile: customerPhone,
//                 },
//             },
//         };

//         const checksum = await PaytmChecksum.generateSignature(
//             JSON.stringify(paytmParams.body),
//             PaytmConfig.MERCHANT_KEY
//         );

//         paytmParams.head = { signature: checksum };

//         const response = await makePaytmAPICall(paytmParams, orderId);

//         if (response.body.resultInfo.resultCode === "0000") {
//             res.json({
//                 success: true,
//                 data: {
//                     orderId,
//                     txnToken: response.body.txnToken,
//                     amount,
//                     mid: PaytmConfig.MID,
//                     paytmConfig: {
//                         mid: PaytmConfig.MID,
//                         orderId,
//                         txnToken: response.body.txnToken,
//                         amount: amount.toString(),
//                         callbackUrl: PaytmConfig.CALLBACK_URL,
//                         isStaging: true, // Set false for production
//                     },
//                 },
//             });
//         } else {
//             throw new Error(response.body.resultInfo.resultMsg);
//         }
//     } catch (error) {
//         console.error('Payment initiation error:', error);
//         res.status(500).json({
//             success: false,
//             message: error.message || 'Payment initiation failed',
//         });
//     }
// };

// // 2. Handle Payment Callback
// export const paymentCallback = async (req, res) => {
//     try {
//         const receivedData = req.body;
//         const isChecksumVerified = PaytmChecksum.verifySignature(
//             receivedData,
//             PaytmConfig.MERCHANT_KEY,
//             receivedData.CHECKSUMHASH
//         );

//         if (!isChecksumVerified) {
//             return res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=checksum_failed`);
//         }

//         const orderId = receivedData.ORDERID;
//         const statusResponse = await verifyPaymentStatus(orderId);

//         if (statusResponse.body.resultInfo.resultCode === "01") {
//             // Payment successful
//             res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}&txnId=${receivedData.TXNID}`);
//         } else {
//             // Payment failed
//             res.redirect(`${process.env.FRONTEND_URL}/payment/failed?orderId=${orderId}`);
//         }
//     } catch (error) {
//         console.error('Payment callback error:', error);
//         res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=callback_error`);
//     }
// };

// // 3. Verify Payment Status API Endpoint
// export const getPaymentStatus = async (req, res) => {
//     try {
//         const { orderId } = req.params;
//         const statusResponse = await verifyPaymentStatus(orderId);
//         res.json({
//             success: true,
//             data: statusResponse.body,
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message,
//         });
//     }
// };
