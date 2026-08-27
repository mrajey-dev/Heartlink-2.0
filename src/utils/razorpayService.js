// src/utils/razorpayService.js — Universal Razorpay Checkout Handler (Web & Native)
import { Platform } from 'react-native';

const loadRazorpayWebScript = () => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const openRazorpayCheckout = async (options) => {
  if (Platform.OS === 'web') {
    const isLoaded = await loadRazorpayWebScript();
    if (!isLoaded || !window.Razorpay) {
      throw new Error('Failed to load Razorpay Checkout SDK. Please check your internet connection.');
    }

    return new Promise((resolve, reject) => {
      const webOptions = {
        ...options,
        handler: (response) => {
          resolve({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        modal: {
          ...(options.modal || {}),
          ondismiss: () => {
            reject({ code: 'PAYMENT_CANCELED', description: 'Payment cancelled by user' });
          },
        },
      };

      const rzp = new window.Razorpay(webOptions);
      rzp.on('payment.failed', (response) => {
        reject(response.error || new Error('Payment failed'));
      });
      rzp.open();
    });
  } else {
    // Native platforms (iOS / Android)
    const RazorpayModule = require('react-native-razorpay');
    const RazorpayCheckout = RazorpayModule.default || RazorpayModule;
    return RazorpayCheckout.open(options);
  }
};

export default openRazorpayCheckout;
