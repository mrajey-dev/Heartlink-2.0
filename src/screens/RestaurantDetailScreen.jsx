// src/screens/RestaurantDetailScreen.jsx — Restaurant Details & Interactive Booking Scheduler
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, StatusBar, ScrollView, Dimensions, Alert, Linking, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BlurView from '../components/SafeBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../theme/ThemeContext';
import { apiCreateDateProposal, apiGetMatches } from '../services/api';
import CustomAlertModal from '../components/CustomAlertModal';

const { width, height } = Dimensions.get('window');

const DATE_OPTIONS = ['Tonight', 'Tomorrow', 'This Friday', 'This Saturday'];
const TIME_OPTIONS = ['7:00 PM', '8:00 PM', '8:30 PM', '9:00 PM'];

export default function RestaurantDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

  // Extract restaurant info from route params with static fallbacks
  const spot = useMemo(() => {
    return route.params?.spot || {
      id: 'r1',
      name: 'La Parisienne',
      cuisine: 'French Bistro',
      rating: '4.9',
      price: '$$$',
      location: 'SoHo, NY',
      address: '128 Prince St, New York, NY 10012',
      mapUrl: 'https://maps.google.com/?q=La+Parisienne+SoHo+New+York',
      image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
      description: 'Charming classical French eatery presenting traditional Parisian bistro fare alongside an exquisite curated French wine list in a cozy, romantically candle-lit atmosphere.',
      tag: 'Most Romantic'
    };
  }, [route.params]);

  const [bookingVisible, setBookingVisible] = useState(false);
  const [matchOptions, setMatchOptions] = useState([]);
  const [partner, setPartner] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const res = await apiGetMatches();
        if (res?.matches && Array.isArray(res.matches) && res.matches.length > 0) {
          const apiList = res.matches.map(m => {
            const u = m.user || {};
            return {
              id: u.id,
              name: u.name || 'Match',
              display_name: u.display_name || u.name || 'Match',
              image: u.avatar || (u.photos && u.photos[0]?.photo_url) || 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150',
            };
          });
          setMatchOptions(apiList);
          setPartner(apiList[0].id);
        }
      } catch (e) {}
    };
    fetchMatches();
  }, []);

  const selectedPartnerName = useMemo(() => {
    const found = matchOptions.find(m => m.id === partner);
    return found ? (found.display_name || found.name) : 'your match';
  }, [matchOptions, partner]);

  const formattedDate = useMemo(() => {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return selectedDate.toLocaleDateString('en-US', options);
  }, [selectedDate]);

  const isoDateStr = useMemo(() => {
    const d = new Date(selectedDate);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, [selectedDate]);

  const formattedTime = useMemo(() => {
    const options = { hour: '2-digit', minute: '2-digit', hour12: true };
    return selectedDate.toLocaleTimeString('en-US', options);
  }, [selectedDate]);

  const [bookingAlertVisible, setBookingAlertVisible] = useState(false);
  const [mapAlertVisible, setMapAlertVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const openGoogleMaps = () => {
    const query = encodeURIComponent(`${spot.name} ${spot.location}`);
    const mapsUrl = spot.mapUrl || `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(mapsUrl).catch(() => {
      setMapAlertVisible(true);
    });
  };

  const confirmBooking = async () => {
    if (isSending) return;
    setIsSending(true);
    try {
      if (partner) {
        await apiCreateDateProposal({
          partner_id: partner,
          restaurant_id: spot.id,
          booking_date: isoDateStr,
          booking_time: formattedTime,
        });
      }
    } catch (e) {
      console.warn('Create proposal error:', e?.message);
    } finally {
      setIsSending(false);
    }
    setBookingAlertVisible(true);
  };

  return (
    <LinearGradient colors={theme.bgGrad} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.root}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />

      {/* Background glowing depth blobs */}
      <View style={styles.glowBlobPurple} pointerEvents="none" />
      <View style={styles.glowBlobCyan} pointerEvents="none" />

      {/* Header bar - with custom translucent spacing */}
      <SafeAreaView style={styles.headerWrap} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{spot.name}</Text>
          <TouchableOpacity style={styles.shareBtn} onPress={openGoogleMaps}>
            <Ionicons name="map-outline" size={18} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Banner image with curved bounds */}
        <View style={styles.imgContainer}>
          <Image source={{ uri: spot.image }} style={styles.spotImg} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']} style={styles.imgGrad} />
          {spot.tag && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{spot.tag}</Text>
            </View>
          )}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#FFD60A" />
            <Text style={styles.ratingText}>{spot.rating}</Text>
          </View>
        </View>

        {/* Spot Details Panel */}
        <View style={styles.detailsBox}>
          <Text style={styles.cuisineText}>{spot.cuisine} · {spot.price}</Text>
          <Text style={styles.description}>{spot.description || "Indulge in a carefully selected menu, candle-lit tables, and ambient sounds perfect for connecting with matches."}</Text>

          {/* Interactive Google Map Link */}
          <TouchableOpacity style={styles.addressBox} onPress={openGoogleMaps} activeOpacity={0.85}>
            <BlurView
              intensity={isDark ? 30 : 50}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.addressInfo}>
              <Ionicons name="pin" size={18} color="#FF375F" />
              <View style={styles.addressTextWrap}>
                <Text style={styles.addressName}>{spot.location}</Text>
                <Text style={styles.addressText} numberOfLines={1}>{spot.address || "Curated local spot, NY"}</Text>
              </View>
            </View>
            <View style={styles.mapLinkBadge}>
              <Text style={styles.mapLinkText}>Open Maps</Text>
              <Ionicons name="arrow-forward" size={10} color={theme.textPrimary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Interactive Booking Section */}
        {bookingVisible ? (
          <View style={styles.bookingContainer}>
            {/* Step 1: Select Partner */}
            <Text style={styles.sectionLabel}>Select Your Match</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarList}>
              {matchOptions.map(item => {
                const active = item.id === partner;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.avatarItem}
                    onPress={() => setPartner(item.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.avatarImgWrap, active && styles.avatarImgWrapActive]}>
                      <Image source={{ uri: item.image }} style={styles.avatarImg} />
                    </View>
                    <Text style={[styles.avatarName, active && styles.avatarNameActive]}>{item.display_name || item.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Step 2: Choose Date */}
            <Text style={styles.sectionLabel}>Choose Date</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
              <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
              <View style={styles.pickerTriggerInner}>
                <Ionicons name="calendar-outline" size={18} color="#FF375F" />
                <Text style={styles.pickerTriggerText}>{formattedDate}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSec} />
            </TouchableOpacity>

            {/* Step 3: Choose Time */}
            <Text style={styles.sectionLabel}>Choose Time</Text>
            <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowTimePicker(true)} activeOpacity={0.8}>
              <BlurView intensity={isDark ? 30 : 50} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
              <View style={styles.pickerTriggerInner}>
                <Ionicons name="time-outline" size={18} color="#FF375F" />
                <Text style={styles.pickerTriggerText}>{formattedTime}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSec} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    const newDate = new Date(selectedDate);
                    newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                    setSelectedDate(newDate);
                  }
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="time"
                display="default"
                onChange={(event, time) => {
                  setShowTimePicker(false);
                  if (time) {
                    const newDate = new Date(selectedDate);
                    newDate.setHours(time.getHours(), time.getMinutes());
                    setSelectedDate(newDate);
                  }
                }}
              />
            )}

            {/* Confirmation Action Button */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.ctaBtn} onPress={confirmBooking} activeOpacity={0.9} disabled={isSending}>
                <LinearGradient
                  colors={theme.gradientAccent}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.ctaGrad}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.ctaBtnText}>Confirm Proposal to {selectedPartnerName}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* Book a Date Initial Button */
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.ctaBtn} onPress={() => setBookingVisible(true)} activeOpacity={0.9}>
              <LinearGradient
                colors={theme.gradientAccent}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.ctaGrad}
              >
                <Ionicons name="wine" size={18} color="#fff" />
                <Text style={styles.ctaBtnText}>Book a Date here</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <CustomAlertModal
        visible={bookingAlertVisible}
        title="Date Proposal Sent!"
        message={`We've sent your request to meet ${selectedPartnerName} at ${spot.name} on ${formattedDate} at ${formattedTime}. We'll notify you when they confirm!`}
        icon="wine-outline"
        iconColor="#FF007F"
        confirmText="Great!"
        onConfirm={() => {
          setBookingAlertVisible(false);
          navigation.goBack();
        }}
      />

      <CustomAlertModal
        visible={mapAlertVisible}
        title="Unable to open map"
        message="Please check your network settings."
        icon="navigate-circle-outline"
        iconColor="#FF375F"
        confirmText="OK"
        onConfirm={() => setMapAlertVisible(false)}
      />
    </LinearGradient>
  );
}

const getStyles = (theme) => StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, position: 'relative' },

  // Glowing background depth blobs
  glowBlobPurple: {
    position: 'absolute',
    top: height * 0.25,
    right: -85,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(168, 85, 247, 0.16)',
    opacity: 0.8,
    zIndex: 0,
  },
  glowBlobCyan: {
    position: 'absolute',
    bottom: height * 0.15,
    left: -85,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(6, 182, 212, 0.14)',
    opacity: 0.7,
    zIndex: 0,
  },

  // Translucent Status Bar Spacing
  headerWrap: {
    backgroundColor: 'transparent',
    paddingTop: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
    letterSpacing: -0.2,
  },
  shareBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: theme.glass, borderWidth: 1, borderColor: theme.border,
    justifyContent: 'center', alignItems: 'center',
  },

  scroll: {
    paddingBottom: 60,
  },

  // Image Banner
  imgContainer: {
    marginHorizontal: 20,
    height: height * 0.32,
    borderRadius: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  spotImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imgGrad: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0, top: '40%',
  },
  tag: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 55, 95, 0.9)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  ratingBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },

  // Details
  detailsBox: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  cuisineText: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  description: {
    fontSize: 14.5,
    color: theme.textSec,
    lineHeight: 22,
    marginBottom: 20,
  },

  // Google Maps Box
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.glass,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    overflow: 'hidden',
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  addressTextWrap: {
    flex: 1,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.textPrimary,
  },
  addressText: {
    fontSize: 12.5,
    color: theme.textFaint,
    marginTop: 2,
  },
  mapLinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  mapLinkText: {
    color: theme.textPrimary,
    fontSize: 10,
    fontWeight: '800',
  },

  // Booking UI
  bookingContainer: {
    marginTop: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.textFaint,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 18,
    paddingHorizontal: 20,
  },

  // Match list select
  avatarList: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 6,
  },
  avatarItem: {
    alignItems: 'center',
  },
  avatarImgWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarImgWrapActive: {
    borderColor: '#FF375F',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  avatarName: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSec,
    marginTop: 6,
  },
  avatarNameActive: {
    color: theme.textPrimary,
    fontWeight: '800',
  },

  // Date/Time select triggers
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.glass,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  pickerTriggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pickerTriggerText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: theme.textPrimary,
  },

  // Action CTA
  actionRow: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  ctaBtn: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  ctaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 14.5,
    fontWeight: '800',
  },
});
