// src/utils/supportAutoReply.js — HeartLink Customer Support Auto-Reply Engine

/**
 * Generate a personalized auto-reply for HeartLink Support messages.
 * Addresses the user by their preferred first name.
 *
 * @param {Object} user - Logged in user profile object
 * @param {string} incomingMessage - The message text sent by user
 * @returns {string} The personalized auto-reply text
 */
export const generateSupportAutoReply = (user, incomingMessage = '') => {
  // Extract target user's preferred first name
  const rawName = (user?.display_name || user?.name || '').trim();
  let firstName = 'there';
  if (rawName) {
    const parts = rawName.split(/\s+/);
    if (parts[0]) {
      firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  }

  const raw = String(incomingMessage || '').trim();
  const cleanText = raw.replace(/\[image\].*?\[\/image\]/gis, '').trim();
  const lower = cleanText.toLowerCase();

  const hasImage = /\[image\].*?\[\/image\]/i.test(raw) ||
                   /^https?:\/\/.*\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(raw);

  // Case 1: Image only message (screenshot/photo submitted)
  if (hasImage && !cleanText) {
    return `Thank you for sharing the attachment, ${firstName}! 📸\n\nOur customer support and safety team has received your screenshot and is reviewing it. If this is regarding a payment issue, profile verification, or a safety report, we will update you right here within a few moments.`;
  }

  // Case 2: Greetings
  if (matchesGreeting(lower)) {
    return `Hello ${firstName}! 👋 Welcome to HeartLink Customer Support.\n\nHow can we help you today? Feel free to ask about:\n• Profile & Aadhaar Verification 🛡️\n• Subscription Plans & Premium Features 💎\n• Safety, Reporting & Privacy 🚨\n• Matching Tips & Profile Visibility ✨\n• Billing & Payment Inquiries 💳\n\nOr simply type your question or send a screenshot!`;
  }

  // Case 3: Aadhaar / Profile Verification / Blue Shield Badge
  if (matchesVerification(lower)) {
    return `Hi ${firstName}! 🛡️ Here is how to complete Aadhaar profile verification:\n\n1. Go to your Profile tab and tap 'Verify Profile' (or Settings > Aadhaar Verification).\n2. Enter your 12-digit Aadhaar number to receive a secure OTP.\n3. Enter the OTP to complete instant verification.\n\nOnce verified, you'll earn the exclusive Blue Shield badge, and your profile will get 3x higher visibility and trust with potential matches!`;
  }

  // Case 4: Billing / Payments / Refund / Razorpay
  if (matchesBilling(lower)) {
    return `Hi ${firstName}! 💳 For billing and payment support:\n\n• If your payment was deducted but your subscription has not reflected yet, it usually reconciles automatically within 10 to 15 minutes.\n• If it still doesn't appear, please share your Razorpay Payment ID or upload a screenshot of your bank transaction receipt in this chat.\n\nOur finance team will verify and activate your plan immediately!`;
  }

  // Case 5: Subscription Plans / Premium / Plus / Benefits
  if (matchesPlans(lower)) {
    return `Hi ${firstName}! 💎 Here are the benefits of HeartLink subscription plans:\n\n• HeartLink Plus: Unlimited likes & swipes, rewind accidental passes, and 5 SuperLikes per week.\n• HeartLink Premium: Everything in Plus + see who liked your profile, priority match boost, and unlimited messaging with all matches!\n\nTo view active discounts and activate your plan, head over to Profile > Settings > Subscription Plans.`;
  }

  // Case 6: Safety / Report User / Block / Fake Accounts
  if (matchesSafety(lower)) {
    return `Hi ${firstName}! 🚨 Your safety and security are our highest priority.\n\nIf you encountered inappropriate behavior or a suspicious profile:\n1. Open their chat or profile screen.\n2. Tap the three dots (⋯) at the top right.\n3. Select 'Report User' or 'Block User'.\n\nOur 24/7 moderation team reviews flagged accounts promptly and enforces permanent bans on violators. If you have screenshots, feel free to send them here.`;
  }

  // Case 7: Matching Tips / Profile Visibility / Likes
  if (matchesMatching(lower)) {
    return `Hi ${firstName}! ✨ Looking to get more matches? Here are our top tips:\n\n1. Add 3 to 5 clear, high-quality photos (at least one smiling portrait!).\n2. Complete your Bio, Vibe, and Lifestyle tags so people can connect over shared interests.\n3. Complete Aadhaar verification for the Blue Shield badge (verified profiles get 3x more matches!).\n4. Send engaging opening messages based on their profile prompts!`;
  }

  // Case 8: Account Deletion / Deactivation / Settings
  if (matchesAccount(lower)) {
    return `Hi ${firstName}, you can manage your account anytime:\n\n• To take a temporary break: Go to Settings > Privacy & Account to hide your profile from Discover.\n• To delete permanently: Tap 'Delete Account' at the bottom of the Settings screen.\n\nIf there is any issue or feedback you'd like to share before making a decision, please let us know — we're here to help!`;
  }

  // Case 9: Thank You / Gratitude
  if (matchesGratitude(lower)) {
    return `You're very welcome, ${firstName}! ❤️ We're always here to support your journey on HeartLink. Let us know if there's anything else you need. Happy connecting!`;
  }

  // Case 10: General fallback / acknowledging custom query
  const snippet = cleanText.length > 60 ? cleanText.slice(0, 57) + '...' : cleanText;
  return `Hello ${firstName}! 👋 Thank you for messaging HeartLink Support.\n\nWe have received your query: "${snippet}". Our dedicated support team is reviewing your message and will get back to you shortly.\n\nIf you have any supporting screenshots or documents, feel free to attach them in this chat!`;
};

const matchesGreeting = (text) => {
  const greetings = ['hi', 'hello', 'hey', 'heyy', 'heya', 'good morning', 'good afternoon', 'good evening', 'namaste', 'hola', 'sup', 'yo', 'anyone there', 'help'];
  return greetings.some(g => text === g || new RegExp(`\\b${g}\\b`, 'i').test(text));
};

const matchesVerification = (text) => {
  const keywords = ['verify', 'verification', 'aadhaar', 'aadhar', 'badge', 'blue tick', 'blue shield', 'shield', 'kyc', 'otp'];
  return keywords.some(k => text.includes(k));
};

const matchesBilling = (text) => {
  const keywords = ['billing', 'payment', 'paid', 'refund', 'deducted', 'money', 'receipt', 'transaction', 'charged', 'failed', 'razorpay'];
  return keywords.some(k => text.includes(k));
};

const matchesPlans = (text) => {
  const keywords = ['plan', 'plans', 'premium', 'plus', 'subscription', 'upgrade', 'pricing', 'price', 'cost', 'membership', 'benefits'];
  return keywords.some(k => text.includes(k));
};

const matchesSafety = (text) => {
  const keywords = ['safety', 'report', 'fake', 'scam', 'fraud', 'block', 'harass', 'abuse', 'spam', 'inappropriate', 'threat'];
  return keywords.some(k => text.includes(k));
};

const matchesMatching = (text) => {
  const keywords = ['match', 'matches', 'no matches', 'more matches', 'swipe', 'likes', 'boost', 'visibility', 'algorithm', 'tips'];
  return keywords.some(k => text.includes(k));
};

const matchesAccount = (text) => {
  const keywords = ['delete account', 'delete my account', 'delete profile', 'deactivate', 'logout', 'close account'];
  return keywords.some(k => text.includes(k));
};

const matchesGratitude = (text) => {
  const keywords = ['thank', 'thanks', 'thank you', 'thx', 'appreciate', 'great', 'awesome'];
  return keywords.some(k => text.includes(k));
};

export default generateSupportAutoReply;
