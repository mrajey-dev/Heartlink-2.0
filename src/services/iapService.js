// src/services/iapService.js — Google Play Billing & In-App Purchase Service
import { Platform } from 'react-native';

// Safe lazy loading of react-native-iap to prevent crashes in Expo Go or un-rebuilt native clients
let RNIap = null;
const getIAP = () => {
  if (Platform.OS === 'web') return null;
  if (!RNIap) {
    try {
      RNIap = require('react-native-iap');
    } catch (e) {
      console.warn('[IAP] Native billing module not available in this client build:', e?.message || e);
      return null;
    }
  }
  return RNIap;
};

// Exact Product IDs configured in Google Play Console Subscriptions
export const SUBSCRIPTION_SKUS = Platform.select({
  android: [
    'heartlink_basic',
    'heartlink_plus',
    'heartlink_premium',
    'superlike',
    'aadharverification',
  ],
  ios: [
    'heartlink_basic',
    'heartlink_plus',
    'heartlink_premium',
    'superlike',
    'aadharverification',
  ],
  default: [],
});

// Consumable top-up packs
export const IN_APP_SKUS = Platform.select({
  android: [
    'superlike_pack_5',
    'superlike_pack_15',
    'superlike_pack_30',
  ],
  ios: [
    'superlike_pack_5',
    'superlike_pack_15',
    'superlike_pack_30',
  ],
  default: [],
});

let isIapInitialized = false;

/**
 * Initialize connection to Google Play Store / App Store
 */
export const initializeIAP = async () => {
  const iap = getIAP();
  if (!iap || typeof iap.initConnection !== 'function') {
    console.log('[IAP] In-App Purchases not supported on current runtime');
    return false;
  }

  try {
    const result = await iap.initConnection();
    isIapInitialized = true;
    console.log('[IAP] Connected to store successfully:', result);
    return true;
  } catch (err) {
    console.warn('[IAP] Init connection error:', err?.message || err);
    return false;
  }
};

/**
 * Listeners for purchase updates from Google Play Store
 */
export const setupPurchaseListeners = (onPurchaseSuccess, onPurchaseError) => {
  const iap = getIAP();
  if (!iap) return () => {};

  let purchaseUpdateSubscription = null;
  let purchaseErrorSubscription = null;

  if (typeof iap.purchaseUpdatedListener === 'function') {
    purchaseUpdateSubscription = iap.purchaseUpdatedListener(async (purchase) => {
      console.log('[IAP Listener] Purchase updated:', purchase);
      if (onPurchaseSuccess) {
        onPurchaseSuccess(purchase);
      }
    });
  }

  if (typeof iap.purchaseErrorListener === 'function') {
    purchaseErrorSubscription = iap.purchaseErrorListener((error) => {
      console.warn('[IAP Listener] Purchase error:', error);
      if (onPurchaseError) {
        onPurchaseError(error);
      }
    });
  }

  return () => {
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove();
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove();
    }
  };
};

/**
 * Fetch available subscriptions from Google Play Store (supports react-native-iap v14 & v12/13)
 */
export const getAvailableSubscriptions = async (skus = SUBSCRIPTION_SKUS) => {
  const iap = getIAP();
  if (!iap) return [];

  try {
    if (!isIapInitialized) await initializeIAP();

    let subscriptions = [];
    if (typeof iap.fetchProducts === 'function') {
      // react-native-iap v14 API
      subscriptions = await iap.fetchProducts({ skus, type: 'subs' });
      if ((!subscriptions || subscriptions.length === 0) && Platform.OS === 'android') {
        await new Promise((res) => setTimeout(res, 600));
        subscriptions = await iap.fetchProducts({ skus, type: 'subs' });
      }
    } else if (typeof iap.getSubscriptions === 'function') {
      // Legacy react-native-iap v12/13 API
      subscriptions = await iap.getSubscriptions({ skus });
      if ((!subscriptions || subscriptions.length === 0) && Platform.OS === 'android') {
        await new Promise((res) => setTimeout(res, 600));
        subscriptions = await iap.getSubscriptions({ skus });
      }
    }

    console.log('[IAP] Subscriptions loaded from Play Store:', subscriptions?.length);
    return subscriptions || [];
  } catch (err) {
    console.warn('[IAP] Failed to fetch subscriptions:', err?.message || err);
    return [];
  }
};

/**
 * Fetch consumable / one-time products (e.g. Superlike packs)
 */
export const getAvailableProducts = async (skus = IN_APP_SKUS) => {
  const iap = getIAP();
  if (!iap) return [];

  try {
    if (!isIapInitialized) await initializeIAP();

    let products = [];
    if (typeof iap.fetchProducts === 'function') {
      // react-native-iap v14 API
      products = await iap.fetchProducts({ skus, type: 'in-app' });
    } else if (typeof iap.getProducts === 'function') {
      // Legacy react-native-iap v12/13 API
      products = await iap.getProducts({ skus });
    }

    console.log('[IAP] Products loaded:', products?.length);
    return products || [];
  } catch (err) {
    console.warn('[IAP] Failed to fetch products:', err?.message || err);
    return [];
  }
};

/**
 * Fetch available/active purchases from Google Play Store cache
 */
export const getAvailablePurchases = async () => {
  const iap = getIAP();
  if (!iap) return [];

  try {
    if (!isIapInitialized) await initializeIAP();

    let purchases = [];
    if (typeof iap.getAvailablePurchases === 'function') {
      purchases = await iap.getAvailablePurchases();
    }
    console.log('[IAP] Available purchases on device:', purchases?.length);
    return purchases || [];
  } catch (err) {
    console.warn('[IAP] Failed to get available purchases:', err?.message || err);
    return [];
  }
};

/**
 * Helper to match Google Play Subscriptions v2 base plan / offer
 * Matches by:
 * 1. Base Plan IDs configured in Google Play Console (basic6month [1-month], basic6-month [6-month], basicyearly, plusmonthly, plus6month, plusyearly, premiummonthly, premium6month, premiumyearly)
 * 2. ISO 8601 billingPeriod in pricingPhases (P1M, P6M, P1Y)
 * 3. 20% discount offer flag
 */
export const findMatchingOffer = (subscription, durationId = '6m', isDiscountOffer = false) => {
  if (!subscription) return null;

  const offers =
    subscription.subscriptionOfferDetailsAndroid ||
    subscription.subscriptionOffers ||
    subscription.subscriptionOfferDetails ||
    [];

  if (!Array.isArray(offers) || offers.length === 0) return null;

  const dur = (durationId || '6m').toLowerCase().trim();

  // Special match for 'superlike' subscription base plans (superlikepack5, superlikepack15, superlikepack30)
  const subId = (subscription?.id || subscription?.productId || '').toLowerCase();
  if (subId.includes('superlike')) {
    const packMatch = offers.find((o) => {
      const id = (o?.basePlanId || '').toLowerCase();
      if (dur.includes('30') && id.includes('30')) return true;
      if (dur.includes('15') && id.includes('15')) return true;
      if (dur.includes('5') && id.includes('5') && !id.includes('15') && !id.includes('30')) return true;
      return false;
    });
    if (packMatch) return packMatch;
  }

  // Special match for 'aadharverification' subscription (aadharverificaationonetimepurchase)
  if (subId.includes('aadhar') || subId.includes('verification')) {
    const vMatch = offers.find((o) => {
      const id = (o?.basePlanId || '').toLowerCase();
      return id.includes('aadhar') || id.includes('verif');
    });
    if (vMatch) return vMatch;
  }

  // Helper to test if offer matches requested duration
  const matchesDuration = (offer) => {
    const basePlanId = (offer?.basePlanId || '').toLowerCase();

    // Specific Play Console configuration:
    // 'basic6month' is configured as a 1-month plan
    // 'basic6-month' is configured as the 6-month plan
    if (basePlanId === 'basic6month') {
      return dur === '1m';
    }
    if (basePlanId === 'basic6-month') {
      return dur === '6m';
    }

    // 1. Match by Google Play ISO 8601 billingPeriod in pricingPhases first (most accurate standard)
    const phases =
      offer?.pricingPhases?.pricingPhaseList ||
      (Array.isArray(offer?.pricingPhases) ? offer.pricingPhases : []) ||
      [];

    const phaseMatch = phases.some((phase) => {
      const bp = (phase?.billingPeriod || '').toUpperCase();
      if (dur === '1m' && (bp === 'P1M' || bp === 'P30D' || bp === 'P4W')) return true;
      if (dur === '6m' && (bp === 'P6M' || bp === 'P180D' || bp === 'P24W')) return true;
      if (dur === '12m' && (bp === 'P1Y' || bp === 'P12M' || bp === 'P365D' || bp === 'P52W')) return true;
      return false;
    });

    if (phaseMatch) return true;

    // 2. Specific base plan ID matching based on Google Play Console configuration
    if (dur === '12m') {
      return (
        basePlanId.includes('year') ||
        basePlanId.includes('yearly') ||
        basePlanId.includes('12m') ||
        basePlanId.includes('1y') ||
        basePlanId.includes('annual')
      );
    } else if (dur === '6m') {
      if (basePlanId === 'basic6month') return false;
      return (
        basePlanId === 'basic6-month' ||
        basePlanId === 'plus6month' ||
        basePlanId === 'plus6-month' ||
        basePlanId === 'premium6month' ||
        basePlanId === 'premium6-month' ||
        (basePlanId.includes('6m') && !basePlanId.includes('1m')) ||
        (basePlanId.includes('6-month') && !basePlanId.includes('1m')) ||
        (basePlanId.includes('6month') && !basePlanId.includes('1m') && basePlanId !== 'basic6month') ||
        (basePlanId.includes('6') && !basePlanId.includes('1') && !basePlanId.includes('year'))
      );
    } else if (dur === '1m') {
      if (basePlanId === 'basic6month') return true;
      if (basePlanId === 'basic6-month') return false;
      // Must NOT contain 6, 12, or year!
      if (basePlanId.includes('6') || basePlanId.includes('12') || basePlanId.includes('year')) {
        return false;
      }
      return (
        basePlanId.includes('plusmonthly') ||
        basePlanId.includes('premiummonthly') ||
        basePlanId.includes('basicmonthly') ||
        basePlanId.includes('basic-monthly') ||
        basePlanId.includes('basic1month') ||
        basePlanId.includes('basic-1month') ||
        basePlanId.includes('1m') ||
        basePlanId.includes('month') ||
        basePlanId.includes('monthly')
      );
    }

    return false;
  };

  const matchingOffers = offers.filter(matchesDuration);

  if (matchingOffers.length > 0) {
    if (isDiscountOffer) {
      // Look for a discount offer or promo base plan
      const discountOffer = matchingOffers.find((o) => {
        const idStr = `${o?.offerId || ''} ${o?.basePlanId || ''}`.toLowerCase();
        return (
          idStr.includes('20') ||
          idStr.includes('discount') ||
          idStr.includes('offer') ||
          idStr.includes('welcome')
        );
      });
      if (discountOffer) return discountOffer;
    } else {
      // Non-discount regular base plan
      const regularOffer = matchingOffers.find((o) => !o?.offerId);
      if (regularOffer) return regularOffer;
    }
    return matchingOffers[0];
  }

  // Positional fallback when exactly 3 base plans are configured in standard order (1m, 6m, 12m)
  if (offers.length === 3) {
    if (dur === '1m' && offers[0]) return offers[0];
    if (dur === '6m' && offers[1]) return offers[1];
    if (dur === '12m' && offers[2]) return offers[2];
  }

  if (offers.length === 1) {
    return offers[0];
  }

  return offers[0];
};

/**
 * Maps any plan key, display name, or partial string to the exact Google Play Console subscription SKU:
 * 'heartlink_basic', 'heartlink_plus', 'heartlink_premium', 'superlike', or 'aadharverification'
 */
export const resolveSubscriptionSku = (keyOrName) => {
  const str = String(keyOrName || '').toLowerCase().trim();
  if (str.includes('aadhar') || str.includes('verification')) return 'aadharverification';
  if (str.includes('superlike')) return 'superlike';
  if (str.includes('premium')) return 'heartlink_premium';
  if (str.includes('plus')) return 'heartlink_plus';
  if (str.includes('basic')) return 'heartlink_basic';
  return 'heartlink_basic';
};

/**
 * Purchase subscription plan supporting Google Play Subscriptions v2
 */
export const purchaseSubscriptionPlan = async ({ planKey, durationId = '6m', skuOverride = null, isDiscountOffer = false }) => {
  const iap = getIAP();
  if (!iap) {
    throw new Error(
      'Google Play Billing is not supported inside Expo Go because native TurboModules (Nitro) cannot run in the Expo Go sandbox.\n\nTo test Google Play Billing on Android, run:\n  npx expo run:android\nor install the standalone release APK.'
    );
  }

  if (!isIapInitialized) {
    await initializeIAP();
  }

  const rawTarget = skuOverride || resolveSubscriptionSku(planKey);
  const targetSku = String(rawTarget || '').toLowerCase().trim();

  // Fetch subscriptions from Google Play to obtain valid offerToken
  const subscriptions = await getAvailableSubscriptions();
  console.log('[IAP] Available subscriptions in store:', subscriptions?.map((s) => s?.productId || s?.id));

  if (!subscriptions || subscriptions.length === 0) {
    throw new Error(
      `Google Play Store did not return any subscriptions for this app.\n\n` +
      `Checklist to enable Google Play Billing testing:\n` +
      `1. Make sure the Google Account on this phone is added to "License testing" in Google Play Console (Setup > License testing).\n` +
      `2. If using Internal Testing, open the invite link on this phone and tap "Accept Invite".\n` +
      `3. Verify that the app was uploaded to Google Play Console with matching package name (com.heartlinkdatingapp.app).`
    );
  }

  // Find exact matching subscription product from Google Play Store
  const sub = subscriptions.find((s) => {
    const sId = String(s?.productId || s?.id || '').toLowerCase().trim();
    return sId === targetSku || resolveSubscriptionSku(sId) === targetSku;
  });

  if (!sub) {
    const availableSkus = subscriptions.map((s) => s?.productId || s?.id).filter(Boolean).join(', ');
    throw new Error(
      `Subscription "${targetSku}" was not found in Google Play Store.\n` +
      `Available in store: ${availableSkus || 'none'}\n\n` +
      `Please ensure that "${targetSku}" is active in Google Play Console (Monetize with Play > Subscriptions).`
    );
  }

  const matchedOffer = findMatchingOffer(sub, durationId, isDiscountOffer);
  const actualSku = sub?.productId || sub?.id || targetSku;
  const offersList =
    sub.subscriptionOfferDetailsAndroid ||
    sub.subscriptionOffers ||
    sub.subscriptionOfferDetails ||
    [];
  const offerToken = matchedOffer?.offerToken || (offersList[0]?.offerToken);

  console.log(
    '[IAP] Requesting subscription for SKU:',
    actualSku,
    'Duration:',
    durationId,
    'BasePlan:',
    matchedOffer?.basePlanId,
    'OfferToken:',
    offerToken ? 'Present' : 'None'
  );

  if (!offerToken && Platform.OS === 'android') {
    throw new Error(
      `Could not retrieve Google Play offerToken for "${actualSku}" (${durationId}).\n` +
      `Available base plans: ${offersList.map((o) => o?.basePlanId).filter(Boolean).join(', ') || 'none'}.\n` +
      `Please ensure base plans are active in Google Play Console.`
    );
  }

  if (typeof iap.requestPurchase === 'function') {
    // react-native-iap v14 API
    if (Platform.OS === 'android') {
      const subscriptionOffers = [{ sku: actualSku, offerToken }];
      return await iap.requestPurchase({
        type: 'subs',
        request: {
          google: {
            skus: [actualSku],
            subscriptionOffers,
          },
        },
      });
    } else {
      return await iap.requestPurchase({
        type: 'subs',
        request: {
          apple: {
            sku: actualSku,
          },
        },
      });
    }
  } else if (typeof iap.requestSubscription === 'function') {
    // Legacy react-native-iap v12/13 API
    if (Platform.OS === 'android') {
      const subscriptionOffers = [{ sku: actualSku, offerToken }];
      return await iap.requestSubscription({
        sku: actualSku,
        subscriptionOffers,
      });
    } else {
      return await iap.requestSubscription({ sku: actualSku });
    }
  } else {
    throw new Error('In-app purchase request method not available on this platform.');
  }
};

/**
 * Request one-time product purchase flow (e.g. Superlike packs)
 */
export const requestProductPurchase = async (sku) => {
  const iap = getIAP();
  if (!iap) {
    throw new Error(
      'Google Play Billing is not supported inside Expo Go because native TurboModules (Nitro) cannot run in the Expo Go sandbox.\n\nTo test Google Play Billing on Android, run:\n  npx expo run:android\nor install the standalone release APK.'
    );
  }

  try {
    if (!isIapInitialized) await initializeIAP();

    // Query available products first to ensure SKU exists and avoid native Android crash
    const products = await getAvailableProducts([sku]);
    const product = products.find((p) => (p?.id || p?.productId) === sku);

    if (!product && Platform.OS === 'android') {
      throw new Error(
        `One-time product "${sku}" was not found in Google Play Store.\n\n` +
        `Available in store: ${products.map((p) => p?.id || p?.productId).join(', ') || 'none'}.\n\n` +
        `To enable Superlikes purchases via Google Play Billing:\n` +
        `1. Open Google Play Console > HeartLink > Monetize with Play > Products > One-time products.\n` +
        `2. Click "Create product" and set Product ID to "${sku}".\n` +
        `3. Set the price and click "Activate".`
      );
    }

    if (typeof iap.requestPurchase === 'function') {
      if (Platform.OS === 'android') {
        return await iap.requestPurchase({
          type: 'in-app',
          request: {
            google: {
              skus: [sku],
            },
          },
        });
      } else {
        return await iap.requestPurchase({
          type: 'in-app',
          request: {
            apple: {
              sku,
            },
          },
        });
      }
    } else {
      throw new Error('In-app purchase request method not available.');
    }
  } catch (err) {
    console.error('[IAP] Product purchase error:', err);
    throw err;
  }
};

/**
 * Finish transaction to acknowledge purchase with Google Play
 */
export const finishPurchaseTransaction = async (purchase, isConsumable = false) => {
  const iap = getIAP();
  if (!iap || typeof iap.finishTransaction !== 'function' || !purchase) return;

  try {
    await iap.finishTransaction({ purchase, isConsumable });
    console.log('[IAP] Transaction finished successfully:', purchase?.transactionId || purchase?.orderId);
  } catch (err) {
    console.warn('[IAP] Error finishing transaction:', err?.message || err);
  }
};

/**
 * Disconnect IAP when app closes
 */
export const endIAPConnection = async () => {
  const iap = getIAP();
  if (!iap || typeof iap.endConnection !== 'function') return;

  try {
    await iap.endConnection();
    isIapInitialized = false;
  } catch (err) {
    console.warn('[IAP] Error closing connection:', err);
  }
};
