import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Animated, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Image, Alert, Easing, Modal, SafeAreaView,
  BackHandler
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { registerUser } from "../services/authService";
import { createUserProfile } from "../services/userService";
import { apiUploadImage } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { LIGHT_THEME } from '../theme/colors';
import CustomAlertModal from '../components/CustomAlertModal';
import SearchableDropdownModal from '../components/common/SearchableDropdownModal';
import {
  fetchCountryCodesApi, fetchCountriesApi, fetchStatesApi, fetchCitiesApi
} from '../services/locationApi';
import {
  MOTHER_TONGUES, RELIGIONS, MARITAL_STATUSES,
  EDUCATION_LEVELS, DIET_OPTIONS, SMOKING_OPTIONS,
  DRINKING_OPTIONS, CLUBBING_OPTIONS
} from '../utils/locationData';
import { ALL_VIBE_NODES } from '../utils/vibeData';

const { width, height } = Dimensions.get('window');
const TOTAL_STEPS = 9;
const THEME = LIGHT_THEME;

// ─── Data ───────────────────────────────────────────────────────────────────
const HOBBIES = [
  { name: 'Photography', icon: 'camera-outline' },
  { name: 'Travel', icon: 'airplane-outline' },
  { name: 'Music', icon: 'musical-notes-outline' },
  { name: 'Cooking', icon: 'restaurant-outline' },
  { name: 'Gaming', icon: 'game-controller-outline' },
  { name: 'Fitness', icon: 'fitness-outline' },
  { name: 'Reading', icon: 'book-outline' },
  { name: 'Art', icon: 'color-palette-outline' },
  { name: 'Dancing', icon: 'body-outline' },
  { name: 'Yoga', icon: 'heart-circle-outline' },
  { name: 'Hiking', icon: 'compass-outline' },
  { name: 'Movies', icon: 'film-outline' },
  { name: 'Fashion', icon: 'shirt-outline' },
  { name: 'Technology', icon: 'hardware-chip-outline' },
  { name: 'Sports', icon: 'football-outline' },
  { name: 'Coffee', icon: 'cafe-outline' },
];

const RELATIONSHIP_TYPES = [
  { label: 'Long-term Relationship', icon: 'heart-outline', desc: 'Looking for something serious' },
  { label: 'Casual Dating', icon: 'cafe-outline', desc: 'Going with the flow' },
  { label: 'Friendship', icon: 'people-outline', desc: 'Making new friends' },
  { label: 'Marriage-minded', icon: 'ribbon-outline', desc: 'Ready to settle down' },
];

const GENDERS = ['Man', 'Woman'];

// ─── Floating Input Component ───────────────────────────────────────────────
function FloatingInput({ label, icon, value, onChangeText, keyboardType, secureTextEntry, multiline, maxLength, style, onFocusScroll }) {
  const [focused, setFocused] = useState(false);
  const [showSec, setShowSec] = useState(false);

  const handleFocus = () => {
    setFocused(true);
    if (onFocusScroll) {
      onFocusScroll();
    }
  };

  return (
    <View style={[inputStyles.wrap, focused && inputStyles.wrapFocused, style]}>
      <Ionicons name={icon} size={16} color={focused ? '#FF007F' : THEME.textFaint} style={inputStyles.icon} />
      <TextInput
        style={[inputStyles.field, multiline && { height: 60, textAlignVertical: 'top' }]}
        placeholder={label}
        placeholderTextColor={THEME.textFaint}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        autoCapitalize="none"
        secureTextEntry={secureTextEntry && !showSec}
        multiline={multiline}
        maxLength={maxLength}
        onFocus={handleFocus}
        onBlur={() => setFocused(false)}
      />
      {secureTextEntry && (
        <TouchableOpacity onPress={() => setShowSec(v => !v)} style={inputStyles.eye}>
          <Ionicons name={showSec ? 'eye-outline' : 'eye-off-outline'} size={16} color={THEME.textFaint} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const inputStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', paddingHorizontal: 14, height: 52, marginBottom: 12 },
  wrapFocused: { borderColor: '#FF007F', backgroundColor: 'rgba(255,0,127,0.04)' },
  icon: { marginRight: 10 },
  field: { flex: 1, color: THEME.textPrimary, fontSize: 14.5, height: '100%' },
  eye: { padding: 6 },
});

// ─── Step 0: Basic Credentials & Display Name ──────────────────────────────
function StepCredentials({ data, onChange, onFocusScroll }) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(data.dob ? new Date(data.dob) : new Date(2000, 0, 1));

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) {
      setTempDate(selectedDate);
      const today = new Date();
      let age = today.getFullYear() - selectedDate.getFullYear();
      const m = today.getMonth() - selectedDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < selectedDate.getDate())) age--;
      onChange('dob', selectedDate.toISOString());
      onChange('age', age.toString());
    }
  };

  const formattedDOB = data.dob
    ? new Date(data.dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <View>
      <StepHeader icon="person-outline" title="Basic Details" sub="Set your name and account info" />
      <FloatingInput label="Full Name" icon="person-outline" value={data.name} onChangeText={v => onChange('name', v)} maxLength={25} onFocusScroll={() => onFocusScroll(0)} />
      <FloatingInput label="Display Name / Nickname" icon="sparkles-outline" value={data.displayName} onChangeText={v => onChange('displayName', v)} maxLength={25} onFocusScroll={() => onFocusScroll(60)} />
      <FloatingInput label="Email Address" icon="mail-outline" value={data.email} onChangeText={v => onChange('email', v)} keyboardType="email-address" onFocusScroll={() => onFocusScroll(120)} />
      <FloatingInput label="Password" icon="lock-closed-outline" value={data.password} onChangeText={v => onChange('password', v)} secureTextEntry onFocusScroll={() => onFocusScroll(180)} />

      <TouchableOpacity
        style={sty.dobTrigger}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={16} color={data.dob ? '#FF007F' : THEME.textFaint} style={sty.dobIcon} />
        <View style={sty.dobTextContainer}>
          <Text style={[sty.dobValue, !data.dob && { color: THEME.textFaint }]}>
            {data.dob ? `${formattedDOB} (${data.age} yrs)` : 'Date of Birth'}
          </Text>
        </View>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
          onChange={handleDateChange}
        />
      )}

      <Text style={sty.label}>Gender</Text>
      <View style={sty.chipRow}>
        {GENDERS.map(g => (
          <TouchableOpacity
            key={g}
            style={[sty.chip, data.gender === g && sty.chipActive]}
            onPress={() => onChange('gender', g)}
          >
            <Ionicons name={g === 'Man' ? 'male-outline' : 'female-outline'} size={15} color={data.gender === g ? '#FF007F' : THEME.textSec} style={{ marginRight: 6 }} />
            <Text style={[sty.chipText, data.gender === g && sty.chipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Step 1: Phone & Country Code (No OTP) ──────────────────────────────
function StepOTP({ data, onChange, onFocusScroll }) {
  const [countryCodes, setCountryCodes] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  useEffect(() => {
    setLoadingCodes(true);
    fetchCountryCodesApi().then(res => {
      setCountryCodes(res);
      setLoadingCodes(false);
    });
  }, []);

  const currentCountryCode = data.countryCode || '+91';

  return (
    <View>
      <StepHeader icon="call-outline" title="Your Phone Number" sub="Select country code and enter your number" />

      <SearchableDropdownModal
        label="Country Code"
        placeholder="Select Country Code (+91, +1...)"
        value={currentCountryCode}
        items={countryCodes}
        loading={loadingCodes}
        icon="flag-outline"
        onSelect={(item) => {
          const code = typeof item === 'object' ? item.code : item;
          onChange('countryCode', code);
        }}
      />

      <FloatingInput
        label="Mobile Number"
        icon="phone-portrait-outline"
        value={data.phone}
        onChangeText={v => onChange('phone', v)}
        keyboardType="numeric"
        onFocusScroll={() => onFocusScroll(100)}
      />

      <View style={sty.phoneNoteCard}>
        <Ionicons name="information-circle-outline" size={16} color="#FF007F" style={{ marginRight: 6 }} />
        <Text style={sty.phoneNoteText}>
          Your phone number will be used for account recovery and profile verification
        </Text>
      </View>
    </View>
  );
}

// ─── Step 2: Hobbies & Interests ────────────────────────────────────────────
function StepHobbies({ data, onChange }) {
  const toggle = (h) => {
    const curr = data.hobbies || [];
    const next = curr.includes(h) ? curr.filter(x => x !== h) : [...curr, h];
    onChange('hobbies', next);
  };
  return (
    <View>
      <StepHeader icon="sparkles-outline" title="Your Interests" sub="Select at least 3 hobbies or interests" />
      <Text style={sty.selectedCount}>{(data.hobbies || []).length} selected</Text>
      <View style={sty.chipGrid}>
        {HOBBIES.map(h => {
          const active = (data.hobbies || []).includes(h.name);
          return (
            <TouchableOpacity
              key={h.name}
              style={[sty.hobbyChip, active && sty.hobbyChipActive]}
              onPress={() => toggle(h.name)}
            >
              <Ionicons name={h.icon} size={14} color={active ? '#FF007F' : THEME.textSec} style={{ marginRight: 6 }} />
              <Text style={[sty.hobbyText, active && sty.hobbyTextActive]}>{h.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 3: Relationship & Marital Status ──────────────────────────────────
function StepPreferences({ data, onChange }) {
  return (
    <View>
      <StepHeader icon="heart-outline" title="Relationship Goals" sub="Select what fits your current preferences" />
      <Text style={sty.label}>Relationship Goal</Text>
      {RELATIONSHIP_TYPES.map(rt => {
        const active = data.relationshipType === rt.label;
        return (
          <TouchableOpacity
            key={rt.label}
            style={[sty.prefCard, active && sty.prefCardActive]}
            onPress={() => onChange('relationshipType', rt.label)}
          >
            <View style={sty.prefIconBox}>
              <Ionicons name={rt.icon} size={18} color={active ? "#FF007F" : THEME.textSec} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[sty.prefLabel, active && sty.prefLabelActive]}>{rt.label}</Text>
              <Text style={sty.prefDesc}>{rt.desc}</Text>
            </View>
            {active && <Ionicons name="checkmark-circle" size={18} color="#FF007F" />}
          </TouchableOpacity>
        );
      })}

      <SearchableDropdownModal
        label="Marital / Relationship Status"
        placeholder="Select Marital Status"
        value={data.maritalStatus}
        items={MARITAL_STATUSES}
        icon="shield-checkmark-outline"
        onSelect={(val) => onChange('maritalStatus', val)}
      />
    </View>
  );
}

// ─── Step 4: Cascading Location API with Dropdowns ─────────────────────────
function StepLocation({ data, onChange, onFocusScroll }) {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    setLoadingCountries(true);
    fetchCountriesApi().then(res => {
      setCountries(res);
      setLoadingCountries(false);
    });
  }, []);

  useEffect(() => {
    if (data.country) {
      setLoadingStates(true);
      fetchStatesApi(data.country).then(res => {
        setStates(res);
        setLoadingStates(false);
      });
    } else {
      setStates([]);
    }
  }, [data.country]);

  useEffect(() => {
    if (data.country && data.state) {
      setLoadingCities(true);
      fetchCitiesApi(data.country, data.state).then(res => {
        setCities(res);
        setLoadingCities(false);
      });
    } else {
      setCities([]);
    }
  }, [data.country, data.state]);

  return (
    <View>
      <StepHeader icon="location-outline" title="Where are you located?" sub="Search & select Country, State, City via API" />

      {/* Country Dropdown */}
      <SearchableDropdownModal
        label="Country"
        placeholder="Select Country"
        value={data.country}
        items={countries}
        loading={loadingCountries}
        icon="earth-outline"
        onSelect={(val) => {
          const selected = typeof val === 'object' ? val.name : val;
          onChange('country', selected);
          onChange('state', '');
          onChange('city', '');
        }}
      />

      {/* State Dropdown */}
      <SearchableDropdownModal
        label="State / Region"
        placeholder={data.country ? "Select State" : "Select Country First"}
        value={data.state}
        items={states}
        loading={loadingStates}
        disabled={!data.country}
        icon="map-outline"
        onSelect={(val) => {
          const selected = typeof val === 'object' ? val.name : val;
          onChange('state', selected);
          onChange('city', '');
        }}
      />

      {/* City Dropdown */}
      <SearchableDropdownModal
        label="City"
        placeholder={data.state ? "Select City" : "Select State First"}
        value={data.city}
        items={cities}
        loading={loadingCities}
        disabled={!data.state}
        icon="business-outline"
        onSelect={(val) => {
          const selected = typeof val === 'object' ? val.name : val;
          onChange('city', selected);
        }}
      />

      {/* Zipcode / Pincode */}
      <FloatingInput
        label="Zipcode / Pincode"
        icon="navigate-outline"
        value={data.pincode}
        onChangeText={v => onChange('pincode', v)}
        keyboardType="numeric"
        onFocusScroll={() => onFocusScroll(240)}
      />
    </View>
  );
}

// ─── Step 5: Identity, Mother Tongue & Lifestyle Dropdowns ────────────────
function StepIdentity({ data, onChange, onFocusScroll }) {
  const toggleLanguage = (lang) => {
    const curr = data.languagesSpoken || [];
    const next = curr.includes(lang) ? curr.filter(x => x !== lang) : [...curr, lang];
    onChange('languagesSpoken', next);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.58 }}>
      <StepHeader icon="school-outline" title="Personal & Lifestyle" sub="Mother tongue, religion, education & diet" />

      {/* Mother Tongue Dropdown */}
      <SearchableDropdownModal
        label="Mother Tongue"
        placeholder="Select Mother Tongue"
        value={data.motherTongue}
        items={MOTHER_TONGUES}
        icon="language-outline"
        onSelect={(val) => onChange('motherTongue', val)}
      />

      {/* Religion Dropdown */}
      <SearchableDropdownModal
        label="Religion"
        placeholder="Select Religion"
        value={data.religion}
        items={RELIGIONS}
        icon="sparkles-outline"
        onSelect={(val) => onChange('religion', val)}
      />

      {/* Education Level Dropdown */}
      <SearchableDropdownModal
        label="Education Level"
        placeholder="Select Education Level"
        value={data.education}
        items={EDUCATION_LEVELS}
        icon="ribbon-outline"
        onSelect={(val) => onChange('education', val)}
      />

      {/* Occupation */}
      <FloatingInput
        label="Occupation / Profession"
        icon="briefcase-outline"
        value={data.occupation}
        onChangeText={v => onChange('occupation', v)}
        onFocusScroll={() => onFocusScroll(220)}
      />

      {/* Diet Preference Dropdown */}
      <SearchableDropdownModal
        label="Diet Preference"
        placeholder="Select Diet Preference"
        value={data.diet}
        items={DIET_OPTIONS}
        icon="restaurant-outline"
        onSelect={(val) => onChange('diet', val)}
      />

      {/* Languages Spoken Chips */}
      <Text style={sty.label}>Languages Spoken</Text>
      <View style={sty.chipRowWrap}>
        {MOTHER_TONGUES.map(lang => {
          const active = (data.languagesSpoken || []).includes(lang);
          return (
            <TouchableOpacity
              key={lang}
              style={[sty.chip, active && sty.chipActive]}
              onPress={() => toggleLanguage(lang)}
            >
              <Text style={[sty.chipText, active && sty.chipTextActive]}>{lang}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ─── Step 6: Dedicated Lifestyle & Dating Habits ────────────────────────────
function StepLifestyleHabits({ data, onChange }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.58 }}>
      <StepHeader icon="wine-outline" title="Lifestyle & Dating Habits" sub="How you are to date (Smoking, Drinking, Clubbing & Diet)" />

      {/* Smoking Dropdown */}
      <SearchableDropdownModal
        label="Smoking Habit"
        placeholder="Select Smoking Habit"
        value={data.smoking}
        items={SMOKING_OPTIONS}
        icon="flame-outline"
        onSelect={(val) => onChange('smoking', val)}
      />

      {/* Drinking Dropdown */}
      <SearchableDropdownModal
        label="Drinking Habit"
        placeholder="Select Drinking Habit"
        value={data.drinking}
        items={DRINKING_OPTIONS}
        icon="wine-outline"
        onSelect={(val) => onChange('drinking', val)}
      />

      {/* Clubbing Dropdown */}
      <SearchableDropdownModal
        label="Clubbing / Nightlife Habit"
        placeholder="Select Clubbing Habit"
        value={data.clubbing}
        items={CLUBBING_OPTIONS}
        icon="disc-outline"
        onSelect={(val) => onChange('clubbing', val)}
      />

      {/* Diet Preference Dropdown */}
      <SearchableDropdownModal
        label="Diet Preference"
        placeholder="Select Diet Preference"
        value={data.diet}
        items={DIET_OPTIONS}
        icon="restaurant-outline"
        onSelect={(val) => onChange('diet', val)}
      />

      {/* Select Your Primary Vibe Grid */}
      <Text style={[sty.label, { marginTop: 14, marginBottom: 8 }]}>Select Your Primary Vibe</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        {ALL_VIBE_NODES.map((v) => {
          const isSelected = (data.vibe || 'Late Night Beats') === v.name;
          return (
            <TouchableOpacity
              key={v.id}
              style={{
                width: '48%',
                padding: 10,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: isSelected ? '#FF007F' : THEME.border,
                backgroundColor: isSelected ? 'rgba(255, 0, 127, 0.08)' : '#FFFFFF',
              }}
              onPress={() => onChange('vibe', v.name)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <LinearGradient colors={v.color} style={{ width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 6 }}>
                  <Ionicons name={v.icon} size={14} color="#FFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11.5, fontWeight: '800', color: THEME.textPrimary }} numberOfLines={1}>{v.name}</Text>
                  <Text style={{ fontSize: 9.5, color: THEME.textFaint }} numberOfLines={1}>{v.tagline}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={sty.lifestyleNoteCard}>
        <Ionicons name="sparkles" size={16} color="#FF007F" style={{ marginRight: 6 }} />
        <Text style={sty.lifestyleNoteText}>
          These lifestyle badges help potential matches see what it's like to date you!
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Step 7: Video Introduction (SKIPPABLE) ────────────────────────────────
function StepVideoIntro({ data, onChange }) {
  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      onChange('videoIntroUrl', res.assets[0].uri);
    }
  };

  return (
    <View>
      <StepHeader icon="videocam-outline" title="Video Introduction (Optional)" sub="Boost your reach with a 15-second intro video" />

      <View style={sty.videoCard}>
        {data.videoIntroUrl ? (
          <View style={sty.videoSuccessWrap}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#30D158" />
            <Text style={sty.videoSuccessTitle}>Video Intro Selected!</Text>
            <TouchableOpacity onPress={pickVideo} style={sty.videoReplaceBtn}>
              <Text style={sty.videoReplaceBtnText}>Change Video</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={sty.videoUploadBox} onPress={pickVideo}>
            <LinearGradient colors={['rgba(255,0,127,0.15)', 'rgba(181,23,158,0.05)']} style={StyleSheet.absoluteFill} />
            <Ionicons name="videocam-outline" size={38} color="#FF007F" />
            <Text style={sty.videoUploadTitle}>Upload Video Intro</Text>
            <Text style={sty.videoUploadSub}>Tap to record or pick a 15s video</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Boost Note */}
      <View style={sty.boostNoteCard}>
        <Ionicons name="flash-outline" size={18} color="#FF007F" style={{ marginRight: 8 }} />
        <Text style={sty.boostNoteText}>
          Adding a video introduction boosts your profile visibility by 3x and gets you more matches! You can skip this step for now and add it later.
        </Text>
      </View>
    </View>
  );
}

// ─── Step 8: Photos ─────────────────────────────────────────────────────────
function StepPhotos({ data, onChange }) {
  const images = data.images || [];

  const pickImage = async (idx) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.5,
      base64: true, // Enable Base64 generation for reliable upload
    });

    if (!res.canceled && res.assets[0]?.uri) {
      const asset = res.assets[0];
      let photoVal = asset.uri;
      if (asset.base64) {
        const mime = asset.mimeType || 'image/jpeg';
        photoVal = `data:${mime};base64,${asset.base64}`;
      }

      const next = [...images];
      next[idx] = photoVal;
      onChange('images', next);
    }
  };

  const removeImage = (idx) => {
    const next = images.filter((_, i) => i !== idx);
    onChange('images', next);
  };

  return (
    <View>
      <StepHeader icon="camera-outline" title="Show Your Best Self" sub="Add at least 3 photos to complete setup" />
      <View style={sty.photoGrid}>
        {Array(6).fill(null).map((_, i) => {
          const uri = images[i];
          return (
            <View key={i} style={sty.photoSlot}>
              {uri ? (
                <View style={{ flex: 1 }}>
                  <Image source={{ uri }} style={sty.photoImg} />
                  <TouchableOpacity onPress={() => removeImage(i)} style={sty.photoRemove}>
                    <Ionicons name="close-circle" size={22} color="#FF375F" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => pickImage(i)} style={sty.photoEmpty}>
                  <Ionicons name="image-outline" size={20} color="#FF4D94" />
                  <Ionicons name="add-circle" size={14} color="#FF007F" style={sty.photoAddIcon} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Sub-header helper ─────────────────────────────────────────────────────
function StepHeader({ icon, title, sub }) {
  return (
    <View style={sty.stepHeader}>
      <View style={sty.stepIconWrap}>
        <Ionicons name={icon} size={24} color="#FF007F" />
      </View>
      <Text style={sty.stepTitle}>{title}</Text>
      <Text style={sty.stepSub}>{sub}</Text>
    </View>
  );
}

// ─── Main wizard ─────────────────────────────────────────────────────────────
export default function RegisterScreen() {

  const { login } = useAuth();
  const navigation = useNavigation();

  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    name: '', displayName: '', email: '', password: '', dob: '', age: '', gender: 'Man',
    phone: '', countryCode: '+91', otp: '', hobbies: [], relationshipType: '', maritalStatus: 'Never Married',
    country: 'India', state: '', city: '', pincode: '',
    motherTongue: 'Hindi', languagesSpoken: ['Hindi', 'English'], religion: 'Hinduism',
    education: "Bachelor's Degree", occupation: 'Professional', diet: 'Vegetarian',
    smoking: 'Never', drinking: 'Socially', clubbing: 'Never', vibe: 'Late Night Beats',
    ageMin: 18, ageMax: 35, videoIntroUrl: '',
    images: [],
  });

  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;
  const scrollViewRef = useRef(null);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const onChange = (field, val) => {
    setData(p => ({ ...p, [field]: val }));
  };

  const validateStep = (s, d) => {
    if (s === 0) {
      const emailValid = !!(d.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()));
      const passValid = !!(d.password && d.password.trim().length >= 6);
      return !!(d.name && d.displayName && emailValid && passValid && d.dob && d.age && d.gender);
    }
    if (s === 1) return !!(d.countryCode && d.phone && d.phone.length >= 10);
    if (s === 2) return !!(d.hobbies && d.hobbies.length >= 3);
    if (s === 3) return !!(d.relationshipType && d.maritalStatus);
    if (s === 4) return !!(d.country && d.state && d.city && d.pincode);
    if (s === 5) return !!(d.motherTongue && d.religion && d.education && d.occupation && d.languagesSpoken && d.languagesSpoken.length >= 1);
    if (s === 6) return !!(d.smoking && d.drinking && d.clubbing && d.diet);
    if (s === 7) return true; // Video Intro is SKIPPABLE!
    if (s === 8) return !!(d.images && d.images.filter(x => !!x).length >= 3);
    return false;
  };

  const [validationAlertMsg, setValidationAlertMsg] = useState('');
  const [validationAlertVisible, setValidationAlertVisible] = useState(false);

  const getValidationMessage = (s) => {
    switch (s) {
      case 0: return 'Please fill in all fields correctly: Full Name, Display Name, a valid Email address, Password (min 6 characters), Date of Birth, and Gender.';
      case 1: return 'Please select Country Code and enter a valid 10-digit mobile number.';
      case 2: return 'Please select at least 3 hobbies or interests.';
      case 3: return 'Please select your Relationship Goal and Marital Status.';
      case 4: return 'Please select your Country, State, City, and enter your Zipcode / Pincode.';
      case 5: return 'Please select Mother Tongue, Religion, Education, Occupation, and at least 1 Language Spoken.';
      case 6: return 'Please select your Smoking, Drinking, Clubbing, and Diet preferences.';
      case 7: return '';
      case 8: return 'Please upload at least 3 profile photos to continue.';
      default: return 'Please complete all required fields for this step.';
    }
  };

  const goNext = () => {
    if (!validateStep(step, data)) {
      setValidationAlertMsg(getValidationMessage(step));
      setValidationAlertVisible(true);
      return;
    }

    if (step < TOTAL_STEPS - 1) {
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      }).start(() => {
        setStep(p => p + 1);
        slideAnim.setValue(width);
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true
        }).start(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        });
      });
    } else {
      let dobString = '2000-01-01';
      if (data.dob) {
        try {
          dobString = typeof data.dob === 'string'
            ? data.dob.split('T')[0]
            : new Date(data.dob).toISOString().split('T')[0];
        } catch (e) {
          dobString = '2000-01-01';
        }
      }

      const rawImages = (data.images || []).filter(x => !!x);
      Promise.all(rawImages.map(img => apiUploadImage(img, { email: data.email, user_id: data.email ? data.email.split('@')[0] : null })))
        .then((uploadedPhotos) => {
          const validPhotos = uploadedPhotos.filter(Boolean);
          const avatarUrl = validPhotos[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400';

          const registrationPayload = {
            name: data.name,
            display_name: data.displayName || data.name,
            email: data.email || `${data.name.toLowerCase().replace(/\s+/g, '')}@heartlink.com`,
            phone: data.phone || '',
            phone_number: data.phone || '',
            country_code: data.countryCode || '+91',
            password: data.password || 'password123',
            age: parseInt(data.age) || 24,
            dob: dobString,
            gender: data.gender || 'Man',
            bio: `Loving life, seeking ${data.relationshipType?.toLowerCase() || 'relationship'}. Hobbies include ${(data.hobbies || []).slice(0, 3).join(', ')}.`,
            job: data.occupation || 'Member',
            occupation: data.occupation || 'Member',
            mother_tongue: data.motherTongue || 'Hindi',
            languages_spoken: data.languagesSpoken || ['Hindi', 'English'],
            religion: data.religion || 'Hinduism',
            marital_status: data.maritalStatus || 'Never Married',
            education: data.education || "Bachelor's Degree",
            diet: data.diet || 'Vegetarian',
            smoking: data.smoking || 'Never',
            drinking: data.drinking || 'Socially',
            clubbing: data.clubbing || 'Never',
            vibe: data.vibe || 'Late Night Beats',
            avatar: avatarUrl,
            video_intro_url: data.videoIntroUrl || '',
            city: data.city || 'Mumbai',
            state: data.state || 'Maharashtra',
            country: data.country || 'India',
            pincode: data.pincode || '',
            relationship_type: data.relationshipType || 'Long-term',
            interests: data.hobbies || [],
            photos: validPhotos,
          };

          return registerUser(registrationPayload).then((res) => {
            const serverUser = res.user || {};

            // Extract photos from backend response if it returned them
            const backendPhotos = Array.isArray(serverUser.photos)
              ? serverUser.photos
                  .map(p => (typeof p === 'string' ? p : (p?.photo_url || p?.uri || null)))
                  .filter(Boolean)
              : [];

            // Always preserve our uploaded URLs — backend /auth/register may NOT return photos[]
            const mergedUser = {
              ...registrationPayload,  // base: full local payload including photos
              ...serverUser,           // override with server fields (id, name, token info etc.)
              photos: backendPhotos.length > 0 ? backendPhotos : validPhotos,
              images: validPhotos,     // always keep raw uploaded URL strings
              avatar: serverUser.avatar || avatarUrl,
            };

            console.log('[Register] user stored with photos count:', mergedUser.photos?.length, mergedUser.photos);
            login(mergedUser, res.access_token || null);
          });
        })
        .catch((err) => {
          setValidationAlertMsg(err.message || 'Registration completed!');
          setValidationAlertVisible(true);
        });
    }
  };

  const goBack = () => {
    if (step > 0) {
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      }).start(() => {
        setStep(p => p - 1);
        slideAnim.setValue(-width);
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          useNativeDriver: true
        }).start(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        });
      });
    } else {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }
  };

  useEffect(() => {
    const handleHardwareBack = () => {
      if (step > 0) {
        goBack();
        return true;
      }
      return false;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => backSub.remove();
  }, [step]);

  const handleScrollToInput = (yOffset = 100) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 120);
  };

  return (
    <LinearGradient colors={['#FFF0F5', '#FFF6FA', '#FFFFFF']} style={sty.root}>
      <StatusBar barStyle="dark-content" />

      <CustomAlertModal
        visible={validationAlertVisible}
        title="Incomplete Step"
        message={validationAlertMsg}
        type="warning"
        onConfirm={() => setValidationAlertVisible(false)}
        onClose={() => setValidationAlertVisible(false)}
      />

      <SafeAreaView style={sty.flex}>
        {/* Top Header */}
        <View style={sty.topBar}>
          <TouchableOpacity onPress={goBack} style={sty.backBtn}>
            <Ionicons name="chevron-back" size={20} color={THEME.textPrimary} />
          </TouchableOpacity>

          <View style={sty.progressTrack}>
            <Animated.View
              style={[
                sty.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <Text style={sty.stepCounter}>{step + 1}/{TOTAL_STEPS}</Text>
        </View>

        {/* Wizard Card Body */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 20}
          style={sty.flex}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={sty.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={true}
          >
            <Animated.View style={[sty.card, { transform: [{ translateX: slideAnim }] }]}>
              {step === 0 && <StepCredentials data={data} onChange={onChange} onFocusScroll={handleScrollToInput} />}
              {step === 1 && <StepOTP data={data} onChange={onChange} onFocusScroll={handleScrollToInput} />}
              {step === 2 && <StepHobbies data={data} onChange={onChange} />}
              {step === 3 && <StepPreferences data={data} onChange={onChange} />}
              {step === 4 && <StepLocation data={data} onChange={onChange} onFocusScroll={handleScrollToInput} />}
              {step === 5 && <StepIdentity data={data} onChange={onChange} onFocusScroll={handleScrollToInput} />}
              {step === 6 && <StepLifestyleHabits data={data} onChange={onChange} />}
              {step === 7 && <StepVideoIntro data={data} onChange={onChange} />}
              {step === 8 && <StepPhotos data={data} onChange={onChange} />}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom Actions */}
        <View style={sty.bottomBar}>
          <TouchableOpacity style={sty.nextBtn} onPress={goNext} activeOpacity={0.85}>
            <LinearGradient colors={['#FF007F', '#B5179E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={sty.nextBtnGrad}>
              <Text style={sty.nextBtnText}>{step === TOTAL_STEPS - 1 ? 'Complete Setup' : 'Continue'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const sty = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 12,
    paddingBottom: 10,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center' },
  progressTrack: { flex: 1, height: 6, backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: 3, marginHorizontal: 12, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#FF007F', borderRadius: 3 },
  stepCounter: { fontSize: 12, fontWeight: '700', color: THEME.textSec },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },

  stepHeader: { marginBottom: 14 },
  stepIconWrap: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,0,127,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  stepTitle: { fontSize: 18, fontWeight: '800', color: THEME.textPrimary },
  stepSub: { fontSize: 12.5, color: THEME.textSec, marginTop: 2 },
  label: { fontSize: 12.5, fontWeight: '700', color: THEME.textSec, marginBottom: 8 },

  dobTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', paddingHorizontal: 14, height: 52, marginBottom: 12 },
  dobIcon: { marginRight: 10 },
  dobTextContainer: { flex: 1 },
  dobValue: { fontSize: 14.5, color: THEME.textPrimary },

  chipRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  chipActive: { backgroundColor: 'rgba(255,0,127,0.08)', borderColor: '#FF007F' },
  chipText: { fontSize: 12.5, color: THEME.textSec },
  chipTextActive: { color: '#FF007F', fontWeight: '700' },

  sendOtpBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  sendOtpGrad: { paddingVertical: 10, alignItems: 'center' },
  sendOtpText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  otpBox: { width: 42, height: 48, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', textAlign: 'center', fontSize: 18, fontWeight: '700', color: THEME.textPrimary, backgroundColor: '#FAFAFA' },
  otpBoxFilled: { borderColor: '#FF007F', backgroundColor: 'rgba(255,0,127,0.04)' },
  otpHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  otpHint: { fontSize: 11.5, color: THEME.textFaint },

  selectedCount: { fontSize: 12, fontWeight: '700', color: '#FF007F', marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hobbyChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.07)' },
  hobbyChipActive: { backgroundColor: 'rgba(255,0,127,0.08)', borderColor: '#FF007F' },
  hobbyText: { fontSize: 12, color: THEME.textSec },
  hobbyTextActive: { color: '#FF007F', fontWeight: '700' },

  prefCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.07)', marginBottom: 8, overflow: 'hidden' },
  prefCardActive: { borderColor: '#FF007F', backgroundColor: 'rgba(255,0,127,0.04)' },
  prefIconBox: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  prefLabel: { fontSize: 13.5, fontWeight: '700', color: THEME.textPrimary },
  prefLabelActive: { color: '#FF007F' },
  prefDesc: { fontSize: 11, color: THEME.textFaint, marginTop: 1 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  photoSlot: { width: (width - 72) / 3, height: ((width - 72) / 3) * 1.25, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.03)', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  photoImg: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 4, right: 4 },
  photoEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photoAddIcon: { position: 'absolute', bottom: 6, right: 6 },

  videoCard: { marginVertical: 10 },
  videoUploadBox: { height: 160, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#FF007F', justifyContent: 'center', alignItems: 'center', padding: 16, overflow: 'hidden' },
  videoUploadTitle: { fontSize: 15, fontWeight: '800', color: '#FF007F', marginTop: 8 },
  videoUploadSub: { fontSize: 11.5, color: THEME.textSec, textAlign: 'center', marginTop: 4 },
  videoSuccessWrap: { height: 160, borderRadius: 16, backgroundColor: 'rgba(48,209,88,0.08)', borderWidth: 1.5, borderColor: '#30D158', justifyContent: 'center', alignItems: 'center', padding: 16 },
  videoSuccessTitle: { fontSize: 15, fontWeight: '800', color: '#30D158', marginTop: 6 },
  videoReplaceBtn: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: '#30D158' },
  videoReplaceBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  faceDotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 14 },
  faceDot: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  faceDotDone: { backgroundColor: '#30D158' },
  faceDotActive: { backgroundColor: '#FF007F' },
  faceDotInactive: { backgroundColor: 'rgba(0,0,0,0.15)' },
  faceCapture: { alignItems: 'center', marginVertical: 10 },
  faceFrame: { width: 140, height: 140, borderRadius: 70, overflow: 'hidden', borderWidth: 3, borderColor: '#FF007F', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  faceDirectionLabel: { fontSize: 16, fontWeight: '800', color: THEME.textPrimary, marginTop: 10 },
  faceDirectionHint: { fontSize: 12, color: THEME.textSec, marginTop: 2 },
  captureBtn: { marginTop: 12, borderRadius: 20, overflow: 'hidden' },
  captureBtnGrad: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10 },
  captureBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  faceSuccess: { alignItems: 'center', paddingVertical: 20 },
  faceSuccessTitle: { fontSize: 18, fontWeight: '800', color: '#30D158', marginTop: 10 },
  faceSuccessSub: { fontSize: 12, color: THEME.textSec, textAlign: 'center', marginTop: 4 },

  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
  },
  nextBtn: { borderRadius: 16, overflow: 'hidden' },
  nextBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // New styles for phone step
  phoneNoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,127,0.04)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,0,127,0.1)',
  },
  phoneNoteText: {
    flex: 1,
    fontSize: 12,
    color: THEME.textSec,
    lineHeight: 18
  },

  // Lifestyle note card
  lifestyleNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,0,127,0.04)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,0,127,0.1)',
  },
  lifestyleNoteText: {
    flex: 1,
    fontSize: 12,
    color: THEME.textSec,
    lineHeight: 18,
  },

  // Boost note card
  boostNoteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
  },
  boostNoteText: {
    flex: 1,
    fontSize: 12.5,
    color: THEME.textSec,
    lineHeight: 18,
  },
});