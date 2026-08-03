// src/utils/eventEmitter.js — Simple In-App Pub/Sub Event System
class EventEmitter {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.warn(`Error in event listener for ${event}:`, err);
      }
    });
  }
}

export const eventEmitter = new EventEmitter();

export const EVENTS = {
  CHAT_UPDATED: 'CHAT_UPDATED',
  REQUEST_UPDATED: 'REQUEST_UPDATED',
  NOTIFICATION_RECEIVED: 'NOTIFICATION_RECEIVED',
  MESSAGE_SENT: 'MESSAGE_SENT',
  REQUEST_SENT: 'REQUEST_SENT',
};
