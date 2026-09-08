// src/services/activeChatManager.js — Active Chat State & Notification Deduplication Manager

let currentActiveChatUserId = null;
const listeners = new Set();

/**
 * Set the currently active chat recipient ID (when user enters a chat).
 * Pass null or undefined when leaving the chat screen.
 */
export const setActiveChatUserId = (userId) => {
  const normalized = userId !== null && userId !== undefined ? String(userId).trim() : null;
  currentActiveChatUserId = normalized;
  listeners.forEach((fn) => {
    try {
      fn(normalized);
    } catch (_) {}
  });
};

/**
 * Get the currently active chat recipient ID.
 */
export const getActiveChatUserId = () => {
  return currentActiveChatUserId;
};

/**
 * Check if a given user ID corresponds to the user currently being chatted with.
 */
export const isUserInActiveChat = (userId) => {
  if (!currentActiveChatUserId || userId === null || userId === undefined) {
    return false;
  }
  const target = String(userId).trim();
  if (currentActiveChatUserId === '16' || currentActiveChatUserId === 'support') {
    return target === '16' || target === 'support';
  }
  return currentActiveChatUserId === target;
};

/**
 * Subscribe to active chat user changes.
 */
export const subscribeActiveChatUser = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// ---------------------------------------------------------------------------
// Notification Deduplication Sliding Window Tracker
// ---------------------------------------------------------------------------
const recentNotifications = new Map();
const DEDUP_WINDOW_MS = 6000; // 6 seconds window

/**
 * Generates a consistent deduplication key from notification data.
 */
export function getNotificationUniqueKey({ title = '', body = '', data = {} }) {
  const notifId = data?.notification_id || data?.id || data?.notifId || '';
  const senderId =
    data?.userId ||
    data?.params?.userId ||
    data?.user?.id ||
    data?.params?.user?.id ||
    data?.from_user_id ||
    data?.fromUserId ||
    '';
  const type = data?.type || data?.screen || '';
  const cleanBody = (body || '').trim().slice(0, 80);
  const cleanTitle = (title || '').trim().slice(0, 50);

  if (notifId) {
    return `notif_${notifId}`;
  }
  if (senderId && cleanBody) {
    return `${type}_${senderId}_${cleanBody}`;
  }
  if (cleanTitle && cleanBody) {
    return `${type}_${cleanTitle}_${cleanBody}`;
  }
  return `${type}_${cleanTitle}_${Date.now()}`;
}

/**
 * Checks whether a notification with this key was already shown within the deduplication window.
 */
export function hasRecentlyShownNotification(key) {
  if (!key) return false;
  const now = Date.now();
  // Evict expired entries
  for (const [k, timestamp] of recentNotifications.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      recentNotifications.delete(k);
    }
  }
  const lastTime = recentNotifications.get(key);
  if (lastTime && now - lastTime < DEDUP_WINDOW_MS) {
    return true;
  }
  return false;
}

/**
 * Marks a notification key as shown to prevent duplicate firing.
 */
export function markNotificationShown(key) {
  if (!key) return;
  recentNotifications.set(key, Date.now());
}
