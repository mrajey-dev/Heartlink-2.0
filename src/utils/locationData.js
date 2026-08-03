// src/utils/locationData.js

export const COUNTRY_CODES = [
  { code: '+91', country: 'India', flagIcon: 'flag-outline', name: 'India (+91)' },
  { code: '+1', country: 'United States', flagIcon: 'flag-outline', name: 'USA (+1)' },
  { code: '+44', country: 'United Kingdom', flagIcon: 'flag-outline', name: 'UK (+44)' },
  { code: '+971', country: 'UAE', flagIcon: 'flag-outline', name: 'UAE (+971)' },
  { code: '+61', country: 'Australia', flagIcon: 'flag-outline', name: 'Australia (+61)' },
  { code: '+1', country: 'Canada', flagIcon: 'flag-outline', name: 'Canada (+1)' },
  { code: '+49', country: 'Germany', flagIcon: 'flag-outline', name: 'Germany (+49)' },
  { code: '+33', country: 'France', flagIcon: 'flag-outline', name: 'France (+33)' },
  { code: '+81', country: 'Japan', flagIcon: 'flag-outline', name: 'Japan (+81)' },
  { code: '+55', country: 'Brazil', flagIcon: 'flag-outline', name: 'Brazil (+55)' },
  { code: '+65', country: 'Singapore', flagIcon: 'flag-outline', name: 'Singapore (+65)' },
];

export const LOCATION_DATA = {
  'India': {
    'Maharashtra': ['Mumbai', 'Pune', 'Nashik', 'Nagpur', 'Thane', 'Chhatrapati Sambhajinagar'],
    'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'Gurugram', 'Noida'],
    'Karnataka': ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
    'West Bengal': ['Kolkata', 'Howrah', 'Siliguri'],
  },
  'United States': {
    'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose'],
    'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany'],
    'Texas': ['Austin', 'Houston', 'Dallas', 'San Antonio'],
    'Illinois': ['Chicago', 'Aurora', 'Naperville'],
    'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
  },
  'United Kingdom': {
    'England': ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds'],
    'Scotland': ['Edinburgh', 'Glasgow', 'Aberdeen'],
  },
  'Canada': {
    'Ontario': ['Toronto', 'Ottawa', 'Hamilton', 'London'],
    'British Columbia': ['Vancouver', 'Victoria', 'Kelowna'],
  },
  'Australia': {
    'New South Wales': ['Sydney', 'Newcastle', 'Wollongong'],
    'Victoria': ['Melbourne', 'Geelong', 'Ballarat'],
  },
};

export const MOTHER_TONGUES = [
  'Hindi', 'English', 'Marathi', 'Bengali', 'Telugu', 'Tamil',
  'Gujarati', 'Urdu', 'Kannada', 'Odia', 'Punjabi', 'Malayalam',
  'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Arabic', 'Other'
];

export const RELIGIONS = [
  'Hinduism', 'Islam', 'Christianity', 'Sikhism', 'Buddhism',
  'Jainism', 'Spiritual', 'Agnostic', 'Atheist', 'Other'
];

export const MARITAL_STATUSES = [
  'Never Married', 'Single', 'Divorced', 'Widowed', 'Separated'
];

export const EDUCATION_LEVELS = [
  "Doctorate / Ph.D", "Master's Degree", "Bachelor's Degree",
  "Undergraduate", "High School", "Trade / Vocational School"
];

export const DIET_OPTIONS = [
  'Vegetarian', 'Non-Vegetarian', 'Vegan', 'Eggetarian', 'Jain', 'Pescatarian'
];

export const SMOKING_OPTIONS = [
  'Never', 'Socially', 'Regularly', 'Trying to quit'
];

export const DRINKING_OPTIONS = [
  'Never', 'Socially', 'Regularly', 'On special occasions'
];

export const CLUBBING_OPTIONS = [
  'Never', 'On Weekends', 'Occasionally', 'Party Animal'
];
