import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { DEFAULT_API_URL } from '@/constants/api';
import { useAuth } from '@/context/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import {
  QuotationContainerExtendedExpenseModel,
  QuotationContainerHeaderModel,
  QuotationForCreateOfferModel,
  QuotationForCreateOfferSearchModel
} from '@/types/quotation';

export function isImportCommercialType(...values: any[]): boolean {
  for (const val of values) {
    if (!val) continue;
    const str = String(val)
      .replace(/İ/g, 'i')
      .replace(/I/g, 'i')
      .toLowerCase()
      .replace(/\u0307/g, '');
    if (str.includes('ithal') || str.includes('import')) {
      return true;
    }
  }
  return false;
}

// Derinlemesine tüm key'leri küçük harfe çevirir (array + nested object destekli)
function normalizeKeysDeep<T = any>(input: any): T {
  if (Array.isArray(input)) {
    return input.map((item) => normalizeKeysDeep(item)) as any;
  }
  if (input !== null && typeof input === 'object' && !(input instanceof Date)) {
    const out: Record<string, any> = {};
    for (const key of Object.keys(input)) {
      out[key.toLowerCase()] = normalizeKeysDeep(input[key]);
    }
    return out as T;
  }
  return input;
}

// Case-insensitive olarak birden fazla aday key içinde arama yapar
function ciGet(obj: any, ...candidates: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const lowerMap: Record<string, any> = {};
  for (const k of Object.keys(obj)) lowerMap[k.toLowerCase()] = obj[k];
  for (const c of candidates) {
    const v = lowerMap[c.toLowerCase()];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

const GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isGuid(val: any): boolean {
  if (!val || typeof val !== 'string') return false;
  return GUID_REGEX.test(val.trim());
}

export function cleanGuidOrUndefined(val: any): string | undefined {
  if (!val) return undefined;
  const str = String(val).trim();
  return GUID_REGEX.test(str) ? str : undefined;
}

export function cleanStringFilterOrUndefined(val: any): string | undefined {
  if (!val) return undefined;
  const str = String(val).trim();
  if (
    !str ||
    str === 'Tümü' ||
    str === 'Tüm Ödeme Tipleri' ||
    str === 'Seçiniz' ||
    str === 'Hepsi'
  ) {
    return undefined;
  }
  return str;
}

export interface KotasyonAramaValues {
  tasimaTipi?: string;
  ticariTipi?: string;
  yuklemeTipi?: string;
  kotasyonKullanimi?: string;
  hat?: string;
  lineRID?: string;
  lineRid?: string;
  hatRID?: string;
  hatRid?: string;
  odemeTipi?: string;
  payment?: string;
  konteynerTipi?: string;
  containerTypeRIDs?: string[];
  dolumTipi?: string;
  fillingType?: string;
  tehlikelilikDurumu?: string;
  flammability?: string;
  yukleyici?: string;
  loaderRID?: string;
  loaderRid?: string;
  customerRID?: string;
  customerRid?: string;
  customerName?: string;
  yuklemeYeri?: string;
  loadingLocationRID?: string;
  loadingLocationRid?: string;
  yuklemeLimani?: string;
  loadingPortRID?: string;
  loadingPortRid?: string;
  teslimYeri?: string;
  dischargeLocationRID?: string;
  dischargeLocationRid?: string;
  teslimLimani?: string;
  dischargePortRID?: string;
  dischargePortRid?: string;
}

export interface KotasyonAramaProps {
  initialValues?: KotasyonAramaValues;
  onClose: () => void;
  onBack?: () => void;
  onSubmit?: (
    values: KotasyonAramaValues,
    selectedQuotations?: QuotationForCreateOfferModel[]
  ) => void;
}

// Option interface for lookup items with RIDs
export interface OptionItem {
  id: string;
  name: string;
  shortName?: string;
  kdv?: string | number;
}

export const SABIT_ODEME_TIPI_OPTIONS: OptionItem[] = [
  { id: 'Tüm Ödeme Tipleri', name: 'Tüm Ödeme Tipleri' },
  { id: 'Prepaid', name: 'Prepaid' },
  { id: 'Collect', name: 'Collect' },
];

export const SABIT_DOLUM_TIPI_OPTIONS: OptionItem[] = [
  { id: 'Fabrika Dolum', name: 'Fabrika Dolum' },
  { id: 'Liman Dolum', name: 'Liman Dolum' },
  { id: 'Depo Dolum', name: 'Depo Dolum' },
];

export const SABIT_TEHLIKELILIK_OPTIONS: OptionItem[] = [
  { id: 'Yanıcılı', name: 'Yanıcılı' },
  { id: 'Yanıcısız', name: 'Yanıcısız' },
];

// Container options corresponding directly to Teklif Oluşturma (teklif-olusturma.tsx)
const TEKLIF_KARAYOLU_CONTAINERS: OptionItem[] = [
  { id: 'cnt-k1', name: 'Box Konteyner', shortName: 'Box' },
  { id: 'cnt-k2', name: 'Box Trailer', shortName: 'Box Tr.' },
  { id: 'cnt-k3', name: 'Damperli', shortName: 'Damperli' },
  { id: 'cnt-k4', name: 'ISO Tank Carrier', shortName: 'ISO Tank' },
  { id: 'cnt-k5', name: 'Lowbed (Alçak Yataklı)', shortName: 'Lowbed' },
  { id: 'cnt-k6', name: 'Jumbo', shortName: 'Jumbo' },
  { id: 'cnt-k7', name: 'Jumbo Açık', shortName: 'Jumbo Açık' },
  { id: 'cnt-k8', name: 'Normal Açık', shortName: 'Normal Açık' },
  { id: 'cnt-k9', name: 'Tenteli', shortName: 'Tenteli' },
  { id: 'cnt-k10', name: 'Tenteli Maxima', shortName: 'Maxima' },
  { id: 'cnt-k11', name: 'Tenteli Optima', shortName: 'Optima' },
  { id: 'cnt-k12', name: 'Tenteli Mega', shortName: 'Mega' },
  { id: 'cnt-k13', name: 'Treylerli Jumbo', shortName: 'Tr. Jumbo' },
  { id: 'cnt-k14', name: 'Treylerli Optima', shortName: 'Tr. Optima' },
];

const TEKLIF_HAVAYOLU_CONTAINERS: OptionItem[] = [
  { id: 'cnt-h1', name: 'Uçak', shortName: 'Uçak' },
];

const TEKLIF_STANDARD_CONTAINERS: OptionItem[] = [
  { id: 'cnt-s1', name: "20' Standard Dry", shortName: "20' ST" },
  { id: 'cnt-s2', name: "20 Reefer", shortName: "20' RF" },
  { id: 'cnt-s3', name: "20 Iso Tank", shortName: "20' Tank" },
  { id: 'cnt-s4', name: "20 Open Top", shortName: "20' OT" },
  { id: 'cnt-s5', name: "20 Pallet Wide", shortName: "20' PW" },
  { id: 'cnt-s6', name: "20 flat rack", shortName: "20' FR" },
  { id: 'cnt-s7', name: "20 flate rack open top", shortName: "20' FRO" },
  { id: 'cnt-s8', name: "20 Open Top (Out of Gauge)", shortName: "20' OOG OT" },
  { id: 'cnt-s9', name: "40 Standard Dry", shortName: "40' ST" },
  { id: 'cnt-s10', name: "40 High Cube", shortName: "40' HC" },
  { id: 'cnt-s11', name: "40 Platform", shortName: "40' Platform" },
  { id: 'cnt-s12', name: "40 Flat Rack", shortName: "40' FR" },
  { id: 'cnt-s13', name: "40 Iso Tank", shortName: "40' Tank" },
  { id: 'cnt-s14', name: "40 Reefer", shortName: "40' Reefer" },
  { id: 'cnt-s15', name: "40 Reefer High Cube", shortName: "40' Reefer HC" },
  { id: 'cnt-s16', name: "40 Open Top", shortName: "40' OT" },
  { id: 'cnt-s17', name: "40 Open Top (SOC)", shortName: "40' SOC OT" },
  { id: 'cnt-s18', name: "40 Pallet Wide", shortName: "40' PW" },
  { id: 'cnt-s19', name: "40 High Cube Pallet Wide", shortName: "40' HC PW" },
  { id: 'cnt-s20', name: "40 Open Top (Out of Gauge)", shortName: "40' OOG OT" },
  { id: 'cnt-s21', name: "45 High Cube", shortName: "45' HC" },
  { id: 'cnt-s22', name: "45 High Cube Open Top", shortName: "45' HC OT" },
  { id: 'cnt-s23', name: "45 High Cube (SOC)", shortName: "45' SOC HC" },
  { id: 'cnt-s24', name: "45 Reefer High Cube", shortName: "45' HC RF" },
  { id: 'cnt-s25', name: "45 Reefer High Cube (SOC)", shortName: "45' SOC HC RF" },
  { id: 'cnt-s26', name: "45 Pallet Wide", shortName: "45' PW" },
  { id: 'cnt-s27', name: "45 High Cube Pallet Wide", shortName: "45' HC PW" },
  { id: 'cnt-s28', name: "45 Open Top (Out of Gauge)", shortName: "45' OOG OT" },
  { id: 'cnt-s29', name: "45 High Cube Open Top (SOC)", shortName: "45' SOC HC OT" },
  { id: 'cnt-s30', name: "45 Flat Rack", shortName: "45' FR" },
  { id: 'cnt-s31', name: "45 High Cube Flat Rack", shortName: "45' HC FR" },
  { id: 'cnt-s32', name: "20' Standard Dry (SOC)", shortName: "20' SOC ST" },
  { id: 'cnt-s33', name: "20' Open Top (SOC)", shortName: "20' SOC OT" },
  { id: 'cnt-s34', name: "40' Standart Dry (SOC)", shortName: "40' SOC ST" },
  { id: 'cnt-s35', name: "40' High Cube (SOC)", shortName: "40' SOC HC" },
  { id: 'cnt-s36', name: "42.5 NIPPON OT", shortName: "42.5 NIPPON OT" },
  { id: 'cnt-s37', name: "22.5 NIPPON OT", shortName: "22.5 NIPPON OT" },
  { id: 'cnt-s38', name: "20' Standart Dry (2box)", shortName: "20' (2box)" },
];

function getContainersForTransportType(tasimaTipi?: string): OptionItem[] {
  if (!tasimaTipi) return TEKLIF_STANDARD_CONTAINERS;
  const lower = tasimaTipi.toLowerCase();
  if (lower.includes('karayolu') || lower.includes('road')) {
    return TEKLIF_KARAYOLU_CONTAINERS;
  }
  if (lower.includes('havayolu') || lower.includes('air')) {
    return TEKLIF_HAVAYOLU_CONTAINERS;
  }
  return TEKLIF_STANDARD_CONTAINERS;
}

function parseDecimalValue(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function normalizeOptionItem(item: any): OptionItem {
  if (!item) return { id: '', name: '' };
  if (typeof item === 'string') return { id: item, name: item };
  if (typeof item === 'number') return { id: String(item), name: String(item) };

  // Normalize item keys to lowercase
  const norm = normalizeKeysDeep<Record<string, any>>(item);

  // Extract ID (Prioritize GUID/RID fields over numeric id)
  const id =
    ciGet(
      norm,
      'rid',
      'expenserid',
      'expense_rid',
      'expensetyperid',
      'expensetype_rid',
      'costrid',
      'containerrid',
      'container_rid',
      'containertype_rid',
      'containertypeid',
      'linerid',
      'locationrid',
      'cityrid',
      'portrid',
      'loaderrid',
      'customerrid',
      'id',
      'value',
      'val',
      'code'
    ) || String(Math.random());

  // Extract Base Name (Prioritize hatadi, linename, customername, loadername, unvan, text, name, label)
  let baseName = ciGet(
    norm,
    'expensename',
    'expense_name',
    'expensetype',
    'expense_type',
    'optionlabel',
    'optionname',
    'masraf',
    'masrafadi',
    'masraf_adi',
    'masrafing',
    'containertype',
    'containertypeshort',
    'container_type',
    'containername',
    'containertypename',
    'hatadi',
    'hat_adi',
    'hatname',
    'hat_name',
    'linename',
    'line_name',
    'airlinename',
    'airline_name',
    'customername',
    'customer_name',
    'loadername',
    'loader_name',
    'unvan',
    'text',
    'name',
    'label',
    'title',
    'text2',
    'display',
    'displayname',
    'locationname',
    'location_name',
    'cityname',
    'city_name',
    'portname',
    'port_name',
    'description',
    'descr'
  );

  // Smart Fallback: If baseName is missing, identical to id, or is just a pure short number like "102"
  if (!baseName || String(baseName) === String(id) || (/^\d+$/.test(String(baseName).trim()) && String(baseName).trim().length < 6)) {
    const stringEntries = Object.entries(norm).filter(
      ([k, v]) =>
        typeof v === 'string' &&
        v.trim() !== '' &&
        String(v) !== String(id) &&
        !/^\d+$/.test(v.trim())
    );

    if (stringEntries.length > 0) {
      const preferred =
        stringEntries.find(([k]) =>
          /hat|linename|customername|loadername|unvan|name|text|label|title|city|port|line|location|desc/i.test(k)
        ) || stringEntries[0];

      baseName = preferred[1];
    }
  }

  const rawName = baseName !== undefined && baseName !== null && String(baseName).trim() !== ''
    ? String(baseName).trim()
    : String(id);

  // Format matching screenshot: "CityName, RegionName, CountryName (Code)" (e.g. Ernee, Mayenne, France (FREEE))
  const regionName = ciGet(norm, 'regionname', 'state');
  const countryName = ciGet(norm, 'countryname', 'country');
  const countryCode = ciGet(norm, 'countrycode', 'country_code');
  const rawRegionCode = ciGet(norm, 'regioncode', 'citycode', 'portcode', 'shortname', 'shortName');
  const unlocode = ciGet(norm, 'unlocode', 'uncode', 'locode', 'fullcode');

  // Build the 5-letter UN/LOCODE (e.g. FR + EEE => FREEE, RO + ERN => ROERN, DE + EN8 => DEEN8)
  let fullCode = unlocode ? String(unlocode).trim() : '';
  if (!fullCode && countryCode && rawRegionCode) {
    const cCode = String(countryCode).trim();
    const rCode = String(rawRegionCode).trim();
    if (rCode.toLowerCase().startsWith(cCode.toLowerCase())) {
      fullCode = rCode.toUpperCase();
    } else {
      fullCode = `${cCode}${rCode}`.toUpperCase();
    }
  } else if (!fullCode && rawRegionCode) {
    fullCode = String(rawRegionCode).trim().toUpperCase();
  }

  // Clear fullCode if it is a pure numeric database ID (e.g. "102") to avoid showing numbers in parentheses
  if (fullCode && /^\d+$/.test(fullCode)) {
    fullCode = '';
  }

  let nameParts: string[] = [rawName];
  if (regionName && String(regionName).trim() !== '' && String(regionName).trim() !== rawName) {
    nameParts.push(String(regionName).trim());
  }
  if (countryName && String(countryName).trim() !== '' && String(countryName).trim() !== rawName) {
    nameParts.push(String(countryName).trim());
  }

  let displayName = nameParts.join(', ');
  if (fullCode && String(fullCode).trim() !== '' && String(fullCode).trim() !== rawName) {
    displayName += ` (${String(fullCode).trim()})`;
  }

  const kdvVal = ciGet(norm, 'kdv', 'expensekdv', 'vat', 'tax');

  return {
    id: String(id),
    name: displayName,
    shortName: fullCode ? String(fullCode) : undefined,
    kdv: kdvVal !== undefined ? String(kdvVal) : undefined,
  };
}

// Global In-Memory Port Cache to eliminate 10-second network re-downloads on every keystroke
let globalPortCache: OptionItem[] | null = null;
let globalPortCachePromise: Promise<OptionItem[]> | null = null;

export async function getOrFetchAllPorts(baseUrl: string, token: string): Promise<OptionItem[]> {
  if (globalPortCache && globalPortCache.length > 0) {
    return globalPortCache;
  }
  if (globalPortCachePromise) {
    return globalPortCachePromise;
  }

  globalPortCachePromise = (async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      };
      if (token) {
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }
      console.log(`[PORT CACHE] Limanlar indiriliyor: ${baseUrl}/Port/GetPortForGrid`);
      const res = await fetch(`${baseUrl}/Port/GetPortForGrid`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ CONTYPE: 'MSSQL' }),
      });
      if (res && res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data)
          ? data
          : data?.data || data?.result || data?.items || [];
        if (Array.isArray(arr) && arr.length > 0) {
          const normalized = arr.map(normalizeOptionItem).filter((opt) => opt.name && opt.name.trim() !== '');
          globalPortCache = normalized;
          console.log(`[PORT CACHE] ${normalized.length} liman hafızaya yazıldı. Aramalar artık 0ms sürecek.`);
          return normalized;
        }
      }
    } catch (err: any) {
      console.log('[PORT CACHE] Liman indirme hatası:', err?.message);
    } finally {
      globalPortCachePromise = null;
    }
    return [];
  })();

  return globalPortCachePromise;
}

export let globalContainerMap: Record<string, string> = {};

async function prefetchRealContainerRIDs(baseUrl: string, token: string): Promise<Record<string, string>> {
  if (Object.keys(globalContainerMap).length > 0) return globalContainerMap;
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    const queries = ['a', 'e', 'o', '20', '40', '45', 'reefer', 'open', 'flat', 'tank', 'high', 'iso', 'pallet'];
    for (const q of queries) {
      const res = await fetch(`${baseUrl}/Select2/GetValueForContainerSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(q)}`, {
        method: 'GET',
        headers,
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            const rid = item.rid || item.RID || item.containerrid || item.id;
            const name = item.containername || item.name || item.text;
            if (isGuid(rid) && name) {
              globalContainerMap[String(name).trim().toLowerCase()] = String(rid).trim();
            }
          }
        }
      }
    }
    console.log(`[CONTAINER PREFETCH] ${Object.keys(globalContainerMap).length} adet konteyner tipi gerçek veritabanı GUID'i ile eşleşti.`);
  } catch (err: any) {
    console.log('[CONTAINER PREFETCH] Container RIDs fetch error:', err?.message);
  }
  return globalContainerMap;
}

async function resolveContainerRid(
  item: OptionItem,
  baseUrl: string,
  token: string
): Promise<string | undefined> {
  // 1) Zaten GUID ise
  if (isGuid(item.id)) return item.id.trim();

  // 2) Cache
  const nameKey = (item.name || '').trim().toLowerCase();
  const shortKey = (item.shortName || '').trim().toLowerCase();
  if (globalContainerMap[nameKey]) return globalContainerMap[nameKey];
  if (shortKey && globalContainerMap[shortKey]) return globalContainerMap[shortKey];

  // 3) Select2 ile isimden ara
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  // Arama kelimeleri: "20' Standard Dry" → "20 Standard", "20", "Standard Dry"
  const searchTerms = [
    item.name.replace(/['"]/g, ' ').replace(/\s+/g, ' ').trim(),
    item.shortName || '',
    (item.name.match(/\d+/) || [])[0] || '', // "20" / "40" / "45"
    item.name.split(/\s+/).slice(0, 2).join(' '),
  ].filter(Boolean);

  for (const term of searchTerms) {
    try {
      const url = `${baseUrl}/Select2/GetValueForContainerSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(term)}`;
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) continue;
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data?.results || data?.data || [];

      for (const row of arr) {
        const rid = row.rid || row.RID || row.containerrid || row.id;
        const cname = String(
          row.containername || row.containertype || row.name || row.text || ''
        ).trim();
        const cnameLower = cname.toLowerCase();

        if (!isGuid(rid)) continue;

        // Cache'e yaz
        if (cname) globalContainerMap[cnameLower] = String(rid);

        // Eşleşme: tam ad, shortName veya "20" + "standard"/"dry"
        const target = nameKey.replace(/['"]/g, '');
        const candidate = cnameLower.replace(/['"]/g, '');
        if (
          candidate === target ||
          candidate.includes(target) ||
          target.includes(candidate) ||
          (shortKey && candidate.includes(shortKey.replace(/'/g, ''))) ||
          (/\b20\b/.test(target) && /\b20\b/.test(candidate) && /standard|dry|st\b/i.test(candidate))
        ) {
          console.log('[CONTAINER RESOLVED]', item.name, '→', rid, cname);
          return String(rid);
        }
      }
    } catch (e) {
      console.log('[CONTAINER RESOLVE ERR]', term, e);
    }
  }

  console.log('[CONTAINER MAP MISS FINAL]', item.name, item.id);
  return undefined;
}

function filterOptionsLocally(options: OptionItem[], cleanQuery: string): OptionItem[] {
  if (!cleanQuery) return options.slice(0, 100);

  const q = cleanQuery.toLowerCase();
  const rank0: OptionItem[] = [];
  const rank1: OptionItem[] = [];
  const rank2: OptionItem[] = [];

  for (let i = 0; i < options.length; i++) {
    const item = options[i];
    const nameLower = item.name.toLowerCase();
    const codeLower = (item.shortName || '').toLowerCase();

    if (nameLower.startsWith(q) || codeLower.startsWith(q)) {
      rank0.push(item);
      if (rank0.length >= 100) break;
    } else {
      const words = `${nameLower} ${codeLower}`.split(/[\s,()/-]+/);
      if (words.some((w) => w.startsWith(q))) {
        rank1.push(item);
      } else if (nameLower.includes(q) || codeLower.includes(q)) {
        rank2.push(item);
      }
    }
  }

  const matches = [...rank0, ...rank1, ...rank2];
  return matches.slice(0, 100);
}

// Live API Search Helper for Hat, Places (Locations), Ports
async function fetchSearchOptionsFromApi(
  type: 'hat' | 'location' | 'port' | 'loader' | 'filling' | 'payment' | 'flammability' | 'expense',
  query: string,
  baseUrl: string,
  token: string
): Promise<OptionItem[]> {
  const cleanQuery = (query || '').trim();

  // Instant local memory filter for Ports and Locations (Yükleme Yeri, Teslim Yeri, Yükleme Limanı, Teslim Limanı)
  if (type === 'port' || type === 'location') {
    const allLocations = await getOrFetchAllPorts(baseUrl, token);
    if (allLocations && allLocations.length > 0) {
      console.log(`[LOCATION/PORT CACHE MATCH] type=${type}, "${cleanQuery}" araması yerel hafızadan anında süzüldü.`);
      return filterOptionsLocally(allLocations, cleanQuery);
    }
  }

  const searchVal = cleanQuery || '%';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;
  }

  const endpointsMap: Record<string, { url: string; method: 'GET' | 'POST'; body?: any }[]> = {
    hat: [
      { url: `/Select2/GetValueForLineSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
      { url: `/Select2/GetValueForAirLineSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
    ],
    location: [
      { url: `/Select2/GetValueForCitySelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
      { url: `/Select2/GetValueForRegionSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
    ],
    port: [
      { url: '/Port/GetPortForGrid', method: 'POST', body: { SEARCHTEXT: cleanQuery, QUERY: cleanQuery, CONTYPE: 'MSSQL' } },
      { url: `/Select2/GetValueForCitySelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
    ],
    loader: [
      { url: `/Select2/GetValueForCoLoaderSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
      { url: `/Select2/GetValueForCustomerSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
      { url: '/Customer/GetCustomerForGridN', method: 'POST', body: { SEARCHTEXT: cleanQuery, QUERY: cleanQuery, CONTYPE: 'MSSQL' } },
      { url: `/Select2/GetValueForTransporterSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
    ],
    expense: [
      { url: `/Select2/GetValueForExpenseSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
      { url: `/Select2/GetValueForExpenseTypeSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
      { url: `/Select2/GetValueForCostSelect2Search?SELECT2SEARCHVAL=${encodeURIComponent(searchVal)}`, method: 'GET' },
      { url: '/Offer/GetExpenseTypes', method: 'POST' },
    ],
    filling: [{ url: '/Offer/GetFillingTypes', method: 'POST' }],
    payment: [{ url: '/Offer/GetPaymentTypes', method: 'POST' }],
    flammability: [{ url: '/Offer/GetFlammabilityTypes', method: 'POST' }],
  };

  const candidateEndpoints = endpointsMap[type] || [{ url: `/Offer/Get${type}`, method: 'POST' }];

  console.log(`[SEARCH DEBUG] type=${type}, query="${cleanQuery}", baseUrl=${baseUrl}`);

  for (const ep of candidateEndpoints) {
    try {
      const fullUrl = `${baseUrl}${ep.url}`;
      console.log(`[SEARCH DEBUG] Fetching (${ep.method}): ${fullUrl}`);

      const res = await fetch(
        fullUrl,
        ep.method === 'GET'
          ? { method: 'GET', headers }
          : {
            method: 'POST',
            headers,
            body: JSON.stringify(
              ep.body || {
                SEARCHTEXT: cleanQuery,
                QUERY: cleanQuery,
                KEYWORD: cleanQuery,
                CONTYPE: 'MSSQL',
              }
            ),
          }
      ).catch((fetchErr) => {
        console.log(`[SEARCH DEBUG] fetch patladı (${ep.url}):`, fetchErr?.message);
        return null;
      });

      console.log(`[SEARCH DEBUG] ${ep.url} => res var mı: ${!!res}, status: ${res?.status}`);

      if (res && res.ok) {
        const data = await res.json();
        let arr = Array.isArray(data)
          ? data
          : data?.data || data?.result || data?.items || data?.results || [];
        console.log(`[SEARCH DEBUG] ${ep.url} => raw arr.length: ${Array.isArray(arr) ? arr.length : 'NOT_ARRAY'}`);
        if (Array.isArray(arr) && arr.length > 0) {
          // Client-side filtering & starts-with ranking: prioritize items starting with search query (e.g. "er" -> Ernee, Ernei, Ersen)
          if (cleanQuery) {
            const q = cleanQuery.toLowerCase();

            // Rank 0: Name or Code STARTS WITH query (e.g. "Ernee" starts with "er")
            // Rank 1: Any word in Name/Code STARTS WITH query (e.g. "Port of Ernee")
            // Rank 2: Contains query anywhere
            const scoredItems: { item: any; rank: number }[] = [];
            let rank0Count = 0;

            for (const rawItem of arr) {
              if (!rawItem) continue;
              const normItem = normalizeOptionItem(rawItem);
              const nameLower = normItem.name.toLowerCase();
              const codeLower = (normItem.shortName || '').toLowerCase();
              const extraText = `${rawItem.portname || ''} ${rawItem.description || ''} ${rawItem.cityname || ''} ${rawItem.countryname || ''}`.toLowerCase();

              let rank = -1;

              if (nameLower.startsWith(q) || codeLower.startsWith(q)) {
                rank = 0;
                rank0Count++;
              } else {
                const words = `${nameLower} ${codeLower}`.split(/[\s,()/-]+/);
                if (words.some((w) => w.startsWith(q))) {
                  rank = 1;
                } else if (nameLower.includes(q) || codeLower.includes(q) || extraText.includes(q)) {
                  rank = 2;
                }
              }

              if (rank !== -1) {
                scoredItems.push({ item: rawItem, rank });
                if (rank0Count >= 100) break; // Early exit if we already have 100 top matches
              }
            }

            if (scoredItems.length > 0) {
              // Filter & Sort: Prioritize starts-with (rank 0 & 1) over simple contains (rank 2)
              const startsWithMatches = scoredItems.filter((s) => s.rank === 0 || s.rank === 1);
              if (startsWithMatches.length > 0) {
                startsWithMatches.sort((a, b) => a.rank - b.rank);
                arr = startsWithMatches.map((s) => s.item);
              } else {
                scoredItems.sort((a, b) => a.rank - b.rank);
                arr = scoredItems.map((s) => s.item);
              }
            }
          }

          // Slice top 100 items to avoid freezing React Native UI
          const slicedArr = arr.slice(0, 100);
          return slicedArr.map(normalizeOptionItem).filter((opt: OptionItem) => opt.name && opt.name.trim() !== '');
        }
      } else if (res) {
        const errorText = await res.text();
        console.log(`[SEARCH DEBUG FULL ERROR] ${ep.url} => HTTP ${res.status}, body: ${errorText}`);
      }
    } catch (e: any) {
      console.log(`[SEARCH DEBUG] API search error on ${ep.url}:`, e?.message);
    }
  }

  console.log(`[SEARCH DEBUG] Tüm endpointler denendi, sonuç YOK. type=${type}, query="${cleanQuery}"`);
  if (type === 'expense') {
    const defaultExpenses = [
      'DENİZYOLU NAVLUN ÜCRETİ',
      'EMİSYON TİCARET SİSTEMİ',
      'EMERGENCY FUEL SURCHARGE',
      'ORDİNO ÜCRETİ',
      'LİMAN HİZMETLERİ (THC)',
      'LİMAN İŞGAL / ARDİYE / DEMURAJ',
      'GÜMRÜKLEME ÜCRETİ',
      'İÇ TAŞIMA ÜCRETİ',
      'MÜHÜR ÜCRETİ (SEAL CHARGE)',
      'ISPS ÜCRETİ',
      'DÖKÜMANTASYON ÜCRETİ',
      'VGM TARTIM ÜCRETİ',
    ];
    const filtered = defaultExpenses.filter((item) =>
      item.toLowerCase().includes(cleanQuery.toLowerCase())
    );

    const resultItems: OptionItem[] = filtered.map((item) => ({
      id: item,
      name: item,
      shortName: 'EXPENSE',
    }));

    if (cleanQuery && !filtered.some((f) => f.toLowerCase() === cleanQuery.toLowerCase())) {
      resultItems.unshift({
        id: cleanQuery,
        name: cleanQuery.toUpperCase(),
        shortName: 'CUSTOM',
      });
    }
    return resultItems;
  }

  return [];
}

function mapQuotationExpense(raw: any, line?: string, customer?: string) {
  const norm = normalizeKeysDeep(raw);
  return {
    id: norm.expenserid || `exp_${Date.now()}_${Math.random()}`,
    allIn: 'Hayır',
    masrafTipi: String(norm.expensetype || norm.expensedescription || norm.optionlabel || norm.optionname || norm.type || 'EK MASRAF').toUpperCase(),
    kdv: String(norm.kdv ?? '0'),
    miktar: '1',
    alisFiyati: String(norm.buyingcost ?? norm.containerextendedcost ?? norm.containercost ?? '0.00'),
    alisDoviz: String(norm.currency || 'EUR'),
    alisTarafi: String(norm.buyingcustomer || line || ''),
    satisFiyati: '',
    satisDoviz: (norm.currency || 'EUR') === 'EUR' ? 'EURO' : String(norm.currency || 'EUR'),
    beher: String(norm.beher || 'CNT'),
    satisTarafi: customer || '',
  };
}

export function KotasyonAramaScreen({
  initialValues,
  onClose,
  onBack,
  onSubmit,
}: KotasyonAramaProps) {
  const theme = useTheme();
  const responsive = useResponsive();
  const isMobilePortrait = responsive.isMobile && !responsive.isLandscape;
  const insets = useSafeAreaInsets();
  const authContext = useAuth();
  const { user, token, apiUrl: contextApiUrl } = authContext || {};
  const authToken = token || user?.TOKEN || user?.token || '';
  const activeBaseUrl = (contextApiUrl || DEFAULT_API_URL).trim().replace(/\/$/, '');

  const tasimaTipi = initialValues?.tasimaTipi || 'Denizyolu';
  const ticariTipi = initialValues?.ticariTipi || 'İhracat';
  const yuklemeTipi = initialValues?.yuklemeTipi || 'FCL';

  // Container options sourced from API (/ContainerTypes/GetContainerForGridN) with static fallback
  const staticContainerOptions = getContainersForTransportType(tasimaTipi);
  const [apiContainerOptions, setApiContainerOptions] = useState<OptionItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchContainerTypes = async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json; charset=utf-8',
          Accept: 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = authToken.startsWith('Bearer ')
            ? authToken
            : `Bearer ${authToken}`;
        }
        const res = await fetch(`${activeBaseUrl}/ContainerTypes/GetContainerForGridN`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ CONTYPE: 'MSSQL' }),
        }).catch(() => null);

        if (res && res.ok && isMounted) {
          const data = await res.json();
          const arr = Array.isArray(data) ? data : data?.data || data?.result || data?.items || [];
          if (Array.isArray(arr) && arr.length > 0) {
            arr.forEach((item: any) => {
              const cRid = item.containerrid || item.CONTAINERRID || item.rid || item.RID || item.id;
              const cName = item.containertype || item.CONTAINERTYPE || item.name || item.text;
              const cShort = item.containertypeshort || item.CONTAINERTYPESHORT || item.shortname;
              if (cRid && cName) {
                globalContainerMap[String(cName).trim().toLowerCase()] = String(cRid).trim();
              }
              if (cRid && cShort) {
                globalContainerMap[String(cShort).trim().toLowerCase()] = String(cRid).trim();
              }
            });
            const mapped = arr.map(normalizeOptionItem).filter((opt) => opt.id && opt.name);
            if (mapped.length > 0) {
              setApiContainerOptions(mapped);
            }
          }
        }
      } catch (e) {
        console.log('ContainerTypes fetch error:', e);
      }
    };

    fetchContainerTypes();
    return () => {
      isMounted = false;
    };
  }, [activeBaseUrl, authToken]);

  const availableContainerOptions = apiContainerOptions.length > 0 ? apiContainerOptions : staticContainerOptions;

  // Form selection states (IDs and Names)
  const [selectedHat, setSelectedHat] = useState<OptionItem | null>(() => {
    const rid =
      initialValues?.lineRID ||
      initialValues?.lineRid ||
      initialValues?.hatRID ||
      initialValues?.hatRid ||
      '';
    const name = initialValues?.hat || '';
    if (rid || name) {
      return {
        id: rid,
        name: name,
      };
    }
    return null;
  });

  const [selectedOdemeTipi, setSelectedOdemeTipi] = useState<OptionItem | null>(() => {
    if (initialValues?.payment || initialValues?.odemeTipi) {
      return {
        id: initialValues.payment || '',
        name: initialValues.odemeTipi || initialValues.payment || '',
      };
    }
    return null;
  });

  const [selectedContainerTypes, setSelectedContainerTypes] = useState<OptionItem[]>(() => {
    if (initialValues?.containerTypeRIDs && initialValues.containerTypeRIDs.length > 0) {
      return availableContainerOptions.filter((c) =>
        initialValues.containerTypeRIDs?.includes(c.id)
      );
    }
    return [];
  });

  useEffect(() => {
    if (apiContainerOptions.length > 0) {
      setSelectedContainerTypes((prev) => {
        if (prev.length === 0) {
          if (initialValues?.containerTypeRIDs && initialValues.containerTypeRIDs.length > 0) {
            return apiContainerOptions.filter((c) =>
              initialValues.containerTypeRIDs?.includes(c.id)
            );
          }
          if (initialValues?.konteynerTipi) {
            const names = initialValues.konteynerTipi.split(',').map((s) => s.trim().toLowerCase());
            return apiContainerOptions.filter((c) =>
              names.includes(c.name.trim().toLowerCase()) ||
              (c.shortName && names.includes(c.shortName.trim().toLowerCase()))
            );
          }
          return [];
        } else {
          return prev.map((item) => {
            if (cleanGuidOrUndefined(item.id)) return item;
            const match = apiContainerOptions.find(
              (apiOpt) =>
                apiOpt.name.toLowerCase() === item.name.toLowerCase() ||
                (apiOpt.shortName && item.shortName && apiOpt.shortName.toLowerCase() === item.shortName.toLowerCase())
            );
            return match || item;
          });
        }
      });
    }
  }, [apiContainerOptions, initialValues]);

  const [selectedDolumTipi, setSelectedDolumTipi] = useState<OptionItem | null>(() => {
    if (initialValues?.fillingType || initialValues?.dolumTipi) {
      return {
        id: initialValues.fillingType || '',
        name: initialValues.dolumTipi || initialValues.fillingType || '',
      };
    }
    return null;
  });

  const [selectedTehlikelilik, setSelectedTehlikelilik] = useState<OptionItem | null>(() => {
    if (initialValues?.flammability || initialValues?.tehlikelilikDurumu) {
      return {
        id: initialValues.flammability || '',
        name: initialValues.tehlikelilikDurumu || initialValues.flammability || '',
      };
    }
    return null;
  });

  const [selectedYukleyici, setSelectedYukleyici] = useState<OptionItem | null>(() => {
    const rid =
      initialValues?.loaderRID ||
      initialValues?.customerRID ||
      initialValues?.customerRid ||
      (initialValues as any)?.customerrid ||
      '';
    const name =
      initialValues?.yukleyici ||
      initialValues?.customerName ||
      (initialValues as any)?.customername ||
      (initialValues as any)?.unvan ||
      '';
    if (rid || name) {
      return {
        id: rid,
        name: name,
      };
    }
    return null;
  });

  const [selectedYuklemeYeri, setSelectedYuklemeYeri] = useState<OptionItem | null>(() => {
    if (initialValues?.loadingLocationRID || initialValues?.yuklemeYeri) {
      return {
        id: initialValues.loadingLocationRID || '',
        name: initialValues.yuklemeYeri || '',
      };
    }
    return null;
  });

  const [selectedYuklemeLimani, setSelectedYuklemeLimani] = useState<OptionItem | null>(() => {
    if (initialValues?.loadingPortRID || initialValues?.yuklemeLimani) {
      return {
        id: initialValues.loadingPortRID || '',
        name: initialValues.yuklemeLimani || '',
      };
    }
    return null;
  });

  const [selectedTeslimYeri, setSelectedTeslimYeri] = useState<OptionItem | null>(() => {
    if (initialValues?.dischargeLocationRID || initialValues?.teslimYeri) {
      return {
        id: initialValues.dischargeLocationRID || '',
        name: initialValues.teslimYeri || '',
      };
    }
    return null;
  });

  const [selectedTeslimLimani, setSelectedTeslimLimani] = useState<OptionItem | null>(() => {
    if (initialValues?.dischargePortRID || initialValues?.teslimLimani) {
      return {
        id: initialValues.dischargePortRID || '',
        name: initialValues.teslimLimani || '',
      };
    }
    return null;
  });

  // Search Results & Loading States
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  // Search Results Data
  const [containerHeaders, setContainerHeaders] = useState<QuotationContainerHeaderModel[]>([]);
  const [quotationResults, setQuotationResults] = useState<QuotationForCreateOfferModel[]>([]);
  const [extendedExpensesMap, setExtendedExpensesMap] = useState<
    Record<string, QuotationContainerExtendedExpenseModel[]>
  >({});
  const [landShippingSelections, setLandShippingSelections] = useState<
    Record<string, string>
  >({});

  // UI state for filter checkbox
  const [onlySelectableFilter, setOnlySelectableFilter] = useState<boolean>(false);
  const [selectedQuotationRIDs, setSelectedQuotationRIDs] = useState<string[]>([]);
  const [activeNoteModal, setActiveNoteModal] = useState<{ title: string; text: string } | null>(null);
  const [activeReasonModal, setActiveReasonModal] = useState<{ title: string; text: string } | null>(null);
  const [viewQuotationModal, setViewQuotationModal] = useState<QuotationForCreateOfferModel | null>(null);

  // Fetch live quotation detail info via GetQuotationDetailWithRid whenever detail modal opens
  useEffect(() => {
    if (!viewQuotationModal?.quotationrid) return;

    const qRid = viewQuotationModal.quotationrid;
    let cancelled = false;

    const fetchDetail = async () => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = authToken.startsWith('Bearer ')
          ? authToken
          : `Bearer ${authToken}`;
      }

      const customerRID =
        cleanGuidOrUndefined(initialValues?.customerRID) ||
        cleanGuidOrUndefined(initialValues?.customerRid) ||
        cleanGuidOrUndefined(selectedYukleyici?.id) ||
        cleanGuidOrUndefined((viewQuotationModal as any).customerrid);

      const loaderRID =
        cleanGuidOrUndefined(selectedYukleyici?.id) ||
        cleanGuidOrUndefined(initialValues?.loaderRID) ||
        customerRID;

      const locationRID =
        cleanGuidOrUndefined(selectedYuklemeYeri?.id) ||
        cleanGuidOrUndefined((viewQuotationModal as any).selectedloadinglocationrid) ||
        cleanGuidOrUndefined((viewQuotationModal as any).loadinglocationrid) ||
        null;

      const body: Record<string, any> = {
        QUOTATIONRID: qRid,
        CUSTOMERRID: customerRID,
        LOADERRID: loaderRID,
        CONTYPE: 'MSSQL',
      };
      if (locationRID) {
        body.SELECTEDLOADINGLOCATIONRID = locationRID;
      }

      console.log('[QUOTATION DETAIL REQ]', JSON.stringify(body));

      try {
        const res = await fetch(
          `${activeBaseUrl}/Quotation/GetQuotationDetailWithRid`,
          { method: 'POST', headers, body: JSON.stringify(body) }
        );
        if (!res.ok || cancelled) return;

        const raw = await res.json();
        const data = normalizeKeysDeep(raw);
        console.log('[QUOTATION DETAIL RES]', qRid, JSON.stringify(data).slice(0, 500));

        if (cancelled) return;

        // Modal state'ini detay ile güncelle
        setViewQuotationModal((prev) => {
          if (!prev || prev.quotationrid !== qRid) return prev;
          const extractedLinerid =
            data.linerid ||
            data.LINERID ||
            data.lineRid ||
            data.lineRID ||
            data.hatrid ||
            data.HATRID ||
            (prev as any)?.linerid ||
            (prev as any)?.LINERID;
          return {
            ...prev,
            ...data,
            linerid: extractedLinerid,
            LINERID: extractedLinerid,
            lineRid: extractedLinerid,
            lineRID: extractedLinerid,
            // expense listesini hem eski hem yeni alan adlarıyla tut
            quotationexpensedetail:
              data.quotationexpensedetail ||
              data.quotationExpenseDetail ||
              [],
            quotationcontainers:
              data.quotationcontainers ||
              data.quotationContainers ||
              [],
          } as any;
        });

        // Masraf tablosu için map'e de yaz (modal render buradan okuyorsa)
        const expenseList =
          data.quotationexpensedetail ||
          data.quotationExpenseDetail ||
          [];
        setExtendedExpensesMap((prev) => ({
          ...prev,
          [qRid]: Array.isArray(expenseList) ? expenseList : [],
        }));
      } catch (e: any) {
        console.log('[QUOTATION DETAIL ERROR]', e?.message);
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [
    viewQuotationModal?.quotationrid,
    activeBaseUrl,
    authToken,
    selectedYukleyici?.id,
    selectedYuklemeYeri?.id,
    initialValues,
  ]);

  // Multi Select Container Type Picker State
  const [showContainerPicker, setShowContainerPicker] = useState<boolean>(false);

  // Static Select Modal State (for OdemeTipi, DolumTipi, Tehlikelilik - Sabit Değerler)
  const [staticSelectState, setStaticSelectState] = useState<{
    visible: boolean;
    title: string;
    options: OptionItem[];
    selectedId?: string;
    onSelect: (item: OptionItem) => void;
  } | null>(null);

  const openStaticSelectModal = (
    title: string,
    options: OptionItem[],
    selectedId: string | undefined,
    onSelect: (item: OptionItem) => void
  ) => {
    setStaticSelectState({
      visible: true,
      title,
      options,
      selectedId,
      onSelect,
    });
  };

  // Api Select Modal State (for OdemeTipi, DolumTipi, Tehlikelilik, Yukleyici)
  const [apiSelectState, setApiSelectState] = useState<{
    visible: boolean;
    title: string;
    type: 'loader' | 'filling' | 'payment' | 'flammability';
    selectedId?: string;
    onSelect: (item: OptionItem) => void;
  } | null>(null);

  // Live Search Picker Modal State (for Hat, Locations, Ports, Loader)
  const [searchPickerState, setSearchPickerState] = useState<{
    visible: boolean;
    title: string;
    placeholder: string;
    type: 'hat' | 'location' | 'port' | 'loader';
    selectedId?: string;
    onSelect: (item: OptionItem) => void;
  } | null>(null);

  const openSearchPicker = (
    type: 'hat' | 'location' | 'port' | 'loader',
    title: string,
    placeholder: string,
    selectedId: string | undefined,
    onSelect: (item: OptionItem) => void
  ) => {
    setSearchPickerState({
      visible: true,
      title,
      placeholder,
      type,
      selectedId,
      onSelect,
    });
  };

  const openApiSelectModal = (
    type: 'loader' | 'filling' | 'payment' | 'flammability',
    title: string,
    selectedId: string | undefined,
    onSelect: (item: OptionItem) => void
  ) => {
    setApiSelectState({
      visible: true,
      title,
      type,
      selectedId,
      onSelect,
    });
  };

  useEffect(() => {
    console.log('[KOTASYON DEBUG] KotasyonAramaScreen yüklendi, activeBaseUrl:', activeBaseUrl);
    // Background prefetch all ports and container GUIDs into memory
    getOrFetchAllPorts(activeBaseUrl, authToken).catch(() => { });
    prefetchRealContainerRIDs(activeBaseUrl, authToken).catch(() => { });

    // Sync selectedYukleyici if customer parameter was passed in initialValues
    const rid =
      initialValues?.loaderRID ||
      initialValues?.customerRID ||
      initialValues?.customerRid ||
      (initialValues as any)?.customerrid ||
      '';
    const name =
      initialValues?.yukleyici ||
      initialValues?.customerName ||
      (initialValues as any)?.customername ||
      (initialValues as any)?.unvan ||
      '';
    if (rid || name) {
      setSelectedYukleyici((prev) => {
        if (!prev || (rid && prev.id !== rid) || (name && prev.name !== name)) {
          return { id: rid, name: name || 'Müşteri' };
        }
        return prev;
      });
    }
  }, [activeBaseUrl, authToken, initialValues]);

  // 1. Validation & Loader Blacklist Check
  const handleKotasyonAra = async () => {
    console.log('[KOTASYON DEBUG] handleKotasyonAra ÇAĞRILDI!');
    console.log('[KOTASYON DEBUG] Seçili Form Değerleri:', {
      dolumTipi: selectedDolumTipi,
      containerTypes: selectedContainerTypes,
      yuklemeLimani: selectedYuklemeLimani,
      yuklemeYeri: selectedYuklemeYeri,
      teslimLimani: selectedTeslimLimani,
      teslimYeri: selectedTeslimYeri,
      hat: selectedHat,
      odemeTipi: selectedOdemeTipi,
      tehlikelilik: selectedTehlikelilik,
      yukleyici: selectedYukleyici,
    });

    setErrorMessage(null);

    // Validation Check: Mandatory Fields
    const missing: string[] = [];

    if (!selectedYuklemeLimani && !selectedYuklemeYeri) {
      missing.push(
        'Yükleme limanı veya Yükleme yeri bilgilerinden en az bir tanesinin doldurulması zorunludur!'
      );
    }
    if (!selectedTeslimLimani && !selectedTeslimYeri) {
      missing.push(
        'Tahliye limanını veya Teslim yeri bilgilerinden en az bir tanesinin doldurulması zorunludur!'
      );
    }

    if (missing.length > 0) {
      console.warn('[KOTASYON DEBUG] Validation engeline takıldı (Arama yapılmadı):', missing);
      setErrorMessage(missing.join('\n'));
      return;
    }

    setIsSearching(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json; charset=utf-8',
        Accept: 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = authToken.startsWith('Bearer ')
          ? authToken
          : `Bearer ${authToken}`;
      }

      const loaderRID = cleanGuidOrUndefined(selectedYukleyici?.id) || cleanGuidOrUndefined(initialValues?.loaderRID);
      const customerRID =
        cleanGuidOrUndefined(initialValues?.customerRID) ||
        cleanGuidOrUndefined(initialValues?.customerRid) ||
        cleanGuidOrUndefined((initialValues as any)?.customerrid) ||
        cleanGuidOrUndefined(selectedYukleyici?.id);

      // Check loader blacklist if valid loader RID exists
      if (loaderRID) {
        const isBlacklisted = await checkLoaderBlacklist(
          loaderRID,
          activeBaseUrl,
          headers
        );
        if (isBlacklisted) {
          setErrorMessage('Yükleyici kara listede bulunmaktadır. Teklif oluşturulamaz!');
          setIsSearching(false);
          return;
        }
      }

      console.log('[KOTASYON DEBUG] activeBaseUrl:', activeBaseUrl);
      console.log('[KOTASYON DEBUG] selectedYuklemeLimani:', selectedYuklemeLimani);
      console.log('[KOTASYON DEBUG] selectedHat:', selectedHat);
      console.log('[KOTASYON DEBUG] selectedYuklemeYeri:', selectedYuklemeYeri);
      console.log('[KOTASYON DEBUG] selectedTeslimLimani:', selectedTeslimLimani);
      console.log('[KOTASYON DEBUG] selectedTeslimYeri:', selectedTeslimYeri);
      console.log('[KOTASYON DEBUG] selectedContainerTypes:', selectedContainerTypes);

      await prefetchRealContainerRIDs(activeBaseUrl, authToken);

      const resolvedContainerRids: string[] = [];
      for (const c of selectedContainerTypes) {
        const rid = await resolveContainerRid(c, activeBaseUrl, authToken);
        if (rid) resolvedContainerRids.push(rid);
      }

      const validContainerRIDs = resolvedContainerRids;
      const containerRIDsString = resolvedContainerRids.length > 0 ? resolvedContainerRids.join(',') : undefined;
      console.log('[CONTAINER RIDS]', containerRIDsString);

      if (selectedContainerTypes.length > 0 && !containerRIDsString) {
        console.warn('Konteyner tipi veritabanında bulunamadı:', selectedContainerTypes.map((c) => c.name));
      }

      const containerReqData = { CONTAINERRIDS: containerRIDsString, CONTYPE: 'MSSQL' };

      let containerHeaderList: QuotationContainerHeaderModel[] = [];
      const contRes = await fetch(`${activeBaseUrl}/Offer/GetQuotationsContainers`, {
        method: 'POST',
        headers,
        body: JSON.stringify(containerReqData),
      }).catch((e) => {
        console.log('[KOTASYON DEBUG] GetQuotationsContainers fetch patladı:', e.message);
        return null;
      });

      console.log('[KOTASYON DEBUG] contRes var mı?', !!contRes, 'status:', contRes?.status);

      if (contRes && contRes.ok) {
        const rawContData = await contRes.json();
        console.log('[KOTASYON DEBUG] rawContData:', rawContData);
        const normalizedContData = normalizeKeysDeep<any[]>(
          Array.isArray(rawContData) ? rawContData : rawContData?.data || rawContData?.Data || []
        );
        containerHeaderList = normalizedContData.map((item: any) => ({
          containerrid: item.containerrid || item.id,
          containertype: item.containertype || item.name,
          containertypeshort: item.containertypeshort || item.shortname || item.containertype,
        }));

        if (containerHeaderList.length === 0) {
          console.warn('[Kotasyon Arama] GetQuotationsContainers boş/tanınmayan formatta döndü:', rawContData);
        }
      }

      // Fallback container headers if API returns empty
      if (containerHeaderList.length === 0) {
        containerHeaderList = selectedContainerTypes.map((c) => ({
          containerrid: c.id,
          containertype: c.name,
          containertypeshort: c.shortName || c.name,
        }));
      }

      // Sort container headers alphabetically by containertype
      containerHeaderList.sort((a, b) =>
        (a.containertype || '').localeCompare(b.containertype || '')
      );
      setContainerHeaders(containerHeaderList);

      // Step 2: Get Quotations (/Offer/GetQuotationsForCreateOffer)
      const searchModel: QuotationForCreateOfferSearchModel & { CONTAINERRIDS?: string } = {
        LINERID: cleanGuidOrUndefined(selectedHat?.id),
        LOADINGLOCATIONRID: cleanGuidOrUndefined(selectedYuklemeYeri?.id),
        LOADINGPORTRID: cleanGuidOrUndefined(selectedYuklemeLimani?.id),
        DISCHARGEPORTRID: cleanGuidOrUndefined(selectedTeslimLimani?.id),
        DISCHARGELOCATIONRID: cleanGuidOrUndefined(selectedTeslimYeri?.id),
        CONTAINERTYPERIDS: containerRIDsString,
        CONTAINERRIDS: containerRIDsString,
        CUSTOMERRID: customerRID,
        LOADERRID: loaderRID,
        SHIPPINGTYPE: cleanStringFilterOrUndefined(tasimaTipi),
        COMMERCIALTYPE: cleanStringFilterOrUndefined(ticariTipi),
        LOADINGTYPE: cleanStringFilterOrUndefined(yuklemeTipi),
        FILLINGTYPE: cleanStringFilterOrUndefined(selectedDolumTipi?.name),
        FLAMMABILITY: cleanStringFilterOrUndefined(selectedTehlikelilik?.name),
        PAYMENT: cleanStringFilterOrUndefined(selectedOdemeTipi?.name),
        CONTYPE: 'MSSQL',
      };

      // Progressive query fallback: Try full payload first, then fallback without customer-locking and without CONTAINERTYPERIDS if 0 rows returned
      const attemptsPayloads: QuotationForCreateOfferSearchModel[] = [
        searchModel,
        {
          ...searchModel,
          CUSTOMERRID: undefined,
          LOADERRID: undefined,
        },
        {
          ...searchModel,
          CUSTOMERRID: undefined,
          LOADERRID: undefined,
          FILLINGTYPE: undefined,
          FLAMMABILITY: undefined,
        },
        {
          LOADINGPORTRID: searchModel.LOADINGPORTRID,
          LOADINGLOCATIONRID: searchModel.LOADINGLOCATIONRID,
          DISCHARGEPORTRID: searchModel.DISCHARGEPORTRID,
          DISCHARGELOCATIONRID: searchModel.DISCHARGELOCATIONRID,
          LINERID: searchModel.LINERID,
          CONTAINERTYPERIDS: searchModel.CONTAINERTYPERIDS,
          CONTYPE: 'MSSQL',
        },
        {
          LOADINGPORTRID: searchModel.LOADINGPORTRID,
          LOADINGLOCATIONRID: searchModel.LOADINGLOCATIONRID,
          DISCHARGEPORTRID: searchModel.DISCHARGEPORTRID,
          DISCHARGELOCATIONRID: searchModel.DISCHARGELOCATIONRID,
          LINERID: searchModel.LINERID,
          CONTYPE: 'MSSQL',
        },
        {
          LOADINGPORTRID: searchModel.LOADINGPORTRID,
          DISCHARGEPORTRID: searchModel.DISCHARGEPORTRID,
          CONTYPE: 'MSSQL',
        },
      ];

      let quotationList: QuotationForCreateOfferModel[] = [];

      for (let i = 0; i < attemptsPayloads.length; i++) {
        const payload = attemptsPayloads[i];
        console.log(`[KOTASYON DEBUG] Arama denemesi #${i + 1}:`, JSON.stringify(payload, null, 2));

        const offerRes = await fetch(`${activeBaseUrl}/Offer/GetQuotationsForCreateOffer`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        }).catch((e) => {
          console.log(`[KOTASYON DEBUG] Deneme #${i + 1} fetch patladı:`, e.message);
          return null;
        });

        if (offerRes && offerRes.ok) {
          const rawText = await offerRes.text();
          console.log(`[KOTASYON DEBUG] Deneme #${i + 1} response body:`, rawText.slice(0, 300));
          try {
            const rawData = JSON.parse(rawText);
            const parsedList = Array.isArray(rawData)
              ? rawData
              : rawData?.data || rawData?.Data || rawData?.result || rawData?.Result || rawData?.items || rawData?.Items || [];
            const normalizedList = normalizeKeysDeep<QuotationForCreateOfferModel[]>(parsedList);
            if (Array.isArray(normalizedList) && normalizedList.length > 0) {
              console.log(`[KOTASYON DEBUG] Deneme #${i + 1} ile ${normalizedList.length} CANLI KOTASYON VERİSİ ALINDI!`);
              quotationList = normalizedList;
              break;
            }
          } catch (e) {
            console.log(`[KOTASYON DEBUG] Deneme #${i + 1} JSON parse hatası:`, e);
          }
        }
      }

      if (!quotationList || quotationList.length === 0) {
        console.log('[KOTASYON DEBUG] Arama sonucunda kotasyon bulunamadı. 0 sonuç gösteriliyor.');
        quotationList = [];
      }

      // Step 3: Fetch Extended Expenses for each Quotation (/Offer/GetQuotationsContainerExtendedExpenses)
      const extMap: Record<string, QuotationContainerExtendedExpenseModel[]> = {};

      for (const q of quotationList) {
        if (q.quotationrid) {
          const qCustomerRID =
            cleanGuidOrUndefined((q as any).customerrid) ||
            cleanGuidOrUndefined((q as any).CUSTOMERRID) ||
            cleanGuidOrUndefined(customerRID) ||
            cleanGuidOrUndefined(initialValues?.customerRID) ||
            null;

          const qLoaderRID =
            cleanGuidOrUndefined((q as any).loaderrid) ||
            cleanGuidOrUndefined((q as any).LOADERRID) ||
            cleanGuidOrUndefined(selectedYukleyici?.id) ||
            cleanGuidOrUndefined(initialValues?.loaderRID) ||
            qCustomerRID;

          const qLocationRID =
            cleanGuidOrUndefined(q.selectedloadinglocationrid) ||
            cleanGuidOrUndefined((q as any).loadinglocationrid) ||
            cleanGuidOrUndefined(selectedYuklemeYeri?.id) ||
            null;

          // Determine container type GUID RID
          const containerTypeRid =
            cleanGuidOrUndefined((q as any)?.containersinfo?.[0]?.containerrid) ||
            cleanGuidOrUndefined((q as any)?.containersinfo?.[0]?.id) ||
            cleanGuidOrUndefined(validContainerRIDs[0]) ||
            cleanGuidOrUndefined(selectedContainerTypes[0]?.id) ||
            'd9b3f037-3cc4-4f3a-92f8-ae0d7f62b8fc';

          const expenseReq: any = {
            quotationrid: q.quotationrid,
            containertyperid: containerTypeRid,
            customerrid: qCustomerRID,
            loaderrid: qLoaderRID,
          };
          if (qLocationRID) {
            expenseReq.selectedloadinglocationrid = qLocationRID;
          }

          console.log('[FROM QUOTATION EXPENSES REQ]', q.quotationrid, JSON.stringify(expenseReq));

          const expRes = await fetch(
            `${activeBaseUrl}/Offer/GetContainerExpensesFromQuotation`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(expenseReq),
            }
          ).catch(() => null);

          let expensesFromQuotation: any[] = [];
          if (expRes && expRes.ok) {
            const data = await expRes.json().catch(() => null);
            expensesFromQuotation = Array.isArray(data) ? data : data?.data || [];
            console.log('[FROM QUOTATION EXPENSES RES]', q.quotationrid, expensesFromQuotation.length, JSON.stringify(expensesFromQuotation));
          } else {
            console.log('[FROM QUOTATION EXPENSES ERROR]', q.quotationrid, expRes?.status);
          }

          const normalized = normalizeKeysDeep<any[]>(expensesFromQuotation);
          extMap[q.quotationrid] = normalized;
          (q as any).containersinfo = normalized;
          (q as any).extendedexpenses = normalized;
        }
      }

      setExtendedExpensesMap(extMap);
      setQuotationResults(quotationList);

      // Dynamically build final container headers from live quotation items so all returned container columns render!
      const dynamicHeaderMap = new Map<string, QuotationContainerHeaderModel>();

      // 1. Add headers from GetQuotationsContainers if any
      containerHeaderList.forEach((h) => {
        const key = h.containerrid || h.containertype;
        if (key) dynamicHeaderMap.set(key, h);
      });

      // 2. Add headers from live quotation items containersinfo / containers
      for (const q of quotationList) {
        const cList = q.containersinfo || (q as any).containers || (q as any).containerslist || [];
        if (Array.isArray(cList)) {
          for (const c of cList) {
            const cRid = c.containerrid || c.id;
            const cType = c.containertype || c.name || c.containertypeshort;
            if (cRid && cType && !dynamicHeaderMap.has(cRid)) {
              dynamicHeaderMap.set(cRid, {
                containerrid: cRid,
                containertype: cType,
                containertypeshort: c.containertypeshort || cType,
              });
            }
          }
        }
      }

      // 3. Fallback to selected container types if dynamicHeaderMap is empty
      if (dynamicHeaderMap.size === 0) {
        selectedContainerTypes.forEach((c) => {
          dynamicHeaderMap.set(c.id, {
            containerrid: c.id,
            containertype: c.name,
            containertypeshort: c.shortName || c.name,
          });
        });
      }

      const finalContainerHeaders = Array.from(dynamicHeaderMap.values()).sort((a, b) =>
        (a.containertype || '').localeCompare(b.containertype || '')
      );
      setContainerHeaders(finalContainerHeaders);

      const searchValues: KotasyonAramaValues = {
        tasimaTipi,
        ticariTipi,
        yuklemeTipi,
        hat: selectedHat?.name || initialValues?.hat,
        lineRID: selectedHat?.id || initialValues?.lineRID || initialValues?.lineRid,
        lineRid: selectedHat?.id || initialValues?.lineRid || initialValues?.lineRID,
        hatRID: selectedHat?.id || initialValues?.hatRID || initialValues?.hatRid,
        hatRid: selectedHat?.id || initialValues?.hatRid || initialValues?.hatRID,
        odemeTipi: selectedOdemeTipi?.name,
        payment: selectedOdemeTipi?.name,
        containerTypeRIDs: selectedContainerTypes.map((c) => c.id),
        konteynerTipi: selectedContainerTypes.map((c) => c.name).join(', '),
        dolumTipi: selectedDolumTipi?.name,
        fillingType: selectedDolumTipi?.name,
        tehlikelilikDurumu: selectedTehlikelilik?.name,
        flammability: selectedTehlikelilik?.name,
        yukleyici: selectedYukleyici?.name,
        loaderRID: selectedYukleyici?.id,
        customerRID,
        yuklemeYeri: selectedYuklemeYeri?.name,
        loadingLocationRID: selectedYuklemeYeri?.id,
        yuklemeLimani: selectedYuklemeLimani?.name,
        loadingPortRID: selectedYuklemeLimani?.id,
        teslimYeri: selectedTeslimYeri?.name,
        dischargeLocationRID: selectedTeslimYeri?.id,
        teslimLimani: selectedTeslimLimani?.name,
        dischargePortRID: selectedTeslimLimani?.id,
      };

      setShowSearchResults(true);
    } catch (err: any) {
      console.error('Kotasyon arama hatası:', err);
      setErrorMessage('Kotasyon arama işlemi sırasında sunucu hatası oluştu!');
    } finally {
      setIsSearching(false);
    }
  };

  const checkLoaderBlacklist = async (
    loaderRID: string,
    baseUrl: string,
    headers: Record<string, string>
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${baseUrl}/Customer/LoaderBlackListControl`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ LOADERRID: loaderRID, CONTYPE: 'MSSQL' }),
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        return !!(data === true || data?.isBlacklisted || data?.ISBLACKLISTED || data?.result === true);
      }
    } catch (e) {
      console.error('Blacklist check error:', e);
    }
    return false;
  };

  const handleToggleQuotationSelect = (qRid: string) => {
    setSelectedQuotationRIDs((prev) =>
      prev.includes(qRid) ? prev.filter((id) => id !== qRid) : [...prev, qRid]
    );
  };

  const filteredQuotations = quotationResults.filter((item) => {
    if (!onlySelectableFilter) return true;
    const isSelectable = item.isselectable !== 0 && item.localexpenseisselectable !== 0;
    return isSelectable;
  });

  const topPadding = Platform.OS === 'web' ? 16 : Math.max(insets.top, 16);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Top Header Tab Bar */}
      <View style={styles.topHeaderBar}>
        <View style={styles.headerLeftTab}>
          <View style={styles.activeTabContainer}>
            <View style={styles.tabContentRow}>
              <ThemedText style={styles.tabTitleText}>
                Müşteri Teklif Oluşturma Ekranı
              </ThemedText>
            </View>
            <View style={styles.activeTabUnderline} />
          </View>
        </View>

        <Pressable
          onPress={onBack || onClose}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.btnPressed,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
        >
          <ThemedText style={styles.backBtnText}>Geri Dön</ThemedText>
        </Pressable>
      </View>

      {/* Main Content View */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.step2Container}>
          {/* Cyan Dynamic Info Banner */}
          <View style={styles.cyanBanner}>
            <ThemedText style={styles.cyanBannerText}>
              {`${selectedYukleyici?.name || initialValues?.customerName || 'Müşteri'} firması için ${tasimaTipi} ${ticariTipi} ${yuklemeTipi} teklifi oluşturmaktasınız.`}
            </ThemedText>
          </View>

          {/* Validation Error Message Alert */}
          {errorMessage && (
            <View style={styles.errorAlertBox}>
              <ThemedText style={styles.errorAlertText}>{errorMessage}</ThemedText>
              <Pressable
                onPress={() => setErrorMessage(null)}
                style={styles.errorAlertCloseBtn}
              >
                <ThemedText style={styles.errorAlertCloseText}>✕</ThemedText>
              </Pressable>
            </View>
          )}

          {/* SECTION 1: Yükleme Bilgileri & Konteyner Tipi */}
          <View style={styles.sectionCard}>
            {/* Peach Section Header */}
            <View style={styles.peachHeaderRow}>
              <View style={[styles.headerCell, { flex: isMobilePortrait ? 1 : 2 }]}>
                <ThemedText style={styles.peachHeaderText}>
                  Yükleme Bilgileri
                </ThemedText>
              </View>
              <View style={[styles.headerCell, { flex: 1 }]}>
                <ThemedText style={styles.peachHeaderText}>
                  Konteyner Tipi
                </ThemedText>
              </View>
            </View>

            {isMobilePortrait ? (
              <>
                {/* Mobile Portrait: 2 Columns Layout */}
                {/* Row 1 Headers */}
                <View style={styles.yellowSubHeaderRow}>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>Hat</ThemedText>
                  </View>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>
                      Ödeme Tipi
                    </ThemedText>
                  </View>
                </View>

                {/* Row 1 Inputs */}
                <View style={styles.inputRow}>
                  {/* Hat (Live API Search Input Picker) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <View style={styles.tableSelectInput}>
                      <Pressable
                        style={{ flex: 1, justifyContent: 'center' }}
                        onPress={() =>
                          openSearchPicker(
                            'hat',
                            'Hat Ara',
                            'Hat adı veya kodu yazınız...',
                            selectedHat?.id,
                            (item) => setSelectedHat(item)
                          )
                        }
                      >
                        <ThemedText
                          numberOfLines={1}
                          style={
                            selectedHat?.name ? styles.tableSelectVal : styles.tablePlaceholder
                          }
                        >
                          {selectedHat?.name || 'Hat ara'}
                        </ThemedText>
                      </Pressable>

                      {selectedHat ? (
                        <Pressable
                          onPress={() => setSelectedHat(null)}
                          style={styles.clearBtnIcon}
                        >
                          <ThemedText style={styles.clearBtnText}>✕</ThemedText>
                        </Pressable>
                      ) : (
                        <ThemedText style={styles.tableChevron}>🔍</ThemedText>
                      )}
                    </View>
                  </View>

                  {/* Ödeme Tipi (Sabit Değerler Modal) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <Pressable
                      onPress={() =>
                        openStaticSelectModal(
                          'Ödeme Tipi Seçiniz',
                          SABIT_ODEME_TIPI_OPTIONS,
                          selectedOdemeTipi?.id || selectedOdemeTipi?.name,
                          (val) => setSelectedOdemeTipi(val)
                        )
                      }
                      style={({ pressed }) => [
                        styles.tableSelectInput,
                        pressed && styles.selectInputPressed,
                      ]}
                    >
                      <ThemedText
                        style={
                          selectedOdemeTipi?.name
                            ? styles.tableSelectVal
                            : styles.tablePlaceholder
                        }
                      >
                        {selectedOdemeTipi?.name || 'Ödeme tipi seçiniz'}
                      </ThemedText>
                      <ThemedText style={styles.tableChevron}>∨</ThemedText>
                    </Pressable>
                  </View>
                </View>

                {/* Row 2 Headers */}
                <View style={styles.yellowSubHeaderRow}>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>
                      Konteyner Tipleri *
                    </ThemedText>
                  </View>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>
                      Dolum Tipi *
                    </ThemedText>
                  </View>
                </View>

                {/* Row 2 Inputs */}
                <View style={styles.inputRow}>
                  {/* Konteyner Tipleri (Teklif Oluşturma Konteynerları Multi Select) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <Pressable
                      onPress={() => setShowContainerPicker(true)}
                      style={({ pressed }) => [
                        styles.tableSelectInput,
                        pressed && styles.selectInputPressed,
                      ]}
                    >
                      <ThemedText
                        numberOfLines={1}
                        style={
                          selectedContainerTypes.length > 0
                            ? styles.tableSelectVal
                            : styles.tablePlaceholder
                        }
                      >
                        {selectedContainerTypes.length > 0
                          ? selectedContainerTypes.map((c) => c.shortName || c.name).join(', ')
                          : 'Konteyner Tipi seçiniz.'}
                      </ThemedText>
                      <ThemedText style={styles.tableChevron}>∨</ThemedText>
                    </Pressable>
                  </View>

                  {/* Dolum Tipi (Sabit Değerler Modal) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <Pressable
                      onPress={() =>
                        openStaticSelectModal(
                          'Dolum Tipi Seçiniz',
                          SABIT_DOLUM_TIPI_OPTIONS,
                          selectedDolumTipi?.id || selectedDolumTipi?.name,
                          (val) => setSelectedDolumTipi(val)
                        )
                      }
                      style={({ pressed }) => [
                        styles.tableSelectInput,
                        pressed && styles.selectInputPressed,
                      ]}
                    >
                      <ThemedText
                        style={
                          selectedDolumTipi?.name
                            ? styles.tableSelectVal
                            : styles.tablePlaceholder
                        }
                      >
                        {selectedDolumTipi?.name || 'Dolum tipi seçiniz'}
                      </ThemedText>
                      <ThemedText style={styles.tableChevron}>∨</ThemedText>
                    </Pressable>
                  </View>
                </View>

                {/* Row 3 Headers */}
                <View style={styles.yellowSubHeaderRow}>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>
                      Tehlikelilik Durumu
                    </ThemedText>
                  </View>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>
                      Yükleyici
                    </ThemedText>
                  </View>
                </View>

                {/* Row 3 Inputs */}
                <View style={styles.inputRow}>
                  {/* Tehlikelilik Durumu (Sabit Değerler Modal) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <Pressable
                      onPress={() =>
                        openStaticSelectModal(
                          'Tehlikelilik Durumu Seçiniz',
                          SABIT_TEHLIKELILIK_OPTIONS,
                          selectedTehlikelilik?.id || selectedTehlikelilik?.name,
                          (val) => setSelectedTehlikelilik(val)
                        )
                      }
                      style={({ pressed }) => [
                        styles.tableSelectInput,
                        pressed && styles.selectInputPressed,
                      ]}
                    >
                      <ThemedText
                        style={
                          selectedTehlikelilik?.name
                            ? styles.tableSelectVal
                            : styles.tablePlaceholder
                        }
                      >
                        {selectedTehlikelilik?.name || 'Tehlikelilik seçiniz'}
                      </ThemedText>
                      <ThemedText style={styles.tableChevron}>∨</ThemedText>
                    </Pressable>
                  </View>

                  {/* Yükleyici (Live API Search Input Picker) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <View style={styles.tableSelectInput}>
                      <Pressable
                        style={{ flex: 1, justifyContent: 'center' }}
                        onPress={() =>
                          openSearchPicker(
                            'loader',
                            'Yükleyici Ara',
                            'Yükleyici / CoLoader adı yazınız...',
                            selectedYukleyici?.id,
                            (item) => setSelectedYukleyici(item)
                          )
                        }
                      >
                        <ThemedText
                          numberOfLines={1}
                          style={
                            selectedYukleyici?.name
                              ? styles.tableSelectVal
                              : styles.tablePlaceholder
                          }
                        >
                          {selectedYukleyici?.name || 'Yükleyici ara'}
                        </ThemedText>
                      </Pressable>

                      {selectedYukleyici ? (
                        <Pressable
                          onPress={() => setSelectedYukleyici(null)}
                          style={styles.clearBtnIcon}
                        >
                          <ThemedText style={styles.clearBtnText}>✕</ThemedText>
                        </Pressable>
                      ) : (
                        <ThemedText style={styles.tableChevron}>🔍</ThemedText>
                      )}
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Row 1 Headers (Cream Yellow) */}
                <View style={styles.yellowSubHeaderRow}>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>Hat</ThemedText>
                  </View>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>
                      Ödeme Tipi
                    </ThemedText>
                  </View>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>
                      Konteyner Tipleri *
                    </ThemedText>
                  </View>
                </View>

                {/* Row 1 Inputs */}
                <View style={styles.inputRow}>
                  {/* Hat (Live API Search Input Picker) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <View style={styles.tableSelectInput}>
                      <Pressable
                        style={{ flex: 1, justifyContent: 'center' }}
                        onPress={() =>
                          openSearchPicker(
                            'hat',
                            'Hat Ara',
                            'Hat adı veya kodu yazınız...',
                            selectedHat?.id,
                            (item) => setSelectedHat(item)
                          )
                        }
                      >
                        <ThemedText
                          numberOfLines={1}
                          style={
                            selectedHat?.name ? styles.tableSelectVal : styles.tablePlaceholder
                          }
                        >
                          {selectedHat?.name || 'Hat ara'}
                        </ThemedText>
                      </Pressable>

                      {selectedHat ? (
                        <Pressable
                          onPress={() => setSelectedHat(null)}
                          style={styles.clearBtnIcon}
                        >
                          <ThemedText style={styles.clearBtnText}>✕</ThemedText>
                        </Pressable>
                      ) : (
                        <ThemedText style={styles.tableChevron}>🔍</ThemedText>
                      )}
                    </View>
                  </View>

                  {/* Ödeme Tipi (Sabit Değerler Modal) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <Pressable
                      onPress={() =>
                        openStaticSelectModal(
                          'Ödeme Tipi Seçiniz',
                          SABIT_ODEME_TIPI_OPTIONS,
                          selectedOdemeTipi?.id || selectedOdemeTipi?.name,
                          (val) => setSelectedOdemeTipi(val)
                        )
                      }
                      style={({ pressed }) => [
                        styles.tableSelectInput,
                        pressed && styles.selectInputPressed,
                      ]}
                    >
                      <ThemedText
                        style={
                          selectedOdemeTipi?.name
                            ? styles.tableSelectVal
                            : styles.tablePlaceholder
                        }
                      >
                        {selectedOdemeTipi?.name || 'Ödeme tipi seçiniz'}
                      </ThemedText>
                      <ThemedText style={styles.tableChevron}>∨</ThemedText>
                    </Pressable>
                  </View>

                  {/* Konteyner Tipleri (Teklif Oluşturma Konteynerları Multi Select) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <Pressable
                      onPress={() => setShowContainerPicker(true)}
                      style={({ pressed }) => [
                        styles.tableSelectInput,
                        pressed && styles.selectInputPressed,
                      ]}
                    >
                      <ThemedText
                        numberOfLines={1}
                        style={
                          selectedContainerTypes.length > 0
                            ? styles.tableSelectVal
                            : styles.tablePlaceholder
                        }
                      >
                        {selectedContainerTypes.length > 0
                          ? selectedContainerTypes.map((c) => c.shortName || c.name).join(', ')
                          : 'Konteyner Tipi seçiniz.'}
                      </ThemedText>
                      <ThemedText style={styles.tableChevron}>∨</ThemedText>
                    </Pressable>
                  </View>
                </View>

                {/* Row 2 Headers (Cream Yellow) */}
                <View style={styles.yellowSubHeaderRow}>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>
                      Dolum Tipi *
                    </ThemedText>
                  </View>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>
                      Tehlikelilik Durumu
                    </ThemedText>
                  </View>
                  <View style={[styles.subHeaderCell, { flex: 1 }]}>
                    <ThemedText style={styles.yellowHeaderText}>
                      Yükleyici
                    </ThemedText>
                  </View>
                </View>

                {/* Row 2 Inputs */}
                <View style={styles.inputRow}>
                  {/* Dolum Tipi (Sabit Değerler Modal) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <Pressable
                      onPress={() =>
                        openStaticSelectModal(
                          'Dolum Tipi Seçiniz',
                          SABIT_DOLUM_TIPI_OPTIONS,
                          selectedDolumTipi?.id || selectedDolumTipi?.name,
                          (val) => setSelectedDolumTipi(val)
                        )
                      }
                      style={({ pressed }) => [
                        styles.tableSelectInput,
                        pressed && styles.selectInputPressed,
                      ]}
                    >
                      <ThemedText
                        style={
                          selectedDolumTipi?.name
                            ? styles.tableSelectVal
                            : styles.tablePlaceholder
                        }
                      >
                        {selectedDolumTipi?.name || 'Dolum tipi seçiniz'}
                      </ThemedText>
                      <ThemedText style={styles.tableChevron}>∨</ThemedText>
                    </Pressable>
                  </View>

                  {/* Tehlikelilik Durumu (Sabit Değerler Modal) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <Pressable
                      onPress={() =>
                        openStaticSelectModal(
                          'Tehlikelilik Durumu Seçiniz',
                          SABIT_TEHLIKELILIK_OPTIONS,
                          selectedTehlikelilik?.id || selectedTehlikelilik?.name,
                          (val) => setSelectedTehlikelilik(val)
                        )
                      }
                      style={({ pressed }) => [
                        styles.tableSelectInput,
                        pressed && styles.selectInputPressed,
                      ]}
                    >
                      <ThemedText
                        style={
                          selectedTehlikelilik?.name
                            ? styles.tableSelectVal
                            : styles.tablePlaceholder
                        }
                      >
                        {selectedTehlikelilik?.name || 'Tehlikelilik seçiniz'}
                      </ThemedText>
                      <ThemedText style={styles.tableChevron}>∨</ThemedText>
                    </Pressable>
                  </View>

                  {/* Yükleyici (Live API Search Input Picker) */}
                  <View style={[styles.inputCell, { flex: 1 }]}>
                    <View style={styles.tableSelectInput}>
                      <Pressable
                        style={{ flex: 1, justifyContent: 'center' }}
                        onPress={() =>
                          openSearchPicker(
                            'loader',
                            'Yükleyici Ara',
                            'Yükleyici / CoLoader adı yazınız...',
                            selectedYukleyici?.id,
                            (item) => setSelectedYukleyici(item)
                          )
                        }
                      >
                        <ThemedText
                          numberOfLines={1}
                          style={
                            selectedYukleyici?.name
                              ? styles.tableSelectVal
                              : styles.tablePlaceholder
                          }
                        >
                          {selectedYukleyici?.name || 'Yükleyici ara'}
                        </ThemedText>
                      </Pressable>

                      {selectedYukleyici ? (
                        <Pressable
                          onPress={() => setSelectedYukleyici(null)}
                          style={styles.clearBtnIcon}
                        >
                          <ThemedText style={styles.clearBtnText}>✕</ThemedText>
                        </Pressable>
                      ) : (
                        <ThemedText style={styles.tableChevron}>🔍</ThemedText>
                      )}
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* SECTION 2: Destinasyon Bilgileri */}
          <View style={styles.sectionCard}>
            {/* Peach Section Header */}
            <View style={styles.peachHeaderRow}>
              <View style={[styles.headerCell, { flex: 1 }]}>
                <ThemedText style={styles.peachHeaderText}>
                  Destinasyon Bilgileri
                </ThemedText>
              </View>
            </View>

            {/* Row 1 Headers (Cream Yellow) */}
            <View style={styles.yellowSubHeaderRow}>
              <View style={[styles.subHeaderCell, { flex: 1 }]}>
                <ThemedText style={styles.yellowHeaderText}>
                  Yükleme Yeri
                </ThemedText>
              </View>
              <View style={[styles.subHeaderCell, { flex: 1 }]}>
                <ThemedText style={styles.yellowHeaderText}>
                  Yükleme Limanı
                </ThemedText>
              </View>
            </View>

            {/* Row 1 Inputs */}
            <View style={styles.inputRow}>
              {/* Yükleme Yeri (Live API Search Input Picker) */}
              <View style={[styles.inputCell, { flex: 1 }]}>
                <View style={styles.tableSelectInput}>
                  <Pressable
                    style={{ flex: 1, justifyContent: 'center' }}
                    onPress={() =>
                      openSearchPicker(
                        'location',
                        'Yükleme Yeri Ara',
                        'Yükleme yeri adı yazınız...',
                        selectedYuklemeYeri?.id,
                        (item) => setSelectedYuklemeYeri(item)
                      )
                    }
                  >
                    <ThemedText
                      numberOfLines={1}
                      style={
                        selectedYuklemeYeri?.name
                          ? styles.tableSelectVal
                          : styles.tablePlaceholder
                      }
                    >
                      {selectedYuklemeYeri?.name || 'Yükleme yeri ara'}
                    </ThemedText>
                  </Pressable>

                  {selectedYuklemeYeri ? (
                    <Pressable
                      onPress={() => setSelectedYuklemeYeri(null)}
                      style={styles.clearBtnIcon}
                    >
                      <ThemedText style={styles.clearBtnText}>✕</ThemedText>
                    </Pressable>
                  ) : (
                    <ThemedText style={styles.tableChevron}>🔍</ThemedText>
                  )}
                </View>
              </View>

              {/* Yükleme Limanı (Live API Search Input Picker) */}
              <View style={[styles.inputCell, { flex: 1 }]}>
                <View style={styles.tableSelectInput}>
                  <Pressable
                    style={{ flex: 1, justifyContent: 'center' }}
                    onPress={() =>
                      openSearchPicker(
                        'port',
                        'Yükleme Limanı Ara',
                        'Liman adı veya UN/LOCODE yazınız...',
                        selectedYuklemeLimani?.id,
                        (item) => setSelectedYuklemeLimani(item)
                      )
                    }
                  >
                    <ThemedText
                      numberOfLines={1}
                      style={
                        selectedYuklemeLimani?.name
                          ? styles.tableSelectVal
                          : styles.tablePlaceholder
                      }
                    >
                      {selectedYuklemeLimani?.name || 'Yükleme limanı ara'}
                    </ThemedText>
                  </Pressable>

                  {selectedYuklemeLimani ? (
                    <Pressable
                      onPress={() => setSelectedYuklemeLimani(null)}
                      style={styles.clearBtnIcon}
                    >
                      <ThemedText style={styles.clearBtnText}>✕</ThemedText>
                    </Pressable>
                  ) : (
                    <ThemedText style={styles.tableChevron}>🔍</ThemedText>
                  )}
                </View>
              </View>
            </View>

            {/* Row 2 Headers (Cream Yellow) */}
            <View style={styles.yellowSubHeaderRow}>
              <View style={[styles.subHeaderCell, { flex: 1 }]}>
                <ThemedText style={styles.yellowHeaderText}>
                  Teslim Yeri / Tahliye Yeri
                </ThemedText>
              </View>
              <View style={[styles.subHeaderCell, { flex: 1 }]}>
                <ThemedText style={styles.yellowHeaderText}>
                  Teslim Limanı / Tahliye Limanı
                </ThemedText>
              </View>
            </View>

            {/* Row 2 Inputs */}
            <View style={styles.inputRow}>
              {/* Teslim Yeri (Live API Search Input Picker) */}
              <View style={[styles.inputCell, { flex: 1 }]}>
                <View style={styles.tableSelectInput}>
                  <Pressable
                    style={{ flex: 1, justifyContent: 'center' }}
                    onPress={() =>
                      openSearchPicker(
                        'location',
                        'Teslim Yeri Ara',
                        'Tahliye yeri veya depo adı yazınız...',
                        selectedTeslimYeri?.id,
                        (item) => setSelectedTeslimYeri(item)
                      )
                    }
                  >
                    <ThemedText
                      numberOfLines={1}
                      style={
                        selectedTeslimYeri?.name
                          ? styles.tableSelectVal
                          : styles.tablePlaceholder
                      }
                    >
                      {selectedTeslimYeri?.name || 'Tahliye yeri ara'}
                    </ThemedText>
                  </Pressable>

                  {selectedTeslimYeri ? (
                    <Pressable
                      onPress={() => setSelectedTeslimYeri(null)}
                      style={styles.clearBtnIcon}
                    >
                      <ThemedText style={styles.clearBtnText}>✕</ThemedText>
                    </Pressable>
                  ) : (
                    <ThemedText style={styles.tableChevron}>🔍</ThemedText>
                  )}
                </View>
              </View>

              {/* Teslim Limanı (Live API Search Input Picker) */}
              <View style={[styles.inputCell, { flex: 1 }]}>
                <View style={styles.tableSelectInput}>
                  <Pressable
                    style={{ flex: 1, justifyContent: 'center' }}
                    onPress={() =>
                      openSearchPicker(
                        'port',
                        'Teslim Limanı Ara',
                        'Tahliye limanı adı yazınız...',
                        selectedTeslimLimani?.id,
                        (item) => setSelectedTeslimLimani(item)
                      )
                    }
                  >
                    <ThemedText
                      numberOfLines={1}
                      style={
                        selectedTeslimLimani?.name
                          ? styles.tableSelectVal
                          : styles.tablePlaceholder
                      }
                    >
                      {selectedTeslimLimani?.name || 'Tahliye limanı ara'}
                    </ThemedText>
                  </Pressable>

                  {selectedTeslimLimani ? (
                    <Pressable
                      onPress={() => setSelectedTeslimLimani(null)}
                      style={styles.clearBtnIcon}
                    >
                      <ThemedText style={styles.clearBtnText}>✕</ThemedText>
                    </Pressable>
                  ) : (
                    <ThemedText style={styles.tableChevron}>🔍</ThemedText>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Bottom Right Search Button */}
          <View style={styles.searchBtnContainer}>
            <Pressable
              disabled={isSearching}
              onPress={handleKotasyonAra}
              style={({ pressed }) => [
                styles.kotasyonAraBtn,
                isSearching && { opacity: 0.6 },
                pressed && styles.btnPressed,
              ]}
            >
              {isSearching ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText style={styles.kotasyonAraBtnText}>
                  Kotasyon Ara
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* STATIC SELECT MODAL (For Sabit Değerler: OdemeTipi, DolumTipi, Tehlikelilik) */}
      {staticSelectState && staticSelectState.visible && (
        <StaticSelectModal
          visible={staticSelectState.visible}
          title={staticSelectState.title}
          options={staticSelectState.options}
          selectedId={staticSelectState.selectedId}
          onClose={() => setStaticSelectState(null)}
          onSelect={(item) => {
            staticSelectState.onSelect(item);
            setStaticSelectState(null);
          }}
        />
      )}

      {/* API SELECT MODAL (For Loader / Yükleyici API Select) */}
      {apiSelectState && apiSelectState.visible && (
        <ApiSelectModal
          visible={apiSelectState.visible}
          title={apiSelectState.title}
          type={apiSelectState.type}
          selectedId={apiSelectState.selectedId}
          activeBaseUrl={activeBaseUrl}
          authToken={authToken}
          onClose={() => setApiSelectState(null)}
          onSelect={(item) => {
            apiSelectState.onSelect(item);
            setApiSelectState(null);
          }}
        />
      )}

      {/* LIVE SEARCH PICKER MODAL (FOR HAT, PLACES & PORTS) */}
      {searchPickerState && searchPickerState.visible && (
        <SearchablePickerModal
          visible={searchPickerState.visible}
          title={searchPickerState.title}
          placeholder={searchPickerState.placeholder}
          type={searchPickerState.type}
          selectedId={searchPickerState.selectedId}
          activeBaseUrl={activeBaseUrl}
          authToken={authToken}
          onClose={() => setSearchPickerState(null)}
          onSelect={(item) => {
            searchPickerState.onSelect(item);
            setSearchPickerState(null);
          }}
        />
      )}

      {/* Multi Select Container Type Picker Modal (Teklif Oluşturma Konteynerları) */}
      {showContainerPicker && (
        <Modal
          transparent
          visible={showContainerPicker}
          onRequestClose={() => setShowContainerPicker(false)}
          animationType="fade"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowContainerPicker(false)}
          >
            <Pressable style={styles.pickerCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.pickerHeaderRow}>
                <ThemedText style={styles.pickerTitle}>
                  Konteyner Tipleri Seçiniz ({tasimaTipi})
                </ThemedText>
                <Pressable
                  onPress={() => setShowContainerPicker(false)}
                  style={styles.pickerCloseBtn}
                >
                  <ThemedText style={styles.pickerCloseBtnText}>✕</ThemedText>
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                <View style={styles.pickerOptionsList}>
                  {availableContainerOptions.map((option) => {
                    const isSelected = selectedContainerTypes.some(
                      (c) => c.id === option.id || c.name === option.name
                    );
                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => {
                          if (isSelected) {
                            if (selectedContainerTypes.length > 1) {
                              setSelectedContainerTypes((prev) =>
                                prev.filter(
                                  (c) => c.id !== option.id && c.name !== option.name
                                )
                              );
                            }
                          } else {
                            setSelectedContainerTypes((prev) => [...prev, option]);
                          }
                        }}
                        style={({ pressed }) => [
                          styles.pickerOptionItem,
                          isSelected && styles.pickerOptionSelected,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.pickerOptionText,
                            isSelected && styles.pickerOptionTextSelected,
                          ]}
                        >
                          {option.name}
                        </ThemedText>
                        <View
                          style={[
                            styles.checkboxOuter,
                            isSelected && styles.checkboxOuterActive,
                          ]}
                        >
                          {isSelected && <View style={styles.checkboxInner} />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <Pressable
                onPress={() => setShowContainerPicker(false)}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.btnPressed,
                  { alignSelf: 'flex-end', marginTop: 12 },
                ]}
              >
                <ThemedText style={styles.submitBtnText}>Tamam</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* SEARCH RESULTS MODAL & DYNAMIC TABLE */}
      {showSearchResults && (
        <Modal
          transparent
          visible={showSearchResults}
          onRequestClose={() => setShowSearchResults(false)}
          animationType="fade"
        >
          <View style={styles.resultsModalOverlay}>
            <View style={styles.resultsModalCardWide}>
              {/* Results Top Header */}
              <View style={styles.resultsHeaderRow}>
                <View>
                  <ThemedText style={styles.resultsModalTitle}>
                    Kotasyon Arama Sonuçları
                  </ThemedText>
                  <ThemedText style={styles.resultsModalSub}>
                    {`${selectedYukleyici?.name || initialValues?.customerName || 'Müşteri'} firması için ${quotationResults.length} adet teklif kotasyonu bulundu.`}
                  </ThemedText>
                </View>

                <Pressable
                  onPress={() => setShowSearchResults(false)}
                  style={styles.pickerCloseBtn}
                >
                  <ThemedText style={styles.pickerCloseBtnText}>✕</ThemedText>
                </Pressable>
              </View>

              {/* Location Info Banner */}
              {quotationResults.length > 0 && (
                <View style={styles.locationBannerRow}>
                  <View style={styles.locBadgeItem}>
                    <ThemedText style={styles.locBadgeLabel}>Yükleme Yeri:</ThemedText>
                    <ThemedText style={styles.locBadgeVal}>
                      {quotationResults[0]?.loadinglocation || selectedYuklemeYeri?.name || '-'}
                    </ThemedText>
                  </View>
                  <View style={styles.locBadgeItem}>
                    <ThemedText style={styles.locBadgeLabel}>Yükleme Limanı:</ThemedText>
                    <ThemedText style={styles.locBadgeVal}>
                      {quotationResults[0]?.loadingport || selectedYuklemeLimani?.name || '-'}
                    </ThemedText>
                  </View>
                  <View style={styles.locBadgeItem}>
                    <ThemedText style={styles.locBadgeLabel}>Tahliye Limanı:</ThemedText>
                    <ThemedText style={styles.locBadgeVal}>
                      {quotationResults[0]?.dischargeport || selectedTeslimLimani?.name || '-'}
                    </ThemedText>
                  </View>
                  <View style={styles.locBadgeItem}>
                    <ThemedText style={styles.locBadgeLabel}>Tahliye Yeri:</ThemedText>
                    <ThemedText style={styles.locBadgeVal}>
                      {quotationResults[0]?.dischargelocation || selectedTeslimYeri?.name || '-'}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Filter Controls Bar */}
              <View style={styles.filterControlRow}>
                <Pressable
                  onPress={() => setOnlySelectableFilter(!onlySelectableFilter)}
                  style={styles.filterCheckboxContainer}
                >
                  <View
                    style={[
                      styles.checkboxOuter,
                      onlySelectableFilter && styles.checkboxOuterActive,
                    ]}
                  >
                    {onlySelectableFilter && <View style={styles.checkboxInner} />}
                  </View>
                  <ThemedText style={styles.filterCheckboxText}>
                    Sadece Seçilebilir Kotasyonları Göster
                  </ThemedText>
                </Pressable>
              </View>

              {/* Dynamic Quotations Table Scroll Container */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={styles.tableHorizontalScrollView}
              >
                <ScrollView
                  style={styles.tableVerticalScrollView}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={styles.tableContainer}>
                    {/* Table Header Row */}
                    <View style={styles.tableHeaderRow}>
                      <View style={[styles.thCell, { width: 50 }]}>
                        <ThemedText style={styles.thText}>Seç</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 45 }]}>
                        <ThemedText style={styles.thText}>Not</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 110 }]}>
                        <ThemedText style={styles.thText}>Kotasyon No</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 100 }]}>
                        <ThemedText style={styles.thText}>Geçerlilik</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 100 }]}>
                        <ThemedText style={styles.thText}>Hat</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 100 }]}>
                        <ThemedText style={styles.thText}>Y. Yeri</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 110 }]}>
                        <ThemedText style={styles.thText}>Y. Limanı</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 110 }]}>
                        <ThemedText style={styles.thText}>T. Limanı</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 100 }]}>
                        <ThemedText style={styles.thText}>T. Yeri</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 80 }]}>
                        <ThemedText style={styles.thText}>Free Time</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 90 }]}>
                        <ThemedText style={styles.thText}>Dolum Tipi</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 100 }]}>
                        <ThemedText style={styles.thText}>Ödeme Tipi</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 80 }]}>
                        <ThemedText style={styles.thText}>Transit S.</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 90 }]}>
                        <ThemedText style={styles.thText}>Servis</ThemedText>
                      </View>
                      <View style={[styles.thCell, { width: 80 }]}>
                        <ThemedText style={styles.thText}>Tip</ThemedText>
                      </View>

                      {/* Dynamic Container Column Headers */}
                      {containerHeaders.map((header) => (
                        <View
                          key={header.containerrid}
                          style={[styles.thCell, { width: 110 }]}
                        >
                          <ThemedText style={styles.thText}>
                            {header.containertypeshort || header.containertype}
                          </ThemedText>
                        </View>
                      ))}

                      {/* Col 16: Detay Column Header */}
                      <View style={[styles.thCell, { width: 85 }]}>
                        <ThemedText style={styles.thText}>Detay</ThemedText>
                      </View>
                    </View>

                    {/* Table Body Rows */}
                    {filteredQuotations.map((item, index) => {
                      const isSpecialCustomer = item.isspecialforcustomer === 1;
                      const isSelectable = item.isselectable !== 0;
                      const isLocalSelectable = item.localexpenseisselectable !== 0;
                      const isChecked = selectedQuotationRIDs.includes(item.quotationrid);

                      // Calculate cost without container
                      let costWithoutContainer = 0;
                      if (Array.isArray(item.containersinfo)) {
                        const noContainerItems = item.containersinfo.filter(
                          (c) => !c.containerrid || c.containerrid === ''
                        );
                        noContainerItems.forEach((c) => {
                          costWithoutContainer += parseDecimalValue(c.containercost);
                        });
                      }

                      const extendedList = extendedExpensesMap[item.quotationrid] || [];

                      return (
                        <View
                          key={item.quotationrid || `q_${index}`}
                          style={[
                            styles.tableBodyRow,
                            isSpecialCustomer && styles.specialCustomerRow,
                            index % 2 === 1 && !isSpecialCustomer && styles.altTableRow,
                          ]}
                        >
                          {/* Col 1: Selectability Badge / Checkbox */}
                          <View style={[styles.tdCell, { width: 50 }]}>
                            {!isSelectable ? (
                              <Pressable
                                onPress={() =>
                                  setActiveReasonModal({
                                    title: 'Seçilemez Uyarı',
                                    text:
                                      item.selectabilityreason ||
                                      'Kotasyon uygun değildir.',
                                  })
                                }
                                style={styles.badgeDanger}
                              >
                                <ThemedText style={styles.badgeDangerText}>
                                  Seçilemez
                                </ThemedText>
                              </Pressable>
                            ) : !isLocalSelectable ? (
                              <Pressable
                                onPress={() =>
                                  setActiveReasonModal({
                                    title: 'Lokal Tarife Eksik',
                                    text:
                                      item.localexpenseselectabilityreason ||
                                      'Lokal masraf tarifesi bulunamadı.',
                                  })
                                }
                                style={styles.badgeWarning}
                              >
                                <ThemedText style={styles.badgeWarningText}>
                                  Lokal Yok
                                </ThemedText>
                              </Pressable>
                            ) : (
                              <Pressable
                                onPress={() =>
                                  handleToggleQuotationSelect(item.quotationrid)
                                }
                                style={[
                                  styles.checkboxOuter,
                                  isChecked && styles.checkboxOuterActive,
                                ]}
                              >
                                {isChecked && <View style={styles.checkboxInner} />}
                              </Pressable>
                            )}
                          </View>

                          {/* Col 2: Note */}
                          <View style={[styles.tdCell, { width: 45 }]}>
                            {item.note ? (
                              <Pressable
                                onPress={() =>
                                  setActiveNoteModal({
                                    title: 'Kotasyon Notu',
                                    text: item.note!,
                                  })
                                }
                                style={styles.noteIconBadge}
                              >
                                <ThemedText style={styles.noteIconText}>!</ThemedText>
                              </Pressable>
                            ) : (
                              <ThemedText style={styles.tdText}>-</ThemedText>
                            )}
                          </View>

                          {/* Col 3: Quotation No (Clickable for detail modal) */}
                          <View style={[styles.tdCell, { width: 110 }]}>
                            <Pressable onPress={() => setViewQuotationModal(item)}>
                              <ThemedText style={[styles.tdText, styles.linkText]}>
                                {item.quotationno || '-'}
                              </ThemedText>
                            </Pressable>
                          </View>

                          {/* Col 4: Validity Date */}
                          <View style={[styles.tdCell, { width: 100 }]}>
                            <ThemedText style={styles.tdText}>
                              {item.quotationvaliditydate || '-'}
                            </ThemedText>
                          </View>

                          {/* Col 5: Line */}
                          <View style={[styles.tdCell, { width: 100 }]}>
                            <ThemedText style={styles.tdText}>{item.line || '-'}</ThemedText>
                          </View>

                          {/* Col 6: Loading Location */}
                          <View style={[styles.tdCell, { width: 100 }]}>
                            <ThemedText style={styles.tdText}>
                              {item.loadinglocationshort || item.loadinglocation || '-'}
                            </ThemedText>
                          </View>

                          {/* Col 7: Loading Port */}
                          <View style={[styles.tdCell, { width: 110 }]}>
                            <ThemedText style={styles.tdText}>
                              {item.loadingportshort || item.loadingport || '-'}
                            </ThemedText>
                          </View>

                          {/* Col 8: Discharge Port */}
                          <View style={[styles.tdCell, { width: 110 }]}>
                            <ThemedText style={styles.tdText}>
                              {item.dischargeportshort || item.dischargeport || '-'}
                            </ThemedText>
                          </View>

                          {/* Col 9: Discharge Location */}
                          <View style={[styles.tdCell, { width: 100 }]}>
                            <ThemedText style={styles.tdText}>
                              {item.dischargelocationshort || item.dischargelocation || '-'}
                            </ThemedText>
                          </View>

                          {/* Col 10: Free Time */}
                          <View style={[styles.tdCell, { width: 80 }]}>
                            <ThemedText style={styles.tdText}>
                              {item.freetime !== undefined ? `${item.freetime} Gün` : '-'}
                            </ThemedText>
                          </View>

                          {/* Col 11: Filling Type */}
                          <View style={[styles.tdCell, { width: 90 }]}>
                            <ThemedText style={styles.tdText}>
                              {item.fillingtype || '-'}
                            </ThemedText>
                          </View>

                          {/* Col 12: Payment */}
                          <View style={[styles.tdCell, { width: 100 }]}>
                            <ThemedText style={styles.tdText}>
                              {item.payment || '-'}
                            </ThemedText>
                          </View>

                          {/* Col 13: Transit Time */}
                          <View style={[styles.tdCell, { width: 80 }]}>
                            <ThemedText style={styles.tdText}>
                              {item.transittime !== undefined
                                ? `${item.transittime} Gün`
                                : '-'}
                            </ThemedText>
                          </View>

                          {/* Col 14: Service */}
                          <View style={[styles.tdCell, { width: 90 }]}>
                            <ThemedText style={styles.tdText}>
                              {item.service || '-'}
                            </ThemedText>
                          </View>

                          {/* Col 15: Type */}
                          <View style={[styles.tdCell, { width: 80 }]}>
                            <ThemedText
                              style={styles.tdText}
                              numberOfLines={1}
                            >
                              {item.type === 'NAC' && item.customername
                                ? `${item.type} (${item.customername})`
                                : item.type || '-'}
                            </ThemedText>
                          </View>

                          {/* Dynamic Container Columns Prices */}
                          {containerHeaders.map((header) => {
                            const cRid = header.containerrid;
                            const cList = item.containersinfo || (item as any).containers || (item as any).containerslist || [];
                            const matchedContInfo = Array.isArray(cList)
                              ? cList.find(
                                (c: any) =>
                                  c.containerrid === cRid ||
                                  c.id === cRid ||
                                  (c.containertype && header.containertype && String(c.containertype).trim().toLowerCase() === String(header.containertype).trim().toLowerCase())
                              )
                              : undefined;

                            if (!matchedContInfo) {
                              return (
                                <View
                                  key={cRid}
                                  style={[styles.tdCell, { width: 110 }]}
                                >
                                  <ThemedText style={styles.tdTextMuted}>
                                    -
                                  </ThemedText>
                                </View>
                              );
                            }

                            const basePrice =
                              parseDecimalValue(matchedContInfo.containercost) +
                              parseDecimalValue(costWithoutContainer);

                            const matchingExt = extendedList.filter(
                              (exp) => exp.containerrid === cRid
                            );
                            const landOptions = matchingExt.filter(
                              (exp) => exp.type === 'KARA'
                            );
                            let nonLandTotal = 0;
                            matchingExt.forEach((exp) => {
                              if (exp.type !== 'KARA') {
                                nonLandTotal += parseDecimalValue(
                                  exp.containerextendedcost
                                );
                              }
                            });

                            let selectedLandCost = 0;
                            const selectionKey = `${item.quotationrid}_${cRid}`;

                            if (landOptions.length === 1) {
                              selectedLandCost = parseDecimalValue(
                                landOptions[0].containerextendedcost
                              );
                            } else if (landOptions.length > 1) {
                              const selOptId = landShippingSelections[selectionKey];
                              const selItem = landOptions.find(
                                (o) => o.optionrid === selOptId
                              );
                              if (selItem) {
                                selectedLandCost = parseDecimalValue(
                                  selItem.containerextendedcost
                                );
                              } else {
                                selectedLandCost = parseDecimalValue(
                                  landOptions[0].containerextendedcost
                                );
                              }
                            }

                            const totalPrice = (
                              basePrice +
                              nonLandTotal +
                              selectedLandCost
                            ).toFixed(2);

                            return (
                              <View
                                key={cRid}
                                style={[styles.tdCell, { width: 110 }]}
                              >
                                {landOptions.length > 1 ? (
                                  <Pressable
                                    onPress={() =>
                                      openApiSelectModal(
                                        'filling',
                                        'Kara Nakliye Seçimi',
                                        landShippingSelections[selectionKey] ||
                                        landOptions[0].optionrid,
                                        (optItem) => {
                                          setLandShippingSelections((prev) => ({
                                            ...prev,
                                            [selectionKey]: optItem.id,
                                          }));
                                        }
                                      )
                                    }
                                    style={styles.landSelectBadge}
                                  >
                                    <ThemedText style={styles.priceValueText}>
                                      ${totalPrice}
                                    </ThemedText>
                                    <ThemedText style={styles.landSelectSub}>
                                      (Kara Var)
                                    </ThemedText>
                                  </Pressable>
                                ) : (
                                  <ThemedText style={styles.priceValueText}>
                                    ${totalPrice}
                                  </ThemedText>
                                )}
                              </View>
                            );
                          })}

                          {/* Col 16: Detay Column Button */}
                          <View style={[styles.tdCell, { width: 85 }]}>
                            <Pressable
                              onPress={() => setViewQuotationModal(item)}
                              style={styles.detailBtn}
                            >
                              <ThemedText style={styles.detailBtnText}>Detay</ThemedText>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </ScrollView>

              {/* Bottom Action Footer */}
              <View style={styles.resultsModalFooter}>
                <Pressable
                  onPress={() => setShowSearchResults(false)}
                  style={styles.cancelBtn}
                >
                  <ThemedText style={styles.cancelBtnText}>Kapat</ThemedText>
                </Pressable>

                <Pressable
                  onPress={async () => {
                    const isImport = isImportCommercialType(
                      ticariTipi,
                      initialValues?.ticariTipi,
                      (initialValues as any)?.COMMERCIALTYPE,
                      (initialValues as any)?.commercialType
                    );
                    const forceQuotation = !isImport;

                    if (forceQuotation && selectedQuotationRIDs.length < 1) {
                      setActiveReasonModal({
                        title: 'İşlem Tamamlanamadı',
                        text: 'İhracat teklifi için kotasyon seçimi zorunludur.',
                      });
                      return;
                    }

                    const custRid =
                      initialValues?.customerRID ||
                      initialValues?.customerRid ||
                      (initialValues as any)?.customerrid ||
                      selectedYukleyici?.id ||
                      '';

                    const validContainerRids = containerHeaders
                      .map((h) => cleanGuidOrUndefined(h.containerrid))
                      .filter((id): id is string => !!id);

                    let createdOffer: any = null;

                    if (selectedQuotationRIDs.length > 0) {
                      const payload = {
                        selectedRids: selectedQuotationRIDs,
                        shippingType: tasimaTipi,
                        commercialType: ticariTipi,
                        loadingType: yuklemeTipi,
                        customerRid: custRid,
                        selectedContainerRids: validContainerRids.length > 0 ? validContainerRids : containerHeaders.map((h) => h.containerrid),
                        requestNo: '',
                        selectedLocationRid: selectedYuklemeYeri?.id || '',
                        loaderRid: selectedYukleyici?.id || '',
                        loader: selectedYukleyici?.name || '',
                        selectedLandShippingOptions: landShippingSelections,
                      };

                      const headers: Record<string, string> = {
                        'Content-Type': 'application/json',
                      };
                      if (authToken) {
                        headers['Authorization'] = authToken.startsWith('Bearer ')
                          ? authToken
                          : `Bearer ${authToken}`;
                      }

                      try {
                        const res = await fetch(`${activeBaseUrl}/Offer/CreateOffer`, {
                          method: 'POST',
                          headers,
                          body: JSON.stringify(payload),
                        });
                        if (res.ok) {
                          createdOffer = await res.json().catch(() => null);
                          console.log('[CREATE OFFER SUCCESS]', JSON.stringify(createdOffer));
                        }
                      } catch (e) {
                        console.warn('[CREATE OFFER FAILED]', e);
                      }
                    }

                    const offerRidVal = createdOffer?.OFFERRID || createdOffer?.offerrid;

                    const selectedList = selectedQuotationRIDs.length > 0
                      ? quotationResults
                        .filter((q) => selectedQuotationRIDs.includes(q.quotationrid))
                        .map((q) => {
                          const extList = extendedExpensesMap[q.quotationrid] || [];
                          const detail = (extendedExpensesMap[q.quotationrid] as any) || (viewQuotationModal?.quotationrid === q.quotationrid ? viewQuotationModal : {});
                          const extLinerid =
                            (q as any).linerid ||
                            (q as any).LINERID ||
                            (q as any).lineRid ||
                            (q as any).lineRID ||
                            (q as any).hatrid ||
                            (q as any).HATRID ||
                            detail?.linerid ||
                            detail?.LINERID ||
                            detail?.lineRid ||
                            detail?.lineRID ||
                            selectedHat?.id ||
                            null;
                          return {
                            ...q,
                            linerid: extLinerid,
                            LINERID: extLinerid,
                            lineRid: extLinerid,
                            lineRID: extLinerid,
                            frontshipping: (q as any).frontshipping || detail?.frontshipping,
                            localexpense: (q as any).localexpense || (q as any).localexpenses || detail?.localexpense || detail?.localexpenses,
                            lastshipping: (q as any).lastshipping || detail?.lastshipping,
                            custom: (q as any).custom || detail?.custom,
                            documentation: (q as any).documentation || detail?.documentation,
                            portexpenses: (q as any).portexpenses || detail?.portexpenses,
                            quotationexpensedetail: (q as any).quotationexpensedetail || detail?.quotationexpensedetail || detail?.quotationExpenseDetail || extList,
                            offerrid: offerRidVal || (q as any).offerrid,
                            OFFERRID: offerRidVal || (q as any).OFFERRID,
                            extendedexpenses: extList,
                            OFFEREXPENSES: createdOffer?.OFFEREXPENSES || createdOffer?.offerexpenses || (q as any).OFFEREXPENSES || [],
                            QUOTATIONCONTAINERS: createdOffer?.QUOTATIONCONTAINERS || createdOffer?.quotationcontainers || (q as any).containersinfo || [],
                          };
                        })
                      : undefined;

                    setShowSearchResults(false);
                    if (onSubmit) {
                      onSubmit(
                        {
                          tasimaTipi,
                          ticariTipi,
                          yuklemeTipi,
                          hat: selectedHat?.name || initialValues?.hat,
                          lineRID: selectedHat?.id || initialValues?.lineRID || initialValues?.lineRid,
                          lineRid: selectedHat?.id || initialValues?.lineRid || initialValues?.lineRID,
                          hatRID: selectedHat?.id || initialValues?.hatRID || initialValues?.hatRid,
                          hatRid: selectedHat?.id || initialValues?.hatRid || initialValues?.hatRID,
                          odemeTipi: selectedOdemeTipi?.name,
                          payment: selectedOdemeTipi?.name,
                          containerTypeRIDs: selectedContainerTypes.map((c) => c.id),
                          konteynerTipi: selectedContainerTypes.map((c) => c.name).join(', '),
                          dolumTipi: selectedDolumTipi?.name,
                          fillingType: selectedDolumTipi?.name,
                          tehlikelilikDurumu: selectedTehlikelilik?.name,
                          flammability: selectedTehlikelilik?.name,
                          yukleyici: selectedYukleyici?.name || initialValues?.customerName || initialValues?.yukleyici,
                          customerName: selectedYukleyici?.name || initialValues?.customerName || initialValues?.yukleyici,
                          loaderRID: selectedYukleyici?.id,
                          loaderRid: selectedYukleyici?.id,
                          customerRID: custRid,
                          customerRid: custRid,
                          yuklemeYeri: selectedYuklemeYeri?.name,
                          loadingLocationRID: selectedYuklemeYeri?.id,
                          loadingLocationRid: selectedYuklemeYeri?.id,
                          yuklemeLimani: selectedYuklemeLimani?.name,
                          loadingPortRID: selectedYuklemeLimani?.id,
                          loadingPortRid: selectedYuklemeLimani?.id,
                          teslimYeri: selectedTeslimYeri?.name,
                          dischargeLocationRID: selectedTeslimYeri?.id,
                          dischargeLocationRid: selectedTeslimYeri?.id,
                          teslimLimani: selectedTeslimLimani?.name,
                          dischargePortRID: selectedTeslimLimani?.id,
                          dischargePortRid: selectedTeslimLimani?.id,
                        },
                        selectedList
                      );
                    } else {
                      onClose();
                    }
                  }}
                  style={styles.submitBtn}
                >
                  <ThemedText style={styles.submitBtnText}>
                    {selectedQuotationRIDs.length > 0
                      ? `Seçilen Kotasyonlar ile Teklif Oluştur (${selectedQuotationRIDs.length})`
                      : `Teklif Oluştur${isImportCommercialType(ticariTipi, initialValues?.ticariTipi) ? ' (Kotasyonsuz)' : ''}`}
                  </ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Note Tooltip Modal */}
      {activeNoteModal && (
        <Modal
          transparent
          visible={!!activeNoteModal}
          onRequestClose={() => setActiveNoteModal(null)}
          animationType="fade"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActiveNoteModal(null)}
          >
            <View style={styles.infoModalCard}>
              <ThemedText style={styles.pickerTitle}>
                {activeNoteModal.title}
              </ThemedText>
              <ThemedText style={styles.infoModalBodyText}>
                {activeNoteModal.text}
              </ThemedText>
              <Pressable
                onPress={() => setActiveNoteModal(null)}
                style={[styles.submitBtn, { alignSelf: 'flex-end', marginTop: 14 }]}
              >
                <ThemedText style={styles.submitBtnText}>Tamam</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Reason / Unselectable Tooltip Modal */}
      {activeReasonModal && (
        <Modal
          transparent
          visible={!!activeReasonModal}
          onRequestClose={() => setActiveReasonModal(null)}
          animationType="fade"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActiveReasonModal(null)}
          >
            <View style={styles.infoModalCard}>
              <ThemedText style={styles.pickerTitle}>
                {activeReasonModal.title}
              </ThemedText>
              <ThemedText style={styles.infoModalBodyText}>
                {activeReasonModal.text}
              </ThemedText>
              <Pressable
                onPress={() => setActiveReasonModal(null)}
                style={[styles.submitBtn, { alignSelf: 'flex-end', marginTop: 14 }]}
              >
                <ThemedText style={styles.submitBtnText}>Anladım</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* View Quotation Full Details Modal (Matching Website Design) */}
      {viewQuotationModal && (
        <Modal
          transparent
          visible={!!viewQuotationModal}
          onRequestClose={() => setViewQuotationModal(null)}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setViewQuotationModal(null)}
            />
            <View style={styles.qdCardContainer}>
              {/* Top Header */}
              <View style={styles.qdHeaderRow}>
                <ThemedText style={styles.qdTitle}>Kotasyon Detay</ThemedText>
                <Pressable
                  onPress={() => setViewQuotationModal(null)}
                  style={styles.qdCloseBtn}
                >
                  <ThemedText style={styles.qdCloseBtnText}>✕</ThemedText>
                </Pressable>
              </View>

              {/* Scrollable Content */}
              <ScrollView
                style={styles.qdScrollContainer}
                contentContainerStyle={{ gap: 14, paddingBottom: 16 }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* 1. Genel Bilgiler */}
                <View style={styles.qdSectionBox}>
                  <View style={styles.qdBannerOrange}>
                    <ThemedText style={styles.qdBannerTitle}>Genel Bilgiler</ThemedText>
                  </View>
                  <View style={styles.qdGridBody}>
                    {/* Row 1: KOTASYON, HAT, ÖDEME, SERVİS */}
                    <View style={styles.qdGridRow}>
                      <View style={styles.qdGridCol}>
                        <ThemedText style={styles.qdLabel}>KOTASYON : </ThemedText>
                        <ThemedText style={styles.qdVal}>{viewQuotationModal.quotationno || '-'}</ThemedText>
                      </View>
                      <View style={styles.qdGridCol}>
                        <ThemedText style={styles.qdLabel}>HAT : </ThemedText>
                        <ThemedText style={styles.qdVal}>{viewQuotationModal.line || '-'}</ThemedText>
                      </View>
                      <View style={styles.qdGridCol}>
                        <ThemedText style={styles.qdLabel}>ÖDEME : </ThemedText>
                        <ThemedText style={styles.qdVal}>{viewQuotationModal.payment || '-'}</ThemedText>
                      </View>
                      <View style={styles.qdGridCol}>
                        <ThemedText style={styles.qdLabel}>SERVİS : </ThemedText>
                        <ThemedText style={styles.qdVal}>{viewQuotationModal.service || '-'}</ThemedText>
                      </View>
                    </View>

                    {/* Row 2: FREE TIME, TRANSİT SÜRE, GEÇERLİLİK TARİHİ */}
                    <View style={styles.qdGridRow}>
                      <View style={styles.qdGridCol}>
                        <ThemedText style={styles.qdLabel}>FREE TIME : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {viewQuotationModal.freetime !== undefined && viewQuotationModal.freetime !== null ? String(viewQuotationModal.freetime) : '-'}
                        </ThemedText>
                      </View>
                      <View style={styles.qdGridCol}>
                        <ThemedText style={styles.qdLabel}>TRANSİT SÜRE : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {viewQuotationModal.transittime !== undefined && viewQuotationModal.transittime !== null ? String(viewQuotationModal.transittime) : '-'}
                        </ThemedText>
                      </View>
                      <View style={styles.qdGridColSpan2}>
                        <ThemedText style={styles.qdLabel}>GEÇERLİLİK TARİHİ : </ThemedText>
                        <ThemedText style={styles.qdVal}>{viewQuotationModal.quotationvaliditydate || '-'}</ThemedText>
                      </View>
                    </View>

                    {/* Row 3: YÜKLEME YERİ, YÜKLEME LİMANI */}
                    <View style={styles.qdGridRow}>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>YÜKLEME YERİ : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {viewQuotationModal.loadinglocation || viewQuotationModal.loadinglocationshort || '-'}
                        </ThemedText>
                      </View>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>YÜKLEME LİMANI : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {viewQuotationModal.loadingport || viewQuotationModal.loadingportshort || '-'}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Row 4: VARIŞ YERİ, VARIŞ LİMANI */}
                    <View style={styles.qdGridRow}>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>VARIŞ YERİ : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {viewQuotationModal.dischargelocation || viewQuotationModal.dischargelocationshort || '-'}
                        </ThemedText>
                      </View>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>VARIŞ LİMANI : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {viewQuotationModal.dischargeport || viewQuotationModal.dischargeportshort || '-'}
                        </ThemedText>
                      </View>
                    </View>

                    {/* Row 5: DOLUM TİPİ */}
                    <View style={styles.qdGridRow}>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>DOLUM TİPİ : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {viewQuotationModal.fillingtype || '-'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 2. Yurtiçi Masrafları */}
                <View style={styles.qdSectionBox}>
                  <View style={styles.qdBannerOrange}>
                    <ThemedText style={styles.qdBannerTitle}>Yurtiçi Masrafları</ThemedText>
                  </View>
                  <View style={styles.qdGridBody}>
                    <View style={styles.qdGridRow}>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>ÖN TAŞIMA : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {(viewQuotationModal as any).frontshipping || '—'}
                        </ThemedText>
                      </View>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>LOKAL MASRAFLAR : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {(viewQuotationModal as any).localexpense || (viewQuotationModal as any).localexpenses || '—'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 3. Yurtdışı Masrafları : */}
                <View style={styles.qdSectionBox}>
                  <View style={styles.qdBannerOrange}>
                    <ThemedText style={styles.qdBannerTitle}>Yurtdışı Masrafları :</ThemedText>
                  </View>
                  <View style={styles.qdGridBody}>
                    <View style={styles.qdGridRow}>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>SON TAŞIMA : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {(viewQuotationModal as any).lastshipping || '—'}
                        </ThemedText>
                      </View>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>GÜMRÜKLEME : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {(viewQuotationModal as any).custom || '—'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.qdGridRow}>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>DOKUMANTASYON : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {(viewQuotationModal as any).documentation || '—'}
                        </ThemedText>
                      </View>
                      <View style={styles.qdGridColHalf}>
                        <ThemedText style={styles.qdLabel}>LİMAN MASRAFLARI : </ThemedText>
                        <ThemedText style={styles.qdVal}>
                          {(viewQuotationModal as any).portexpenses || '—'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>

                {/* 4. Equipment Expenses Tables (from quotationexpensedetail) */}
                {(() => {
                  const detailExpenses: any[] =
                    (viewQuotationModal as any).quotationexpensedetail ||
                    (viewQuotationModal as any).quotationExpenseDetail ||
                    extendedExpensesMap[viewQuotationModal.quotationrid] ||
                    [];

                  // Collect selected container identifiers for filtering
                  const selectedSet = new Set<string>();
                  selectedContainerTypes.forEach((c) => {
                    if (c.id) selectedSet.add(c.id.toLowerCase().trim());
                    if (c.name) selectedSet.add(c.name.toLowerCase().trim());
                    if (c.shortName) selectedSet.add(c.shortName.toLowerCase().trim());
                  });
                  containerHeaders.forEach((h) => {
                    if (h.containerrid) selectedSet.add(h.containerrid.toLowerCase().trim());
                    if (h.containertype) selectedSet.add(h.containertype.toLowerCase().trim());
                    if (h.containertypeshort) selectedSet.add(h.containertypeshort.toLowerCase().trim());
                  });

                  // Helper to test if an expense matches selected containers
                  const isExpenseSelected = (exp: any): boolean => {
                    if (selectedSet.size === 0) return true;
                    const eRid = String(exp.containerrid || exp.CONTAINERRID || '').toLowerCase().trim();
                    const eType = String(exp.containertype || exp.CONTAINERTYPE || '').toLowerCase().trim();
                    const eShort = String(exp.containertypeshort || exp.CONTAINERTYPESHORT || '').toLowerCase().trim();
                    const eBeher = String(exp.beher || exp.BEHER || exp.unit || exp.UNIT || exp.per || exp.PER || '').toUpperCase().trim();

                    // BL / Sevkiyat genel masrafları her zaman dahil edilmeli (konteyner seçiminden bağımsızdır)
                    if (!eRid && !eType) return true;
                    if (eBeher === 'BL' || eType === 'bl' || eType === 'bl masrafları') return true;

                    if (eRid && selectedSet.has(eRid)) return true;
                    if (eType && selectedSet.has(eType)) return true;
                    if (eShort && selectedSet.has(eShort)) return true;

                    for (const s of Array.from(selectedSet)) {
                      if (!s) continue;
                      if (eType && (eType.includes(s) || s.includes(eType))) return true;
                      if (eShort && (eShort.includes(s) || s.includes(eShort))) return true;
                    }
                    return false;
                  };

                  // Konteyner İSMİNE göre birleştirerek grupla (ikiye ayrılmayı önler)
                  const byContainerName = new Map<string, { type: string; expenses: any[] }>();
                  const generalExpenses: any[] = [];

                  if (Array.isArray(detailExpenses) && detailExpenses.length > 0) {
                    // Filter expenses first if selected containers are set
                    let filteredExpenses = detailExpenses.filter(isExpenseSelected);
                    if (filteredExpenses.length === 0) {
                      filteredExpenses = detailExpenses;
                    }

                    filteredExpenses.forEach((exp: any) => {
                      const eBeher = String(exp.beher || exp.BEHER || exp.unit || exp.UNIT || exp.per || exp.PER || '').toUpperCase().trim();
                      const rawType = exp.containertype || exp.CONTAINERTYPE || exp.containertypeshort || exp.CONTAINERTYPESHORT;

                      const masrafTipi = exp.expensetype || exp.optionlabel || exp.type || exp.EXPENSETYPE || exp.OPTIONLABEL || exp.TYPE || 'MASRAF';
                      const alisFiyati = String(exp.buyingcost ?? exp.containercost ?? exp.BUYINGCOST ?? exp.CONTAINERCOST ?? exp.cost ?? exp.COST ?? '0');
                      const kdv = String(exp.kdv ?? exp.KDV ?? '0');
                      const doviz = exp.currency || exp.CURRENCY || exp.currencycode || exp.CURRENCYCODE || 'EUR';
                      const beher = exp.beher || exp.BEHER || exp.unit || exp.UNIT || exp.per || exp.PER || (eBeher ? eBeher : 'CNT');

                      const formattedExpense = {
                        masrafTipi,
                        kdv,
                        alisFiyati,
                        doviz,
                        beher,
                        alisTarafi: exp.buyingcustomer || exp.line || exp.BUYINGCUSTOMER || exp.LINE || '',
                      };

                      // Eğer masrafın belirli bir konteyner tipi varsa (örn: "40 High Cube")
                      if (rawType && String(rawType).trim() !== '' && String(rawType).toUpperCase() !== 'BL' && String(rawType).toUpperCase() !== 'GENEL') {
                        const groupKey = String(rawType).trim().toUpperCase();
                        if (!byContainerName.has(groupKey)) {
                          byContainerName.set(groupKey, { type: String(rawType).trim(), expenses: [] });
                        }
                        byContainerName.get(groupKey)!.expenses.push(formattedExpense);
                      } else {
                        // Belirli bir konteyner tipi olmayan genel/BL masrafları
                        generalExpenses.push(formattedExpense);
                      }
                    });

                    // Genel/BL masrafları ayrı bir başlık açmak yerine mevcut konteyner masraflarının içine ekle
                    if (generalExpenses.length > 0) {
                      if (byContainerName.size > 0) {
                        byContainerName.forEach((containerObj) => {
                          generalExpenses.forEach((genExp) => {
                            const exists = containerObj.expenses.some(
                              (e) => e.masrafTipi === genExp.masrafTipi && e.alisFiyati === genExp.alisFiyati
                            );
                            if (!exists) {
                              containerObj.expenses.push(genExp);
                            }
                          });
                        });
                      } else {
                        const fallbackType = selectedContainerTypes[0]?.name || containerHeaders[0]?.containertype || 'Konteyner';
                        const groupKey = fallbackType.toUpperCase();
                        byContainerName.set(groupKey, { type: fallbackType, expenses: generalExpenses });
                      }
                    }
                  }

                  const containerGroupsList: { type: string; expenses: any[] }[] =
                    Array.from(byContainerName.values());

                  if (containerGroupsList.length === 0) {
                    const modalExt = extendedExpensesMap[viewQuotationModal.quotationrid] || (viewQuotationModal as any).extendedexpenses || [];
                    const contInfo = viewQuotationModal.containersinfo || (viewQuotationModal as any).containers || [];
                    if (Array.isArray(modalExt) && modalExt.length > 0) {
                      const cType = (viewQuotationModal as any).containertype || contInfo[0]?.containertype || 'Konteyner';
                      const expenses = modalExt.map((e: any) =>
                        mapQuotationExpense(e, viewQuotationModal.line, viewQuotationModal.customername)
                      );
                      containerGroupsList.push({ type: cType, expenses });
                    } else if (Array.isArray(contInfo) && contInfo.length > 0) {
                      contInfo.forEach((c: any) => {
                        const cType = c.containertype || c.containertypeshort || c.name || 'Konteyner';
                        const baseCost = c.containercost ?? '0.00';
                        const expenses = [
                          {
                            masrafTipi: 'DENİZYOLU NAVLUN ÜCRETİ',
                            kdv: '0',
                            alisFiyati: String(baseCost),
                            doviz: 'EUR',
                            beher: 'CNT',
                          },
                        ];
                        containerGroupsList.push({ type: cType, expenses });
                      });
                    }
                  }

                  return containerGroupsList.map((group, groupIdx) => (
                    <View key={`cg_${groupIdx}`} style={styles.qdSectionBox}>
                      <View style={styles.qdBannerBrightOrange}>
                        <ThemedText style={styles.qdBannerBrightTitle}>
                          {group.type}
                        </ThemedText>
                      </View>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        style={{ backgroundColor: '#ffffff', width: '100%' }}
                        contentContainerStyle={{ minWidth: '100%' }}
                      >
                        <View style={[styles.qdTableContainer, { width: '100%', minWidth: 475 }]}>
                          {/* Table Header */}
                          <View style={styles.qdTableHeader}>
                            <View style={{ flex: 1, minWidth: 180, justifyContent: 'center' }}>
                              <ThemedText style={[styles.qdThText, { textAlign: 'left' }]}>Masraf tipi</ThemedText>
                            </View>
                            <View style={{ width: 60, alignItems: 'center', justifyContent: 'center' }}>
                              <ThemedText style={[styles.qdThText, { textAlign: 'center' }]}>KDV</ThemedText>
                            </View>
                            <View style={{ width: 100, alignItems: 'center', justifyContent: 'center' }}>
                              <ThemedText style={[styles.qdThText, { textAlign: 'center' }]}>Alış Fiyatı</ThemedText>
                            </View>
                            <View style={{ width: 70, alignItems: 'center', justifyContent: 'center' }}>
                              <ThemedText style={[styles.qdThText, { textAlign: 'center' }]}>Döviz</ThemedText>
                            </View>
                            <View style={{ width: 65, alignItems: 'center', justifyContent: 'center' }}>
                              <ThemedText style={[styles.qdThText, { textAlign: 'center' }]}>Beher</ThemedText>
                            </View>
                          </View>
                          {/* Table Rows */}
                          {group.expenses.map((expItem, expIdx) => (
                            <View key={`exp_${expIdx}`} style={styles.qdTableRow}>
                              <View style={{ flex: 1, minWidth: 180, justifyContent: 'center' }}>
                                <ThemedText style={[styles.qdTdText, { textAlign: 'left' }]} numberOfLines={2}>
                                  {expItem.masrafTipi}
                                </ThemedText>
                              </View>
                              <View style={{ width: 60, alignItems: 'center', justifyContent: 'center' }}>
                                <ThemedText style={[styles.qdTdText, { textAlign: 'center' }]}>{expItem.kdv}</ThemedText>
                              </View>
                              <View style={{ width: 100, alignItems: 'center', justifyContent: 'center' }}>
                                <ThemedText style={[styles.qdTdText, { textAlign: 'center', fontWeight: '700', color: '#15803d' }]}>
                                  {expItem.alisFiyati}
                                </ThemedText>
                              </View>
                              <View style={{ width: 70, alignItems: 'center', justifyContent: 'center' }}>
                                <ThemedText style={[styles.qdTdText, { textAlign: 'center', fontWeight: '600' }]}>{expItem.doviz}</ThemedText>
                              </View>
                              <View style={{ width: 65, alignItems: 'center', justifyContent: 'center' }}>
                                <ThemedText style={[styles.qdTdText, { textAlign: 'center' }]}>{expItem.beher}</ThemedText>
                              </View>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  ));
                })()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// STATIC SELECT MODAL COMPONENT (FOR SABIT SEÇENEKLER: ODEME TIPI, DOLUM TIPI, TEHLIKELILIK)
interface StaticSelectModalProps {
  visible: boolean;
  title: string;
  options: OptionItem[];
  selectedId?: string;
  onClose: () => void;
  onSelect: (item: OptionItem) => void;
}

function StaticSelectModal({
  visible,
  title,
  options,
  selectedId,
  onClose,
  onSelect,
}: StaticSelectModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.pickerCard, { maxWidth: 460, maxHeight: '85%' }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.pickerHeaderRow}>
            <ThemedText style={styles.pickerTitle}>{title}</ThemedText>
            <Pressable onPress={onClose} style={styles.pickerCloseBtn}>
              <ThemedText style={styles.pickerCloseBtnText}>✕</ThemedText>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 360 }}>
            <View style={styles.pickerOptionsList}>
              {options.map((option) => {
                const isSelected =
                  selectedId === option.id || selectedId === option.name;
                return (
                  <Pressable
                    key={option.id || option.name}
                    onPress={() => onSelect(option)}
                    style={({ pressed }) => [
                      styles.pickerOptionItem,
                      isSelected && styles.pickerOptionSelected,
                      pressed && styles.btnPressed,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {option.name}
                    </ThemedText>
                    {isSelected && (
                      <ThemedText style={styles.checkIcon}>✓</ThemedText>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// API SELECT MODAL COMPONENT (FOR DYNAMICALLY FETCHING LISTS FROM API)
interface ApiSelectModalProps {
  visible: boolean;
  title: string;
  type: 'loader' | 'filling' | 'payment' | 'flammability';
  selectedId?: string;
  activeBaseUrl: string;
  authToken: string;
  onClose: () => void;
  onSelect: (item: OptionItem) => void;
}

function ApiSelectModal({
  visible,
  title,
  type,
  selectedId,
  activeBaseUrl,
  authToken,
  onClose,
  onSelect,
}: ApiSelectModalProps) {
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const loadApiOptions = async () => {
      setIsLoading(true);
      const items = await fetchSearchOptionsFromApi(type, '', activeBaseUrl, authToken);
      if (isMounted) {
        setOptions(items);
        setIsLoading(false);
      }
    };

    loadApiOptions();
    return () => {
      isMounted = false;
    };
  }, [type, activeBaseUrl, authToken]);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.pickerCard, { maxWidth: 460, maxHeight: '85%' }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.pickerHeaderRow}>
            <ThemedText style={styles.pickerTitle}>{title}</ThemedText>
            <Pressable onPress={onClose} style={styles.pickerCloseBtn}>
              <ThemedText style={styles.pickerCloseBtnText}>✕</ThemedText>
            </Pressable>
          </View>

          {/* Loading Indicator or Options List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1d4ed8" />
              <ThemedText style={styles.loadingText}>API'den seçenekler yükleniyor...</ThemedText>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              <View style={styles.pickerOptionsList}>
                {options.length > 0 ? (
                  options.map((option) => {
                    const isSelected = selectedId === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => onSelect(option)}
                        style={({ pressed }) => [
                          styles.pickerOptionItem,
                          isSelected && styles.pickerOptionSelected,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.pickerOptionText,
                            isSelected && styles.pickerOptionTextSelected,
                          ]}
                        >
                          {option.name}
                        </ThemedText>
                        {isSelected && (
                          <ThemedText style={styles.checkIcon}>✓</ThemedText>
                        )}
                      </Pressable>
                    );
                  })
                ) : (
                  <View style={styles.noResultsBox}>
                    <ThemedText style={styles.noResultsText}>
                      API'den kayıt bulunamadı.
                    </ThemedText>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// SEARCHABLE PICKER MODAL COMPONENT (FOR LIVE API SEARCH OF HAT, PLACES & PORTS)
export interface SearchablePickerModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  type: 'hat' | 'location' | 'port' | 'loader' | 'expense';
  selectedId?: string;
  activeBaseUrl: string;
  authToken: string;
  onClose: () => void;
  onSelect: (item: OptionItem) => void;
}

export function SearchablePickerModal({
  visible,
  title,
  placeholder,
  type,
  selectedId,
  activeBaseUrl,
  authToken,
  onClose,
  onSelect,
}: SearchablePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const clean = searchQuery.trim();

    if (clean.length < 2) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    // Debounced search: Wait 300ms after user stops typing before triggering search
    const timer = setTimeout(async () => {
      if (!isMounted) return;
      console.log(`[SEARCH PICKER DEBUG] Debounce doldu, aranıyor: "${clean}", type: ${type}`);
      setIsLoading(true);

      const results = await fetchSearchOptionsFromApi(
        type,
        clean,
        activeBaseUrl,
        authToken
      );
      if (isMounted) {
        console.log(`[SEARCH PICKER DEBUG] Sonuç geldi: ${results.length} kayıt`);
        setOptions(results);
        setIsLoading(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, type, activeBaseUrl, authToken]);

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.pickerCard, { maxWidth: 500, maxHeight: '85%' }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.pickerHeaderRow}>
            <ThemedText style={styles.pickerTitle}>{title}</ThemedText>
            <Pressable onPress={onClose} style={styles.pickerCloseBtn}>
              <ThemedText style={styles.pickerCloseBtnText}>✕</ThemedText>
            </Pressable>
          </View>

          {/* Live Search Input Field */}
          <View style={styles.modalSearchInputBox}>
            <ThemedText style={styles.modalSearchIcon}>🔍</ThemedText>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={placeholder || 'Aramak için en az 2 harf yazınız...'}
              placeholderTextColor="#94a3b8"
              autoFocus
              style={styles.modalSearchTextInput}
            />
            {searchQuery ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={styles.modalSearchClearBtn}
              >
                <ThemedText style={styles.modalSearchClearText}>✕</ThemedText>
              </Pressable>
            ) : null}
          </View>

          {/* Helper Hint Text */}
          {searchQuery.trim().length < 2 ? (
            <View style={styles.searchMinCharHintBox}>
              <ThemedText style={styles.searchMinCharHintText}>
                ℹ En az 2 harf girildiğinde sunucudan canlı sonuçlar getirilir.
              </ThemedText>
            </View>
          ) : null}

          {/* Loading Indicator or Options List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#1d4ed8" />
              <ThemedText style={styles.loadingText}>API'den sonuçlar aranıyor...</ThemedText>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              <View style={styles.pickerOptionsList}>
                {options.length > 0 ? (
                  options.map((option) => {
                    const isSelected = selectedId === option.id;
                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => onSelect(option)}
                        style={({ pressed }) => [
                          styles.pickerOptionItem,
                          isSelected && styles.pickerOptionSelected,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText
                            style={[
                              styles.pickerOptionText,
                              isSelected && styles.pickerOptionTextSelected,
                            ]}
                          >
                            {option.name}
                          </ThemedText>
                          {option.shortName && (
                            <ThemedText style={styles.pickerOptionSubText}>
                              {option.shortName}
                            </ThemedText>
                          )}
                        </View>

                        {isSelected && (
                          <ThemedText style={styles.checkIcon}>✓</ThemedText>
                        )}
                      </Pressable>
                    );
                  })
                ) : searchQuery.trim().length >= 2 ? (
                  <View style={styles.noResultsBox}>
                    <ThemedText style={styles.noResultsText}>
                      API'de aradığınız kriterlere uygun sonuç bulunamadı.
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  /* TOP HEADER BAR & TABS */
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 0,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeftTab: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeTabContainer: {
    paddingBottom: 10,
    position: 'relative',
  },
  tabContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  activeTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#1d4ed8',
    borderRadius: 2,
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#475569',
    marginBottom: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },

  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },

  step2Container: {
    gap: 16,
  },
  cyanBanner: {
    backgroundColor: '#00FFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 2,
  },
  cyanBannerText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },

  /* ERROR ALERT BOX */
  errorAlertBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorAlertText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#991b1b',
    flex: 1,
  },
  errorAlertCloseBtn: {
    padding: 4,
    marginLeft: 8,
  },
  errorAlertCloseText: {
    fontSize: 14,
    color: '#991b1b',
    fontWeight: '700',
  },

  /* SECTION TABLES & CARDS */
  sectionCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    overflow: 'hidden',
  },

  /* PEACH HEADER ROW */
  peachHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F7C096',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerCell: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  peachHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },

  /* YELLOW SUBHEADER ROW */
  yellowSubHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  subHeaderCell: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  yellowHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },

  /* INPUT ROW */
  inputRow: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  inputCell: {
    justifyContent: 'center',
  },
  tableSelectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
  },
  selectInputPressed: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  tableSelectVal: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  tablePlaceholder: {
    fontSize: 13,
    color: '#64748b',
  },
  tableChevron: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginLeft: 6,
  },
  clearBtnIcon: {
    padding: 4,
    marginLeft: 6,
  },
  clearBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },

  /* FOOTER BUTTON */
  searchBtnContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  kotasyonAraBtn: {
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#1d4ed8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  kotasyonAraBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  /* SHARED BUTTONS */
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#64748b',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  btnPressed: {
    opacity: 0.8,
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  pickerCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCloseBtnText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  pickerOptionsList: {
    gap: 8,
  },
  pickerOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  pickerOptionTextSelected: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  pickerOptionSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 14,
    color: '#1d4ed8',
    fontWeight: 'bold',
  },

  /* LIVE SEARCH PICKER INPUT */
  modalSearchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  modalSearchIcon: {
    fontSize: 14,
  },
  modalSearchTextInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  modalSearchClearBtn: {
    padding: 4,
  },
  modalSearchClearText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  searchMinCharHintBox: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchMinCharHintText: {
    fontSize: 12,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
  },
  noResultsBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 13,
    color: '#94a3b8',
  },

  /* CHECKBOX UI */
  checkboxOuter: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxOuterActive: {
    borderColor: '#1d4ed8',
    backgroundColor: '#1d4ed8',
  },
  checkboxInner: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: '#ffffff',
  },

  /* SEARCH RESULTS MODAL WIDE STYLES (OPTIMIZED FOR MOBILE PORTRAIT & WEB) */
  resultsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Platform.OS === 'web' ? 16 : 8,
  },
  resultsModalCardWide: {
    width: Platform.OS === 'web' ? '96%' : '100%',
    maxWidth: 1380,
    height: Platform.OS === 'web' ? '88%' : '94%',
    maxHeight: '96%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: Platform.OS === 'web' ? 16 : 10,
    gap: Platform.OS === 'web' ? 12 : 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  resultsModalTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultsModalSub: {
    fontSize: Platform.OS === 'web' ? 13 : 11,
    color: '#475569',
    marginTop: 2,
  },

  /* LOCATION BANNER ROW */
  locationBannerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Platform.OS === 'web' ? 12 : 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 8,
    paddingVertical: Platform.OS === 'web' ? 10 : 6,
  },
  locBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locBadgeLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '600',
    color: '#64748b',
  },
  locBadgeVal: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '700',
    color: '#0f172a',
  },

  /* FILTER CONTROL ROW */
  filterControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterCheckboxText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },

  /* TABLE DYNAMIC SCROLL & LAYOUT */
  tableHorizontalScrollView: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
  },
  tableVerticalScrollView: {
    flex: 1,
  },
  tableContainer: {
    minWidth: 1100,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
  },
  thCell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#334155',
  },
  thText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  tableBodyRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  specialCustomerRow: {
    backgroundColor: '#8cbf26',
  },
  altTableRow: {
    backgroundColor: '#f8fafc',
  },
  tdCell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  tdText: {
    fontSize: 12,
    color: '#1e293b',
    textAlign: 'center',
  },
  tdTextMuted: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  linkText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  priceValueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
  },
  landSelectBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  landSelectSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#b45309',
  },

  /* BADGES */
  badgeDanger: {
    backgroundColor: '#FCEBEB',
    borderColor: '#F09595',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  badgeDangerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A32D2D',
  },
  badgeWarning: {
    backgroundColor: '#FAEEDA',
    borderColor: '#EF9F27',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  badgeWarningText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#633806',
  },
  noteIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#eab308',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteIconText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
  },
  viewIconBtn: {
    padding: 4,
  },
  viewIconText: {
    fontSize: 15,
  },
  detailBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* RESULTS FOOTER (OPTIMIZED FOR MOBILE PORTRAIT) */
  resultsModalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },

  /* INFO / DETAILS MODAL */
  infoModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 22,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  infoModalBodyText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  /* QD (KOTASYON DETAY) MODAL STYLES MATCHING WEBSITE SCREENSHOT */
  qdCardContainer: {
    width: Platform.OS === 'web' ? '90%' : '94%',
    maxWidth: 720,
    height: Platform.OS === 'web' ? '85%' : '88%',
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  qdHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  qdTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  qdCloseBtn: {
    padding: 6,
  },
  qdCloseBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  qdScrollContainer: {
    flex: 1,
    flexShrink: 1,
  },
  qdSectionBox: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  qdBannerOrange: {
    backgroundColor: '#fba76d',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  qdBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  qdBannerBrightOrange: {
    backgroundColor: '#ff6b2b',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  qdBannerBrightTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  qdGridBody: {
    padding: 12,
    backgroundColor: '#ffffff',
    gap: 10,
  },
  qdGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  qdGridCol: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 130,
  },
  qdGridColSpan2: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 220,
  },
  qdGridColHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
  },
  qdLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  qdVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  qdTableContainer: {
    backgroundColor: '#ffffff',
  },
  qdTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fed7aa',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fdba74',
  },
  qdThText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  qdTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  qdTdText: {
    fontSize: 12,
    color: '#334155',
  },
});

