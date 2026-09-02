// src/utils/supportAutoReply.js — HeartLink Customer Support Auto-Reply Engine
import { findAnswerForQuestion } from './supportTopics';

/**
 * Generate a personalized auto-reply for HeartLink Support messages.
 * Addresses the user by their preferred first name.
 *
 * @param {Object} user - Logged in user profile object
 * @param {string} incomingMessage - The message text sent by user
 * @returns {string} The personalized auto-reply text
 */
export const generateSupportAutoReply = (user, incomingMessage = '') => {
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

  // Case 2: Standard Greetings
  if (matchesGreeting(lower)) {
    return `Hello ${firstName}! 👋 Welcome to HeartLink Customer Support.\n\nHow can we help you today? Please tap any of the categorized topics above for instant answers:\n• 🛡️ Aadhaar Profile Verification & Blue Shield\n• 💎 Plus & Premium Benefits\n• 💳 Billing & Razorpay Reconciliation\n• ✨ Matching Tips & Profile Boost\n• 🚨 Safety & Reporting Fake Users\n\nOr if you need human assistance, tap "Talk to our Live Expert" below!`;
  }

  // Case 3: Gratitude
  if (matchesGratitude(lower)) {
    return `You're very welcome, ${firstName}! ❤️ We're always here to support your journey on HeartLink. Let us know if there's anything else you need. Happy connecting!`;
  }

  // Case 4: Knowledge base lookup for all other questions
  return findAnswerForQuestion(user, raw);
};

const matchesGreeting = (text) => {
  const greetings = ['hi', 'hello', 'hey', 'heyy', 'heya', 'good morning', 'good afternoon', 'good evening', 'namaste', 'hola', 'sup', 'yo', 'anyone there', 'help'];
  return greetings.some(g => text === g || new RegExp(`\\b${g}\\b`, 'i').test(text));
};

const matchesGratitude = (text) => {
  const keywords = ['thank', 'thanks', 'thank you', 'thx', 'appreciate', 'great', 'awesome'];
  return keywords.some(k => text.includes(k));
};

export default generateSupportAutoReply;
