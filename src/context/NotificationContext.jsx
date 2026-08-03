// src/context/NotificationContext.jsx — Global Real-time In-App Notification & Match Provider
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiGetConversations, apiGetRequests, apiGetNotifications, apiMarkNotificationsRead } from '../services/api';
import { formatImageUrl } from '../utils/helpers';
import { eventEmitter, EVENTS } from '../utils/eventEmitter';
import MatchModal from '../components/MatchModal';
import { navigate } from '../navigation/navigationRef';

const NotificationContext = createContext({
  bannerVisible: false,
  bannerData: null,
  triggerNotification: () => { },
  dismissNotification: () => { },
  checkNotifications: () => { },
});

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerData, setBannerData] = useState(null);

  // Global Match Modal state (for when sender's request gets accepted!)
  const [globalMatchModalVisible, setGlobalMatchModalVisible] = useState(false);
  const [globalMatchedUser, setGlobalMatchedUser] = useState(null);

  // Tracking seen message IDs / notification IDs to avoid duplicate alerts
  const seenNotifIdsRef = useRef(new Set());
  const seenChatMsgRef = useRef({});
  const seenPendingReqRef = useRef(new Set());
  const isInitialFetchRef = useRef(true);
  const isFetchingRef = useRef(false);

  const triggerNotification = useCallback((data) => {
    setBannerData(data);
    setBannerVisible(true);
  }, []);

  const dismissNotification = useCallback(() => {
    setBannerVisible(false);
  }, []);

  // Poll for new incoming messages, match requests, acceptances & notifications
  const checkNotifications = useCallback(async () => {
    if (!isAuthenticated || !user || isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const [chatRes, reqRes, notifRes] = await Promise.all([
        apiGetConversations().catch(() => null),
        apiGetRequests().catch(() => null),
        apiGetNotifications().catch(() => null),
      ]);

      // 1. Check for INCOMING Chat Messages
      if (chatRes?.conversations && Array.isArray(chatRes.conversations)) {
        let hasNewChat = false;
        chatRes.conversations.forEach((conv) => {
          const userId = conv.id;
          const currentUnread = conv.unread_count || 0;
          const lastMsg = conv.last_msg || '';
          const msgKey = `${userId}_${lastMsg}_${currentUnread}`;

          if (currentUnread > 0 && !seenChatMsgRef.current[msgKey]) {
            hasNewChat = true;
            if (!isInitialFetchRef.current) {
              const displayName = conv.display_name || conv.user?.display_name || conv.name || conv.user?.name || 'New Message';
              triggerNotification({
                type: 'chat',
                title: displayName,
                message: conv.last_msg || 'Sent you a message',
                avatar: formatImageUrl(conv.avatar),
                userId: conv.id,
                user: conv.user,
              });
            }
            seenChatMsgRef.current[msgKey] = true;
          }
        });

        if (hasNewChat && !isInitialFetchRef.current) {
          eventEmitter.emit(EVENTS.CHAT_UPDATED);
        }
      }

      // 2. Check for INCOMING Match Requests & Date Proposals
      if (reqRes?.requests && Array.isArray(reqRes.requests)) {
        const pendingList = reqRes.requests.filter(
          (r) => (r.request_status || r.status || 'pending') === 'pending'
        );

        pendingList.forEach((r) => {
          const reqId = r.id || r.user_id;
          if (reqId && !seenPendingReqRef.current.has(reqId)) {
            if (!isInitialFetchRef.current) {
              const isProposal = r?.type === 'date_proposal' || r?.request_type === 'date_proposal';
              const displayName = r?.display_name || r?.user?.display_name || r?.name || r?.user?.name || 'Someone';
              triggerNotification({
                type: isProposal ? 'date_proposal' : 'request',
                title: isProposal ? 'New Date Proposal' : 'New Match Request',
                message: displayName
                  ? (isProposal
                    ? `${displayName} invited you on a date at ${r.restaurant?.name || 'a date spot'}`
                    : `${displayName} wants to connect with you`)
                  : 'Someone sent you a request',
                avatar: r?.avatar ? formatImageUrl(r.avatar) : null,
                userId: r?.user_id || r?.user?.id,
                user: r?.user,
              });
            }
            seenPendingReqRef.current.add(reqId);
          }
        });
      }

      // 3. Check for Notifications (e.g. request_accepted for original SENDER!)
      if (notifRes?.notifications && Array.isArray(notifRes.notifications)) {
        const unreadNotifs = notifRes.notifications.filter((n) => !n.is_read);

        unreadNotifs.forEach((notif) => {
          if (!seenNotifIdsRef.current.has(notif.id)) {
            seenNotifIdsRef.current.add(notif.id);

            // Only trigger banner for NEW notifications received AFTER app launch
            if (!isInitialFetchRef.current) {
              const notifType = notif.type || 'notification';
              const fromUser = notif.from_user || notif.fromUser;
              const displayName = fromUser?.display_name || fromUser?.name || 'Your crush';

              if (notifType === 'request_accepted' || notifType === 'new_match') {
                if (fromUser) {
                  setGlobalMatchedUser({
                    id: fromUser.id,
                    name: displayName,
                    display_name: displayName,
                    image: fromUser.avatar ? formatImageUrl(fromUser.avatar) : null,
                    avatar: fromUser.avatar,
                  });
                  setGlobalMatchModalVisible(true);
                  apiMarkNotificationsRead().catch(() => { });
                }

                triggerNotification({
                  type: 'request_accepted',
                  title: "It's a Match!",
                  message: `${displayName} accepted your request`,
                  avatar: fromUser?.avatar ? formatImageUrl(fromUser.avatar) : null,
                  userId: fromUser?.id,
                  user: fromUser,
                });
              } else {
                let title = 'HeartLink Alert';
                if (notifType === 'request_declined') title = 'Request Update';
                else if (notifType === 'message_reaction') title = 'New Reaction';
                else if (notifType === 'date_proposal') title = 'New Date Proposal';
                else if (notifType.includes('date')) title = 'Date Update';

                let notifMessage = notif.message || 'You have a new update';
                if (fromUser?.name && fromUser?.display_name && fromUser.name !== fromUser.display_name) {
                  notifMessage = notifMessage.replace(fromUser.name, fromUser.display_name);
                }

                triggerNotification({
                  type: notifType,
                  title,
                  message: notifMessage,
                  avatar: fromUser?.avatar ? formatImageUrl(fromUser.avatar) : null,
                  userId: fromUser?.id,
                  user: fromUser,
                });
              }
            }
          }
        });
      }

      if (isInitialFetchRef.current) {
        isInitialFetchRef.current = false;
      }
    } catch (err) {
      // ignore transient poll errors
    } finally {
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, user, triggerNotification]);

  // Real-time active polling interval (every 3.5 seconds)
  useEffect(() => {
    if (!isAuthenticated) return;

    checkNotifications();
    const pollInterval = setInterval(checkNotifications, 3500);

    // Event listeners for incoming updates only (Self-sent actions will NOT trigger banners for self)
    const unsubNotif = eventEmitter.on(EVENTS.NOTIFICATION_RECEIVED, checkNotifications);
    const unsubChat = eventEmitter.on(EVENTS.CHAT_UPDATED, checkNotifications);
    const unsubReq = eventEmitter.on(EVENTS.REQUEST_UPDATED, checkNotifications);

    return () => {
      clearInterval(pollInterval);
      unsubNotif();
      unsubChat();
      unsubReq();
    };
  }, [isAuthenticated, checkNotifications, triggerNotification]);

  return (
    <NotificationContext.Provider
      value={{
        bannerVisible,
        bannerData,
        triggerNotification,
        dismissNotification,
        checkNotifications,
      }}
    >
      {children}

      {/* Global "It's a Match!" Screen Popup (Triggers on Sender's screen when accepted) */}
      <MatchModal
        visible={globalMatchModalVisible}
        currentUser={user}
        matchedUser={globalMatchedUser}
        onClose={() => {
          setGlobalMatchModalVisible(false);
          setGlobalMatchedUser(null);
          apiMarkNotificationsRead().catch(() => { });
        }}
        onSendMessage={(targetUser) => {
          setGlobalMatchModalVisible(false);
          setGlobalMatchedUser(null);
          apiMarkNotificationsRead().catch(() => { });
          if (targetUser?.id) {
            navigate('ChatDetail', {
              match: {
                id: targetUser.id,
                user_id: targetUser.id,
                name: targetUser.name,
                avatar: targetUser.image || targetUser.avatar,
              },
            });
          }
        }}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
