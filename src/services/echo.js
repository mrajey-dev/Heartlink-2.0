// src/services/echo.js — Global Real-time Echo WebSocket Client
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveServerBaseUrl } from './api';

const EchoClass = typeof Echo === 'function' ? Echo : (Echo?.default || Echo?.Echo || Echo);
const PusherClass = typeof Pusher === 'function' ? Pusher : (Pusher?.default || Pusher?.Pusher || Pusher);

// Ensure global Pusher binding
if (typeof global !== 'undefined') {
  global.Pusher = PusherClass;
}
if (typeof window !== 'undefined') {
  window.Pusher = PusherClass;
}

let echoInstance = null;

/**
 * Get or initialize the Echo WebSocket instance configured for Reverb.
 */
export const getEcho = async () => {
  if (echoInstance) return echoInstance;

  try {
    const token = await AsyncStorage.getItem('auth_token');
    const baseUrl = getActiveServerBaseUrl();

    let host = 'localhost';
    try {
      const urlObj = new URL(baseUrl);
      host = urlObj.hostname;
    } catch (e) {
      if (baseUrl.includes('://')) {
        host = baseUrl.split('://')[1].split(':')[0].split('/')[0];
      }
    }

    console.log(`[Echo] Initializing Reverb Pusher client at ws://${host}:8080...`);

    const pusherClient = new PusherClass('jch4gux1rk1kag59rwbm', {
      wsHost: host,
      wsPort: 8080,
      wssPort: 8080,
      forceTLS: false,
      enabledTransports: ['ws', 'wss'],
      cluster: 'mt1',
      authorizer: (channel) => {
        return {
          authorize: (socketId, callback) => {
            fetch(`${baseUrl}/api/broadcasting/auth`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : '',
                'Accept': 'application/json',
              },
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name,
              }),
            })
              .then(async (res) => {
                if (res.ok) {
                  const data = await res.json();
                  callback(null, data);
                } else {
                  const errText = await res.text();
                  callback(new Error(`Auth failed (${res.status}): ${errText}`));
                }
              })
              .catch((err) => callback(err));
          },
        };
      },
    });

    echoInstance = new EchoClass({
      broadcaster: 'reverb',
      key: 'jch4gux1rk1kag59rwbm',
      client: pusherClient,
      Pusher: PusherClass,
    });

    console.log('[Echo] Reverb WebSocket client ready.');
    return echoInstance;
  } catch (err) {
    console.warn('[Echo] Initialization error:', err?.message || err);
    return null;
  }
};

/**
 * Disconnect Echo WebSocket session (e.g. on logout)
 */
export const disconnectEcho = () => {
  if (echoInstance) {
    try {
      echoInstance.disconnect();
    } catch (e) {}
    echoInstance = null;
  }
};
