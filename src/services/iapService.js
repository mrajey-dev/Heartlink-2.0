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

// Product SKUs for Subscriptions and In-App Items
// Matches the Product IDs configured in Google Play Console
export const SUBSCRIPTION_SKUS = Platform.select({
  android: [
    'heartlink_basic',
    'heartlink_plus',
    'heartlink_premium',
    'heartlink_basic_1m',
    'heartlink_basic_6m',
    'heartlink_basic_12m',
    'heartlink_plus_1m',
    'heartlink_plus_6m',
    'heartlink_plus_12m',
    'heartlink_premium_1m',
    'heartlink_premium_6m',
    'heartlink_premium_12m',
  ],
  ios: [
    'heartlink_basic',
    'heartlink_plus',
    'heartlink_premium',
  ],
  default: [],
});

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
 * Initialize connection to the Google Play Store / App Store
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
 * Listeners for purchases
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
 * Fetch available subscriptions from Google Play Store
 */
export const getAvailableSubscriptions = async (skus = SUBSCRIPTION_SKUS) => {
  const iap = getIAP();
  if (!iap || typeof iap.getSubscriptions !== 'function') return [];

  try {
    if (!isIapInitialized) await initializeIAP();
    const subscriptions = await iap.getSubscriptions({ skus });
    console.log('[IAP] Subscriptions loaded from Play Store:', subscriptions?.length);
    return subscriptions || [];
  } catch (err) {
    console.warn('[IAP] Failed to fetch subscriptions:', err?.message || err);
    return [];
  }
};

/**
 * Fetch consumable / one-time products (e.g., Superlike packs)
 */
export const getAvailableProducts = async (skus = IN_APP_SKUS) => {
  const iap = getIAP();
  if (!iap || typeof iap.getProducts !== 'function') return [];

  try {
    if (!isIapInitialized) await initializeIAP();
    const products = await iap.getProducts({ skus });
    console.log('[IAP] Products loaded:', products?.length);
    return products || [];
  } catch (err) {
    console.warn('[IAP] Failed to fetch products:', err?.message || err);
    return [];
  }
};

/**
 * Helper to buy subscription with Google Play Subscriptions v2 support
 */
export const purchaseSubscriptionPlan = async ({ planKey, durationId = '6m', skuOverride = null }) => {
  const iap = getIAP();
  if (!iap || typeof iap.requestSubscription !== 'function') {
    throw new Error('Native in-app billing is not compiled into this build. Please install the latest release APK.');
  }

  if (!isIapInitialized) {
    await initializeIAP();
  }

  const normalizedKey = (planKey || 'basic').toLowerCase().replace('heartlink_', '').trim();
  const targetSku = skuOverride || `heartlink_${normalizedKey}`;

  // Fetch subscriptions from Google Play to obtain valid offerToken
  const subscriptions = await getAvailableSubscriptions();
  console.log('[IAP] Found available subscriptions:', subscriptions?.map(s => s.productId));

  const sub = subscriptions.find(
    (s) => s.productId === targetSku || s.productId === `${targetSku}_${durationId}` || s.productId === normalizedKey
  );

  let offerToken = null;

  if (sub && Array.isArray(sub.subscriptionOfferDetails) && sub.subscriptionOfferDetails.length > 0) {
    // Attempt to match duration ID inside base plan / offer ID
    const matchedOffer = sub.subscriptionOfferDetails.find((offer) => {
      const basePlanId = (offer.basePlanId || '').toLowerCase();
      const offerId = (offer.offerId || '').toLowerCase();
      return (
        basePlanId.includes(durationId.toLowerCase()) ||
        offerId.includes(durationId.toLowerCase()) ||
        (durationId === '12m' && (basePlanId.includes('1y') || basePlanId.includes('year') || basePlanId.includes('12'))) ||
        (durationId === '6m' && (basePlanId.includes('6') || basePlanId.includes('half'))) ||
        (durationId === '1m' && (basePlanId.includes('1m') || basePlanId.includes('month') || basePlanId.includes('1')))
      );
    });

    offerToken = (matchedOffer || sub.subscriptionOfferDetails[0])?.offerToken;
  }

  const actualSku = sub ? sub.productId : targetSku;

  console.log('[IAP] Requesting subscription for SKU:', actualSku, 'OfferToken:', offerToken);

  if (Platform.OS === 'android') {
    const subscriptionOffers = offerToken ? [{ sku: actualSku, offerToken }] : [];
    return await iap.requestSubscription({
      sku: actualSku,
      ...(subscriptionOffers.length > 0 ? { subscriptionOffers } : {}),
    });
  } else {
    return await iap.requestSubscription({ sku: actualSku });
  }
};

/**
 * Request one-time product purchase flow (e.g. Superlike coins)
 */
export const requestProductPurchase = async (sku) => {
  const iap = getIAP();
  if (!iap || typeof iap.requestPurchase !== 'function') {
    throw new Error('Native in-app billing is not compiled into this build. Please install the latest release APK.');
  }

  try {
    if (!isIapInitialized) await initializeIAP();
    return await iap.requestPurchase({ sku });
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
