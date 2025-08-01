// controllers/paymentController.js
const PaytmChecksum = require('../utils/PaytmChecksum');
const PaytmConfig = require('../config/paytmConfig');
const https = require('https');
const axios = require('axios');

// Generate unique order ID
const generateOrderId = () => {
  return `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// 1. Initiate Payment
exports.initiatePayment = async (req, res) => {
  try {
    const { amount, customerId, customerEmail, customerPhone } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    const orderId = generateOrderId();

    // Prepare payment parameters
    const paytmParams = {
      body: {
        requestType: "Payment",
        mid: PaytmConfig.MID,
        websiteName: PaytmConfig.WEBSITE,
        orderId: orderId,
        callbackUrl: PaytmConfig.CALLBACK_URL,
        txnAmount: {
          value: amount.toString(),
          currency: "INR"
        },
        userInfo: {
          custId: customerId || `CUST_${Date.now()}`,
          email: customerEmail,
          mobile: customerPhone
        }
      }
    };

    // Generate checksum
    const checksum = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body), 
      PaytmConfig.MERCHANT_KEY
    );

    paytmParams.head = {
      signature: checksum
    };

    // Make API call to Paytm
    const response = await makePaytmAPICall(paytmParams, orderId);
    
    if (response.body.resultInfo.resultCode === "0000") {
      // Store transaction in database (optional)
      // await storeTransaction({
      //   orderId,
      //   amount,
      //   customerId,
      //   status: 'INITIATED',
      //   txnToken: response.body.txnToken
      // });

      res.json({
        success: true,
        data: {
          orderId: orderId,
          txnToken: response.body.txnToken,
          amount: amount,
          mid: PaytmConfig.MID,
          // For frontend integration
          paytmConfig: {
            mid: PaytmConfig.MID,
            orderId: orderId,
            txnToken: response.body.txnToken,
            amount: amount.toString(),
            callbackUrl: PaytmConfig.CALLBACK_URL,
            isStaging: true // Set false for production
          }
        }
      });
    } else {
      throw new Error(response.body.resultInfo.resultMsg);
    }

  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment initiation failed'
    });
  }
};

// Helper function to make Paytm API call
const makePaytmAPICall = (paytmParams, orderId) => {
  return new Promise((resolve, reject) => {
    const post_data = JSON.stringify(paytmParams);

    const options = {
      hostname: 'securestage.paytmpayments.com', // Change for production
      port: 443,
      path: `/theia/api/v1/initiateTransaction?mid=${PaytmConfig.MID}&orderId=${orderId}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': post_data.length
      }
    };

    let response = "";
    const post_req = https.request(options, (post_res) => {
      post_res.on('data', (chunk) => {
        response += chunk;
      });

      post_res.on('end', () => {
        try {
          const parsedResponse = JSON.parse(response);
          resolve(parsedResponse);
        } catch (error) {
          reject(new Error('Invalid response from Paytm'));
        }
      });
    });

    post_req.on('error', (error) => {
      reject(error);
    });

    post_req.write(post_data);
    post_req.end();
  });
};

// 2. Handle Payment Callback
exports.paymentCallback = async (req, res) => {
  try {
    const receivedData = req.body;
    
    // Verify checksum
    const checksumVerify = PaytmChecksum.verifySignature(
      receivedData, 
      PaytmConfig.MERCHANT_KEY, 
      receivedData.CHECKSUMHASH
    );

    if (checksumVerify) {
      // Checksum verified - proceed with order status verification
      const orderId = receivedData.ORDERID;
      const statusResponse = await verifyPaymentStatus(orderId);
      
      if (statusResponse.body.resultInfo.resultCode === "01") {
        // Payment successful
        // Update database
        // await updateTransaction(orderId, {
        //   status: 'SUCCESS',
        //   txnId: receivedData.TXNID,
        //   paymentMode: receivedData.PAYMENTMODE,
        //   responseData: receivedData
        // });

        // Redirect to success page
        res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}&txnId=${receivedData.TXNID}`);
      } else {
        // Payment failed
        // await updateTransaction(orderId, {
        //   status: 'FAILED',
        //   responseData: receivedData
        // });

        res.redirect(`${process.env.FRONTEND_URL}/payment/failed?orderId=${orderId}`);
      }
    } else {
      // Checksum verification failed
      res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=checksum_failed`);
    }

  } catch (error) {
    console.error('Payment callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/failed?error=callback_error`);
  }
};

// 3. Verify Payment Status
exports.verifyPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const statusResponse = await verifyPaymentStatus(orderId);
    
    res.json({
      success: true,
      data: statusResponse.body
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to verify payment status
const verifyPaymentStatus = async (orderId) => {
  const paytmParams = {
    body: {
      mid: PaytmConfig.MID,
      orderId: orderId
    }
  };

  const checksum = await PaytmChecksum.generateSignature(
    JSON.stringify(paytmParams.body), 
    PaytmConfig.MERCHANT_KEY
  );

  paytmParams.head = {
    signature: checksum
  };

  const response = await axios.post(PaytmConfig.STATUS_QUERY_URL, paytmParams, {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  return response.data;
};
