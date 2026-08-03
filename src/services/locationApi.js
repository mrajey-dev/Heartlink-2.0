// src/services/locationApi.js
// Dynamic API for Country Codes, Countries, States, and Cities with caching & fallbacks

const COUNTRY_API = 'https://countriesnow.space/api/v0.1/countries';

let countriesCache = null;
let statesCache = {};
let citiesCache = {};
let countryCodesCache = null;

// Default initial dataset as robust offline fallback
import { COUNTRY_CODES as FALLBACK_CODES, LOCATION_DATA as FALLBACK_LOCATION_DATA } from '../utils/locationData';

/**
 * Fetch all Country Phone Codes via API
 */
export async function fetchCountryCodesApi() {
  if (countryCodesCache && countryCodesCache.length > 0) {
    return countryCodesCache;
  }

  try {
    const response = await fetch(`${COUNTRY_API}/codes`);
    const json = await response.json();
    if (json && !json.error && Array.isArray(json.data)) {
      const formatted = json.data
        .filter(c => c.dial_code && c.name)
        .map(c => ({
          code: c.dial_code.startsWith('+') ? c.dial_code : `+${c.dial_code}`,
          country: c.name,
          iso: c.code || 'UN',
          name: `${c.name} (${c.dial_code.startsWith('+') ? c.dial_code : '+' + c.dial_code})`
        }));

      if (formatted.length > 0) {
        countryCodesCache = formatted;
        return countryCodesCache;
      }
    }
  } catch (err) {
    console.log('Country Codes API failed, using fallback:', err.message);
  }

  countryCodesCache = FALLBACK_CODES;
  return FALLBACK_CODES;
}

/**
 * Fetch List of Countries via API
 */
export async function fetchCountriesApi() {
  if (countriesCache && countriesCache.length > 0) {
    return countriesCache;
  }

  try {
    const response = await fetch(`${COUNTRY_API}/positions`);
    const json = await response.json();
    if (json && !json.error && Array.isArray(json.data)) {
      const list = json.data.map(item => item.name).sort();
      if (list.length > 0) {
        countriesCache = list;
        return list;
      }
    }
  } catch (err) {
    console.log('Countries API failed, using fallback:', err.message);
  }

  const fallbackCountries = Object.keys(FALLBACK_LOCATION_DATA);
  countriesCache = fallbackCountries;
  return fallbackCountries;
}

/**
 * Fetch States for a specific Country via API
 */
export async function fetchStatesApi(country) {
  if (!country) return [];
  if (statesCache[country]) return statesCache[country];

  try {
    const response = await fetch(`${COUNTRY_API}/states`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country })
    });
    const json = await response.json();
    if (json && !json.error && json.data && Array.isArray(json.data.states)) {
      const list = json.data.states.map(s => s.name).sort();
      if (list.length > 0) {
        statesCache[country] = list;
        return list;
      }
    }
  } catch (err) {
    console.log(`States API failed for ${country}, using fallback:`, err.message);
  }

  const fallbackStates = FALLBACK_LOCATION_DATA[country]
    ? Object.keys(FALLBACK_LOCATION_DATA[country])
    : [];
  statesCache[country] = fallbackStates;
  return fallbackStates;
}

/**
 * Fetch Cities for a specific State & Country via API
 */
export async function fetchCitiesApi(country, state) {
  if (!country || !state) return [];
  const cacheKey = `${country}_${state}`;
  if (citiesCache[cacheKey]) return citiesCache[cacheKey];

  try {
    const response = await fetch(`${COUNTRY_API}/state/cities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ country, state })
    });
    const json = await response.json();
    if (json && !json.error && Array.isArray(json.data)) {
      const list = json.data.sort();
      if (list.length > 0) {
        citiesCache[cacheKey] = list;
        return list;
      }
    }
  } catch (err) {
    console.log(`Cities API failed for ${country}-${state}, using fallback:`, err.message);
  }

  const fallbackCities = FALLBACK_LOCATION_DATA[country]?.[state] || [];
  citiesCache[cacheKey] = fallbackCities;
  return fallbackCities;
}
