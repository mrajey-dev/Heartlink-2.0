// src/utils/supportTopics.js — HeartLink Helpdesk Categorized Questions & Knowledge Base

export const SUPPORT_CATEGORIES = [
  { id: 'all', label: 'All Topics', icon: 'grid-outline' },
  { id: 'verify', label: 'Aadhaar & KYC', icon: 'shield-checkmark' },
  { id: 'plans', label: 'Plans & Premium', icon: 'diamond' },
  { id: 'billing', label: 'Billing & Refund', icon: 'card' },
  { id: 'matches', label: 'Matches & Swipes', icon: 'sparkles' },
  { id: 'profile', label: 'Profile & Photos', icon: 'person-circle-outline' },
  { id: 'safety', label: 'Safety & Report', icon: 'alert-circle' },
  { id: 'date', label: 'Date Planner', icon: 'restaurant-outline' },
  { id: 'account', label: 'Account & Privacy', icon: 'settings-outline' },
];

export const SUPPORT_QUESTIONS = [
  // ──────────────────────────────────────────────────────────
  // 1. AADHAAR & VERIFICATION (Top Priority)
  // ──────────────────────────────────────────────────────────
  {
    id: 'verify-1',
    categoryId: 'verify',
    icon: 'shield-checkmark',
    label: 'Complete Aadhaar Verification',
    question: 'How do I complete Aadhaar verification to get the Blue Shield badge?',
    getAnswer: (name) =>
      `Hi ${name}! 🛡️ Here is the step-by-step guide to complete Aadhaar verification:\n\n1. Open your Profile tab and tap "Verify Profile" (or go to Settings > Aadhaar Verification).\n2. Enter your 12-digit Aadhaar number.\n3. You will receive a one-time password (OTP) on the mobile number linked to your Aadhaar.\n4. Enter the OTP to complete instant verification.\n\nOnce verified, an official Blue Shield badge will be displayed on your profile, boosting your credibility and giving you up to 3x more matches!`,
  },
  {
    id: 'verify-2',
    categoryId: 'verify',
    icon: 'lock-closed',
    label: 'Aadhaar Security & Privacy',
    question: 'Is my Aadhaar number and OTP secure and private on Heart Link?',
    getAnswer: (name) =>
      `Hi ${name}! 🔒 Yes, your security is 100% guaranteed:\n\n• UIDAI Compliant: We verify using bank-grade 256-bit SSL encryption.\n• No Aadhaar Stored: Heart Link NEVER stores your raw 12-digit Aadhaar number on our servers.\n• Privacy Assured: Other users will never see your Aadhaar details — they only see your verified Blue Shield badge.\n• OTP Security: Your OTP is verified directly and expires in 10 minutes.`,
  },
  {
    id: 'verify-3',
    categoryId: 'verify',
    icon: 'alert-circle',
    label: 'Aadhaar OTP Not Arriving',
    question: 'Why did my Aadhaar OTP fail or not arrive on my mobile?',
    getAnswer: (name) =>
      `Hi ${name}! 📲 If your Aadhaar OTP did not arrive:\n\n1. Check Linked Mobile: Ensure you are checking the phone number officially linked to your Aadhaar card.\n2. UIDAI Congestion: Government UIDAI servers occasionally experience high traffic. Please wait 60 seconds before tapping "Resend OTP".\n3. SMS Filters: Ensure your phone's SMS spam filter is not blocking messages from government shortcodes.\n4. Retry: If the issue persists, try again after 5-10 minutes from Settings > Aadhaar Verification.`,
  },
  {
    id: 'verify-4',
    categoryId: 'verify',
    icon: 'checkmark-done-circle',
    label: 'Benefits of Blue Shield Badge',
    question: 'What are the exact benefits of getting the verified Blue Shield badge?',
    getAnswer: (name) =>
      `Hi ${name}! 🌟 Verified profiles get huge advantages on Heart Link:\n\n• 3x Higher Match Rate: Genuine profiles with verified badges receive significantly more likes and replies.\n• Priority Discovery: Verified profiles are shown earlier in the Discover feed.\n• Trust & Safety: Other members know you are a real, authentic person, which makes connecting and going on dates much safer and easier!`,
  },

  // ──────────────────────────────────────────────────────────
  // 2. PLANS & PREMIUM SUBSCRIPTIONS
  // ──────────────────────────────────────────────────────────
  {
    id: 'plans-1',
    categoryId: 'plans',
    icon: 'diamond',
    label: 'Plus vs Premium Benefits',
    question: 'What benefits do I get with Heart Link Plus and Premium subscriptions?',
    getAnswer: (name) =>
      `Hi ${name}! 💎 Here is a quick comparison of our plans:\n\n• Heart Link Plus:\n  - Unlimited Swipes & Likes (no daily limits)\n  - Rewind accidental left swipes anytime\n  - 5 Free SuperLikes every week\n  - Ad-free browsing\n\n• Heart Link Premium:\n  - Everything in Plus\n  - See who liked your profile before matching\n  - Unlimited direct messaging with matches\n  - 1 Free Profile Boost per month for 10x visibility\n\nVisit Settings > Subscription Plans to choose your plan!`,
  },
  {
    id: 'plans-2',
    categoryId: 'plans',
    icon: 'arrow-up-circle',
    label: 'How to Upgrade Plan',
    question: 'How do I upgrade to a premium subscription plan?',
    getAnswer: (name) =>
      `Hi ${name}! 🚀 To upgrade your account:\n\n1. Open your Profile or Settings tab.\n2. Tap on "Subscription Plans" or "Upgrade to Premium".\n3. Choose your duration: 1 Week, 1 Month, 3 Months, or 6 Months (save up to 50% on longer plans!).\n4. Complete the secure checkout via Razorpay (UPI, GPay, PhonePe, Cards, NetBanking).\n5. Your premium features activate immediately!`,
  },
  {
    id: 'plans-3',
    categoryId: 'plans',
    icon: 'refresh-circle',
    label: 'Auto-Renewal & Cancellation',
    question: 'How do I cancel my subscription or disable auto-renewal?',
    getAnswer: (name) =>
      `Hi ${name}, you have full control over your billing:\n\n• One-Time Purchases: Most Heart Link plans are one-time passes that do NOT auto-debit your account without permission.\n• If Auto-Renew is active: Go to Settings > Subscription Plans > Manage Subscription > Cancel Auto-Renewal.\n• You will continue to enjoy your full premium benefits until the end of your billing cycle.`,
  },

  // ──────────────────────────────────────────────────────────
  // 3. BILLING & PAYMENTS
  // ──────────────────────────────────────────────────────────
  {
    id: 'billing-1',
    categoryId: 'billing',
    icon: 'card',
    label: 'Payment Deducted But Plan Inactive',
    question: 'My payment was deducted from bank, but my subscription is not active yet.',
    getAnswer: (name) =>
      `Hi ${name}! 💳 If your money was deducted but the plan has not appeared:\n\n1. Banking Settlement: Razorpay and bank payment gateways take 5-15 minutes to reconcile UPI/card transactions.\n2. Refresh the App: Close Heart Link completely and reopen it; then check Settings > Subscription Plans.\n3. Live Resolution: If it still hasn't updated after 15 minutes, tap "Talk to our Live Expert" below and share your Razorpay Payment ID or transaction screenshot — our team will activate it right away!`,
  },
  {
    id: 'billing-2',
    categoryId: 'billing',
    icon: 'wallet-outline',
    label: 'Accepted Payment Methods',
    question: 'What payment methods are supported on Heart Link?',
    getAnswer: (name) =>
      `Hi ${name}! 💰 We accept all major Indian and international payment options via Razorpay:\n\n• UPI: Google Pay, PhonePe, Paytm, BHIM, CRED\n• Debit & Credit Cards: Visa, Mastercard, RuPay, Diners Club\n• NetBanking: 50+ Indian banks supported\n• Wallets: Paytm, Mobikwik, Freecharge\n\nAll transactions are secured with 256-bit encryption.`,
  },
  {
    id: 'billing-3',
    categoryId: 'billing',
    icon: 'receipt-outline',
    label: 'Refund Policy',
    question: 'How do I request a refund for a payment or accidental purchase?',
    getAnswer: (name) =>
      `Hi ${name}! 📄 For refund requests:\n\n• Accidental double-charges or failed transactions where the plan was not delivered are eligible for a 100% immediate refund.\n• Once initiated, refunds take 3 to 5 business days to credit back to your original payment source (UPI/bank).\n• To submit a refund inquiry, please connect with our live expert below with your payment details.`,
  },

  // ──────────────────────────────────────────────────────────
  // 4. MATCHES & SWIPING
  // ──────────────────────────────────────────────────────────
  {
    id: 'matches-1',
    categoryId: 'matches',
    icon: 'sparkles',
    label: 'How Matching Works',
    question: 'How does matching work and how do I connect with someone?',
    getAnswer: (name) =>
      `Hi ${name}! 💫 Matching is simple and fun:\n\n1. Swipe Right (or tap the Heart icon) if you like someone.\n2. Swipe Left (or tap Cross) to pass.\n3. Tap SuperLike (Star icon) to let them know instantly that you are interested!\n4. When two users both swipe right on each other, it's a Match! You can now chat, send date invites, and connect.`,
  },
  {
    id: 'matches-2',
    categoryId: 'matches',
    icon: 'flame',
    label: 'Tips to Get More Matches',
    question: 'Why am I not getting matches and how can I boost my visibility?',
    getAnswer: (name) =>
      `Hi ${name}! ✨ Here are the top 4 ways to get more matches:\n\n1. Add 4+ Quality Photos: Include at least one smiling portrait and one showing your hobbies/lifestyle.\n2. Complete Aadhaar Verification: Profiles with the Blue Shield badge receive 3x more likes.\n3. Fill Out Your Vibe & Bio: Mention your passions, favorite weekend plans, and what you're looking for.\n4. Stay Active: Regularly swiping and responding promptly keeps your profile boosted in the algorithm!`,
  },
  {
    id: 'matches-3',
    categoryId: 'matches',
    icon: 'arrow-undo',
    label: 'Rewind Accidental Swipe',
    question: 'How do I rewind or undo an accidental swipe on Discover?',
    getAnswer: (name) =>
      `Hi ${name}! ⏪ Made an accidental swipe? No worries!\n\n• Tap the yellow Rewind button located on the Discover swiping controls to bring back the last passed profile.\n• Rewinds are an exclusive feature of Heart Link Plus and Premium subscriptions. Upgrade anytime to enjoy unlimited rewinds!`,
  },
  {
    id: 'matches-4',
    categoryId: 'matches',
    icon: 'star',
    label: 'What is SuperLike?',
    question: 'What does a SuperLike do and how do I get more of them?',
    getAnswer: (name) =>
      `Hi ${name}! ⭐ A SuperLike makes your profile stand out with a bright blue border and sends an immediate notification to the other person, letting them know they caught your eye before they even swipe!\n\n• Premium members receive 5 free SuperLikes every week.\n• You can also purchase additional SuperLike bundles anytime from the shop or when swiping!`,
  },

  // ──────────────────────────────────────────────────────────
  // 5. PROFILE, PHOTOS & VIBES
  // ──────────────────────────────────────────────────────────
  {
    id: 'profile-1',
    categoryId: 'profile',
    icon: 'images',
    label: 'Change Profile Photos',
    question: 'How do I add, rearrange, or delete photos on my profile?',
    getAnswer: (name) =>
      `Hi ${name}! 📸 To manage your photos:\n\n1. Go to your Profile tab.\n2. Tap the "Edit Profile" button.\n3. Tap any '+' slot to upload a photo from your gallery or take a new one with your camera.\n4. Tap the trash/cross icon on any photo to remove it.\n5. The first photo is your primary photo shown on Discover. Make sure your face is clearly visible!`,
  },
  {
    id: 'profile-2',
    categoryId: 'profile',
    icon: 'heart-circle',
    label: 'What are Vibes & Tags?',
    question: 'What are Vibes and how do they help me find compatible dates?',
    getAnswer: (name) =>
      `Hi ${name}! 🎵 Vibes are community clubs on Heart Link (like Cafe Hop, Foodie Club, Cinephile, Tech & Dev, Late Night Beats, Gamer Zone).\n\n• Selecting your Vibe helps our algorithm match you with people who share your exact weekend hobbies and lifestyle.\n• You can browse matches by specific Vibes on the Discover feed!`,
  },
  {
    id: 'profile-3',
    categoryId: 'profile',
    icon: 'create-outline',
    label: 'Edit Bio & Interests',
    question: 'How do I update my Bio, Job, City, and Interests?',
    getAnswer: (name) =>
      `Hi ${name}! 📝 To edit your details:\n\n1. Open Profile > Edit Profile.\n2. Update your bio, occupation, education, drinking/smoking habits, and relationship goals.\n3. Select up to 10 interests (Music, Travel, Yoga, Coding, etc.).\n4. Tap "Save Changes" at the top right to apply immediately!`,
  },

  // ──────────────────────────────────────────────────────────
  // 6. SAFETY, REPORTING & PRIVACY
  // ──────────────────────────────────────────────────────────
  {
    id: 'safety-1',
    categoryId: 'safety',
    icon: 'alert-circle',
    label: 'Report a Fake or Abusive User',
    question: 'How do I report a suspicious, fake, or harassing profile?',
    getAnswer: (name) =>
      `Hi ${name}! 🚨 Your safety is our #1 priority. If you encounter any suspicious or abusive user:\n\n1. Open their profile or chat screen.\n2. Tap the three dots menu (⋯) in the top right corner.\n3. Select "Report User" and choose the reason (Fake Profile, Harassment, Inappropriate Photos, Scam).\n4. Our 24/7 moderation team reviews reports within minutes and takes strict actions, including permanent device-level bans!`,
  },
  {
    id: 'safety-2',
    categoryId: 'safety',
    icon: 'ban',
    label: 'Block a User',
    question: 'How do I block someone so they cannot contact or see me again?',
    getAnswer: (name) =>
      `Hi ${name}! 🚫 To block a user:\n\n1. Tap the three dots (⋯) in their chat or profile.\n2. Tap "Block User" and confirm.\n3. They will be immediately unmatched, hidden from your chats, and will NEVER see your profile on Discover again. Blocked users are not notified that you blocked them.`,
  },
  {
    id: 'safety-3',
    categoryId: 'safety',
    icon: 'camera-outline',
    label: 'Screenshot Protection Policy',
    question: 'Are screenshots allowed in private chats on Heart Link?',
    getAnswer: (name) =>
      `Hi ${name}! 🛡️ We prioritize member privacy:\n\n• For regular member-to-member chats, screenshot capture is restricted to protect your personal media and conversations.\n• In this official Customer Support chat, screenshots ARE allowed so you can easily send payment receipts, bug photos, or report violations to our team!`,
  },

  // ──────────────────────────────────────────────────────────
  // 7. DATE PLANNER & RESTAURANTS
  // ──────────────────────────────────────────────────────────
  {
    id: 'date-1',
    categoryId: 'date',
    icon: 'restaurant',
    label: 'How Date Planner Works',
    question: 'How does the Date Planner restaurant booking and invite work?',
    getAnswer: (name) =>
      `Hi ${name}! ☕ The Date Planner takes your connection from online to real life effortlessly:\n\n1. Open a chat with your match.\n2. Tap the Date Planner / Restaurant icon.\n3. Browse curated romantic bistros, rooftop lounges, and cozy cafes nearby.\n4. Select a venue, pick a date & time, and send a Date Proposal.\n5. Your match gets an invitation card they can Accept with a single tap!`,
  },
  {
    id: 'date-2',
    categoryId: 'date',
    icon: 'pricetag-outline',
    label: 'Partner Cafe Discounts',
    question: 'Do we get discounts at Heart Link partner cafes and restaurants?',
    getAnswer: (name) =>
      `Hi ${name}! 🍽️ Yes! Heart Link has exclusive partnerships with top dining spots across major cities.\n\n• When you book a date through our Date Planner, you get exclusive partner discounts (10% to 25% off your bill) and priority romantic seating!`,
  },

  // ──────────────────────────────────────────────────────────
  // 8. ACCOUNT & PRIVACY SETTINGS
  // ──────────────────────────────────────────────────────────
  {
    id: 'account-1',
    categoryId: 'account',
    icon: 'pause-circle-outline',
    label: 'Pause / Hide My Profile',
    question: 'How do I take a break and hide my profile from Discover?',
    getAnswer: (name) =>
      `Hi ${name}! 🏖️ Need some time off? You can hide your profile without losing your current matches:\n\n1. Go to Profile > Settings.\n2. Toggle "Show Me on Heart Link" OFF.\n3. Your profile will no longer be shown to new people on Discover, but you can continue chatting with existing matches anytime!`,
  },
  {
    id: 'account-2',
    categoryId: 'account',
    icon: 'trash-outline',
    label: 'Delete My Account',
    question: 'How do I permanently delete my Heart Link account?',
    getAnswer: (name) =>
      `Hi ${name}, you can permanently delete your account at any time:\n\n1. Go to Profile > Settings.\n2. Scroll to the very bottom and tap "Delete Account".\n3. Confirm your choice.\n\n⚠️ Please note: Deleting your account is permanent. All your matches, messages, photos, and subscription benefits will be wiped and cannot be recovered.`,
  },
];

/**
 * Match an incoming question query or text against knowledge base.
 */
export const findAnswerForQuestion = (user, queryText = '') => {
  const rawName = (user?.display_name || user?.name || '').trim();
  let firstName = 'there';
  if (rawName) {
    const parts = rawName.split(/\s+/);
    if (parts[0]) {
      firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
  }

  const clean = String(queryText || '').toLowerCase().trim();

  // Try direct match from questions list
  for (const q of SUPPORT_QUESTIONS) {
    if (clean === q.question.toLowerCase().trim() || clean.includes(q.label.toLowerCase().trim())) {
      return q.getAnswer(firstName);
    }
  }

  // Check category keywords
  if (clean.includes('aadhaar') || clean.includes('aadhar') || clean.includes('verify') || clean.includes('blue shield') || clean.includes('kyc') || clean.includes('otp')) {
    return SUPPORT_QUESTIONS[0].getAnswer(firstName);
  }
  if (clean.includes('plus') || clean.includes('premium') || clean.includes('benefit') || clean.includes('plan')) {
    return SUPPORT_QUESTIONS[4].getAnswer(firstName);
  }
  if (clean.includes('billing') || clean.includes('payment') || clean.includes('deducted') || clean.includes('money') || clean.includes('razorpay')) {
    return SUPPORT_QUESTIONS[7].getAnswer(firstName);
  }
  if (clean.includes('match') || clean.includes('swipe') || clean.includes('like') || clean.includes('boost')) {
    return SUPPORT_QUESTIONS[10].getAnswer(firstName);
  }
  if (clean.includes('photo') || clean.includes('picture') || clean.includes('image') || clean.includes('vibe')) {
    return SUPPORT_QUESTIONS[14].getAnswer(firstName);
  }
  if (clean.includes('report') || clean.includes('fake') || clean.includes('block') || clean.includes('scam') || clean.includes('safety')) {
    return SUPPORT_QUESTIONS[17].getAnswer(firstName);
  }
  if (clean.includes('date') || clean.includes('restaurant') || clean.includes('cafe')) {
    return SUPPORT_QUESTIONS[20].getAnswer(firstName);
  }
  if (clean.includes('delete') || clean.includes('pause') || clean.includes('deactivate')) {
    return SUPPORT_QUESTIONS[22].getAnswer(firstName);
  }

  // Fallback
  return `Hello ${firstName}! 👋 Thank you for messaging Heart Link Support.\n\nWe have received your query: "${clean.slice(0, 60)}". You can tap any of the categorized topics above for instant answers, or tap "Talk to our Live Expert" below to connect directly with a support specialist!`;
};
