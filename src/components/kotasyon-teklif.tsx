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
import { QuotationForCreateOfferModel } from '@/types/quotation';
import { getOrFetchAllPorts, globalContainerMap, OptionItem, SearchablePickerModal } from './kotasyon-arama';

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

export function formatCurrencySymbol(curr?: string): string {
  if (!curr) return '€';
  const c = String(curr).trim().toUpperCase();
  if (c === 'USD' || c === '$') return '$';
  if (c === 'EUR' || c === 'EURO' || c === '€') return '€';
  if (c === 'GBP' || c === '£') return '£';
  if (c === 'TRY' || c === 'TL' || c === '₺') return '₺';
  return c;
}

const RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  '$': 1.0,
  EUR: 1.1662,
  EURO: 1.1662,
  '€': 1.1662,
  GBP: 1.3636,
  '£': 1.3636,
  TRY: 0.0245,
  TL: 0.0245,
  '₺': 0.0245,
};

export function convertToUSD(amount: number, currency?: string, customRate?: number): number {
  if (!amount || isNaN(amount)) return 0;
  if (!currency) return amount;
  const c = String(currency).trim().toUpperCase();
  if ((c === 'EUR' || c === 'EURO' || c === '€') && customRate && customRate > 0) {
    return amount * customRate;
  }
  const rate = RATES_TO_USD[c] ?? 1.0;
  return amount * rate;
}

export function convertCurrency(amount: number, fromCurr: string, toCurr: string): number {
  if (!amount || isNaN(amount)) return 0;
  if (!fromCurr || !toCurr || fromCurr.toUpperCase() === toCurr.toUpperCase()) return amount;

  const usdValue = convertToUSD(amount, fromCurr);
  const targetCurr = toCurr.trim().toUpperCase();

  let targetRate = RATES_TO_USD[targetCurr] ?? 1.0;
  if (targetCurr === 'EUR' || targetCurr === 'EURO' || targetCurr === '€') {
    targetRate = 1.1662;
  } else if (targetCurr === 'GBP' || targetCurr === '£') {
    targetRate = 1.3636;
  }

  if (targetRate <= 0) return usdValue;
  const result = usdValue / targetRate;
  return Math.round(result * 100) / 100;
}

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

export function getAutoKdvForExpense(expenseName?: string): string {
  if (!expenseName) return '0';
  const name = expenseName.trim().toUpperCase();
  if (
    name.includes('NAVLUN') ||
    name.includes('FREIGHT') ||
    name.includes('EMISSION') ||
    name.includes('FUEL') ||
    name.includes('SURCHARGE') ||
    name.includes('BAF') ||
    name.includes('CAF') ||
    name.includes('EBS')
  ) {
    return '0';
  }
  return '20';
}

export async function fetchExpenseInfo(
  expenseRid: string,
  baseUrl: string,
  token: string
): Promise<{ rid?: string; masraf?: string; kdv?: number; unitname?: string; masrafkodu?: string } | null> {
  const cleanRid = cleanGuidOrUndefined(expenseRid);
  if (!cleanRid) return null;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}/ExpenseType/GetExpenseInfo`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expenserid: cleanRid, EXPENSERID: cleanRid }),
    }).catch(() => null);

    if (res && res.ok) {
      const data = await res.json().catch(() => null);
      if (data) {
        const norm = normalizeKeysDeep(data);
        console.log('[GetExpenseInfo SUCCESS]', cleanRid, norm);

        const kdvRaw =
          norm.expensekdv ??
          norm.kdv ??
          norm.vat ??
          data?.expensekdv ??
          data?.EXPENSEKDV ??
          data?.kdv;

        const unitNameRaw =
          norm.expensebeher ??
          norm.unitname ??
          norm.beher ??
          norm.unit ??
          data?.expensebeher ??
          data?.EXPENSEBEHER ??
          data?.unitname;

        const masrafRaw =
          norm.expensename ??
          norm.expensetype ??
          norm.masraf ??
          norm.masrafing ??
          norm.optionlabel ??
          norm.name ??
          data?.expensename ??
          data?.EXPENSENAME ??
          data?.masraf;

        return {
          rid: norm.rid || norm.expenserid || cleanRid,
          masraf: masrafRaw ? String(masrafRaw) : undefined,
          kdv: kdvRaw !== undefined && kdvRaw !== null && String(kdvRaw) !== '' ? Number(kdvRaw) : undefined,
          unitname: unitNameRaw ? String(unitNameRaw) : undefined,
          masrafkodu: norm.masrafkodu,
        };
      }
    }
  } catch (err) {
    console.log('[GetExpenseInfo ERROR]', err);
  }
  return null;
}

export interface ExpenseItem {
  id: string;
  allIn: string; // "Evet" | "Hayır"
  masrafTipi: string;
  kdv: string | number;
  miktar: string | number;
  alisFiyati: string | number;
  alisDoviz: string;
  alisTarafi: string;
  alisTarafiRid?: string;
  satisFiyati: string | number;
  satisDoviz: string;
  beher: string;
  satisTarafi: string;
  satisTarafiRid?: string;
  isCustomAdded?: boolean;
}

export interface ContainerGroup {
  containerRid: string;
  containerType: string;
  isAllIn?: boolean;
  allInRow?: {
    expenseRid?: string;
    masrafTipi?: string;
    satisFiyati: string;
    satisDoviz: string;
    alisDoviz?: string;
    satisTarafi?: string;
  };
  expenses: ExpenseItem[];
}

export interface KotasyonTeklifProps {
  selectedQuotation?: QuotationForCreateOfferModel | any;
  selectedQuotations?: QuotationForCreateOfferModel[];
  searchParams?: any;
  onClose: () => void;
  onBack?: () => void;
  onSaveSuccess?: (offerData: any) => void;
}

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];
const TURKISH_WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const YEAR_OPTIONS: number[] = [];
for (let y = 2015; y <= 2040; y++) {
  YEAR_OPTIONS.push(y);
}

const parseTurkishDate = (dateStr: string): Date => {
  if (!dateStr || !dateStr.includes('/')) return new Date();
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const y = parseInt(parts[2], 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(y, m, d);
    }
  }
  return new Date();
};

const getTodayDateString = (): string => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const isDateAfterMax = (y: number, m: number, d: number, maxDateStr: string): boolean => {
  if (!maxDateStr) return false;
  const maxDate = parseTurkishDate(maxDateStr);
  maxDate.setHours(23, 59, 59, 999);
  const targetDate = new Date(y, m, d, 0, 0, 0, 0);
  return targetDate.getTime() > maxDate.getTime();
};

const INCOTERM_OPTIONS = [
  'Seçiniz',
  'EXW',
  'FCA',
  'FOB',
  'CFR',
  'DAP',
  'DAT',
  'DDP',
];

const ODEME_TIPI_OPTIONS = ['Prepaid', 'Collect'];

const SATIS_CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'TL'];
const BEHER_OPTIONS = ['CNT', 'CBM', 'SET', 'KG', 'BL'];

export function resolveToContainerGuid(rid?: string, name?: string): string | null {
  // 1) Zaten geçerli GUID ise direkt kullan
  const clean = cleanGuidOrUndefined(rid);
  if (clean) return clean;

  // 2) İsimle cache (Select2 / prefetch ile doldurulmuş globalContainerMap)
  const n = String(name || '').toLowerCase().replace(/['"]/g, '').trim();
  if (!n) return null;

  if (globalContainerMap[n]) return globalContainerMap[n];

  // Kısmi eşleşme
  for (const [key, guid] of Object.entries(globalContainerMap)) {
    if (key.includes(n) || n.includes(key)) return guid;
  }

  return null; // asla yanlış hardcoded GUID dönme
}

export function toSiteCurrency(val?: string, fallback = 'EUR'): string {
  const r = String(val || fallback).trim().toUpperCase();
  if (!r || r.includes('SEÇ') || r.includes('SEC')) return fallback;
  if (r === 'EURO' || r === 'EUR' || r === '€') return 'EUR';
  if (r === 'USD' || r === '$') return 'USD';
  if (r === 'GBP' || r === '£') return 'GBP';
  if (r === 'TRY' || r === 'TL' || r === '₺') return 'TL';
  return r;
}

export function normalizeSellCurrency(val?: string, fallbackAlis?: string): string {
  return toSiteCurrency(val, toSiteCurrency(fallbackAlis, 'EUR'));
}

export function toMoneyString(val: any): string {
  if (val === null || val === undefined || val === '') return '0';
  return String(val).replace(/\s/g, '').replace(',', '.');
}

export function rowProfitStr(exp: ExpenseItem): { text: string; num: number } {
  const qty = parseFloat(toMoneyString(exp.miktar)) || 1;
  const buy = (parseFloat(toMoneyString(exp.alisFiyati)) || 0) * qty;
  const sell = (parseFloat(toMoneyString(exp.satisFiyati)) || 0) * qty;
  const buyUSD = convertToUSD(buy, exp.alisDoviz);
  const sellUSD = convertToUSD(sell, normalizeSellCurrency(exp.satisDoviz, exp.alisDoviz));
  const p = sellUSD - buyUSD;
  if (isNaN(p)) return { text: '—', num: 0 };
  const isNeg = p < 0;
  const isPos = p > 0;
  const text = `${isNeg ? '-' : isPos ? '+' : ''}${Math.abs(p).toFixed(2)} $`;
  return { text, num: p };
}


function parseExpenseItem(
  rawItem: any,
  fallbackLine?: string,
  fallbackCustomer?: string
): ExpenseItem {
  const allInVal =
    rawItem?.allin === 'Evet' ||
      rawItem?.ALLIN === 'Evet' ||
      rawItem?.isallin === 1 ||
      rawItem?.ISALLIN === 1
      ? 'Evet'
      : 'Hayır';

  const masrafName =
    rawItem?.optionlabel ||
    rawItem?.OPTIONLABEL ||
    rawItem?.expensetype ||
    rawItem?.EXPENSETYPE ||
    rawItem?.expenseType ||
    rawItem?.optionname ||
    rawItem?.OPTIONNAME ||
    rawItem?.optionName ||
    rawItem?.type ||
    rawItem?.TYPE ||
    rawItem?.expensename ||
    rawItem?.EXPENSENAME ||
    rawItem?.masraftipi ||
    rawItem?.MASRAFTIPI ||
    rawItem?.name ||
    rawItem?.NAME ||
    '';

  const kdvVal =
    rawItem?.expensekdv ??
    rawItem?.EXPENSEKDV ??
    rawItem?.kdv ??
    rawItem?.KDV ??
    rawItem?.vat ??
    rawItem?.VAT ??
    '0';

  const miktarVal =
    rawItem?.piece ??
    rawItem?.PIECE ??
    rawItem?.miktar ??
    rawItem?.MIKTAR ??
    rawItem?.quantity ??
    rawItem?.QUANTITY ??
    rawItem?.count ??
    rawItem?.COUNT ??
    '1';

  const alisFiyatiVal =
    rawItem?.buyingcost ??
    rawItem?.BUYINGCOST ??
    rawItem?.buyingprice ??
    rawItem?.BUYINGPRICE ??
    rawItem?.alisfiyati ??
    rawItem?.ALISFIYATI ??
    rawItem?.alisFiyati ??
    rawItem?.containerextendedcost ??
    rawItem?.CONTAINEREXTENDEDCOST ??
    rawItem?.containercost ??
    rawItem?.CONTAINERCOST ??
    rawItem?.purchaseprice ??
    rawItem?.PURCHASEPRICE ??
    rawItem?.cost ??
    rawItem?.COST ??
    rawItem?.amount ??
    rawItem?.AMOUNT ??
    rawItem?.price ??
    rawItem?.PRICE ??
    rawItem?.unitprice ??
    rawItem?.UNITPRICE ??
    '0.00';

  const alisDovizVal =
    rawItem?.buyingcurrency ||
    rawItem?.BUYINGCURRENCY ||
    rawItem?.alisdoviz ||
    rawItem?.ALISDOVIZ ||
    rawItem?.alisDoviz ||
    rawItem?.purchasecurrency ||
    rawItem?.PURCHASECURRENCY ||
    rawItem?.currency ||
    rawItem?.CURRENCY ||
    rawItem?.currencycode ||
    rawItem?.CURRENCYCODE ||
    rawItem?.doviz ||
    rawItem?.DOVIZ ||
    'USD';

  const alisTarafiVal =
    rawItem?.buyingcustomer ||
    rawItem?.BUYINGCUSTOMER ||
    rawItem?.buyinginvoicecustomer ||
    rawItem?.BUYINGINVOICECUSTOMER ||
    rawItem?.alistarafi ||
    rawItem?.ALISTARAFI ||
    rawItem?.alisTarafi ||
    rawItem?.purchaseparty ||
    rawItem?.PURCHASEPARTY ||
    rawItem?.supplier ||
    rawItem?.SUPPLIER ||
    rawItem?.vendor ||
    rawItem?.VENDOR ||
    rawItem?.line ||
    rawItem?.LINE ||
    fallbackLine ||
    '';

  const satisFiyatiVal =
    rawItem?.sellingcost ??
    rawItem?.SELLINGCOST ??
    rawItem?.sellingprice ??
    rawItem?.SELLINGPRICE ??
    rawItem?.satisfiyati ??
    rawItem?.SATISFIYATI ??
    rawItem?.satis_fiyati ??
    rawItem?.SATIS_FIYATI ??
    rawItem?.salesprice ??
    rawItem?.SALESPRICE ??
    rawItem?.salescost ??
    rawItem?.SALESCOST ??
    '';

  const rawSellingCurr =
    rawItem?.sellingcurrency ||
    rawItem?.SELLINGCURRENCY ||
    rawItem?.satisdoviz ||
    rawItem?.SATISDOVIZ ||
    rawItem?.salescurrency ||
    rawItem?.SALESCURRENCY ||
    rawItem?.offercurrency ||
    rawItem?.OFFERCURRENCY ||
    rawItem?.currency ||
    rawItem?.CURRENCY ||
    rawItem?.doviz ||
    rawItem?.DOVIZ ||
    rawItem?.currencycode ||
    rawItem?.CURRENCYCODE;

  const normalizedRawSell =
    rawSellingCurr === 'EUR' || rawSellingCurr === '€'
      ? 'EURO'
      : rawSellingCurr;

  const satisDovizVal = normalizeSellCurrency(normalizedRawSell, alisDovizVal);

  const defaultBeher = String(masrafName).toUpperCase().includes('ENS') ? 'BL' : 'CNT';
  const beherVal =
    rawItem?.beher ||
    rawItem?.BEHER ||
    rawItem?.unit ||
    rawItem?.UNIT ||
    rawItem?.per ||
    rawItem?.PER ||
    defaultBeher;

  const satisTarafiVal =
    rawItem?.salesinvoicecustomer ||
    rawItem?.SALESINVOICECUSTOMER ||
    rawItem?.satistarafi ||
    rawItem?.SATISTARAFI ||
    rawItem?.salesparty ||
    rawItem?.SALESPARTY ||
    fallbackCustomer ||
    '';

  const alisTarafiRid =
    cleanGuidOrUndefined(rawItem?.buyingcustomerrid) ||
    cleanGuidOrUndefined(rawItem?.BUYINGCUSTOMERRID) ||
    cleanGuidOrUndefined(rawItem?.buyinginvoicecustomerrid) ||
    cleanGuidOrUndefined(rawItem?.BUYINGINVOICECUSTOMERRID) ||
    cleanGuidOrUndefined(rawItem?.buyingcustomer_rid) ||
    cleanGuidOrUndefined(rawItem?.loaderrid) ||
    cleanGuidOrUndefined(rawItem?.LOADERRID) ||
    cleanGuidOrUndefined(rawItem?.customer_rid);

  const satisTarafiRid =
    cleanGuidOrUndefined(rawItem?.salesinvoicecustomerrid) ||
    cleanGuidOrUndefined(rawItem?.SALESINVOICECUSTOMERRID) ||
    cleanGuidOrUndefined(rawItem?.sellingcustomerrid) ||
    cleanGuidOrUndefined(rawItem?.SELLINGCUSTOMERRID) ||
    cleanGuidOrUndefined(rawItem?.customer_rid);

  return {
    id:
      rawItem?.expenserid ||
      rawItem?.EXPENSERID ||
      rawItem?.offerexpenserid ||
      rawItem?.OFFEREXPENSERID ||
      rawItem?.quotationexpenserid ||
      rawItem?.QUOTATIONEXPENSERID ||
      rawItem?.id ||
      rawItem?.ID ||
      `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    allIn: allInVal,
    masrafTipi: String(masrafName).toUpperCase(),
    kdv: String(kdvVal),
    miktar: String(miktarVal),
    alisFiyati: String(alisFiyatiVal),
    alisDoviz: toSiteCurrency(alisDovizVal, 'EUR'),
    alisTarafi: String(alisTarafiVal),
    alisTarafiRid: alisTarafiRid,
    satisFiyati: String(satisFiyatiVal),
    satisDoviz: toSiteCurrency(satisDovizVal, toSiteCurrency(alisDovizVal, 'EUR')),
    beher: String(beherVal),
    satisTarafi: String(satisTarafiVal),
    satisTarafiRid: satisTarafiRid,
    isCustomAdded:
      rawItem?.isaddedlater === 1 ||
      rawItem?.ISADDEDLATER === 1 ||
      rawItem?.isCustomAdded === true ||
      rawItem?.iscustomadded === 1 ||
      rawItem?.expensefromtype === 'OFFER' ||
      rawItem?.EXPENSEFROMTYPE === 'OFFER' ||
      rawItem?.expensefromtype === 'CUSTOM' ||
      rawItem?.EXPENSEFROMTYPE === 'CUSTOM',
  };
}

function hasExpenseTypeInfo(item: any): boolean {
  return !!(
    item?.expensetype ||
    item?.EXPENSETYPE ||
    item?.expenseType ||
    item?.expensename ||
    item?.EXPENSENAME ||
    item?.expenseName ||
    item?.masraftipi ||
    item?.MASRAFTIPI ||
    item?.optionname ||
    item?.OPTIONNAME ||
    item?.optionName ||
    item?.type ||
    item?.TYPE
  );
}

/**
 * Merges containersinfo (navlun) and extendedexpenses (additional costs) for each container.
 *
 * containersinfo: [{ containerrid, containertype, containercost, ... }]
 * extendedexpenses: [{ containerrid, optionname, containerextendedcost, type, ... }]
 * offerExpenses (OFFEREXPENSES): full expense list from GetOfferWithRid – if present, use directly.
 */
function buildContainerGroups(
  params: {
    containersinfo?: any[];
    extendedexpenses?: any[];
    OFFEREXPENSES?: any[];
    QUOTATIONCONTAINERS?: any[];
    line?: string;
    customername?: string;
  },
  fallbackLine?: string,
  fallbackCustomer?: string
): ContainerGroup[] {
  const line = params.line || fallbackLine || '';
  const customer = params.customername || fallbackCustomer || '';

  // ── CASE 1: Full OFFEREXPENSES from GetOfferWithRid ──────────────────────────
  const offerExpenses: any[] = (params.OFFEREXPENSES || []).filter(hasExpenseTypeInfo);
  const quotationContainers: any[] = params.QUOTATIONCONTAINERS || [];

  if (offerExpenses.length > 0) {
    const groupMap = new Map<string, { type: string; expenses: ExpenseItem[] }>();

    // Seed container types from QUOTATIONCONTAINERS
    quotationContainers.forEach((c: any, idx: number) => {
      const cRid = c.CONTAINERRID || c.containerrid || `cont_${idx}`;
      const cType =
        c.CONTAINERTYPE || c.containertype ||
        c.CONTAINERTYPESHORT || c.containertypeshort || '40 High Cube';
      if (!groupMap.has(cRid)) groupMap.set(cRid, { type: cType, expenses: [] });
    });

    offerExpenses.forEach((exp: any) => {
      const expType =
        exp.CONTAINERTYPE || exp.containertype ||
        exp.CONTAINERTYPESHORT || exp.containertypeshort || '';

      let cRid =
        cleanGuidOrUndefined(exp.CONTAINERRID) ||
        cleanGuidOrUndefined(exp.containerrid) ||
        cleanGuidOrUndefined(exp.CONTAINERTYPERID) ||
        cleanGuidOrUndefined(exp.containertyperid);

      // If cRid not provided or not in groupMap, try matching by container type name
      if ((!cRid || !groupMap.has(cRid)) && expType) {
        for (const [key, val] of groupMap.entries()) {
          if (val.type.toLowerCase() === expType.toLowerCase()) {
            cRid = key;
            break;
          }
        }
      }

      if (!cRid || !groupMap.has(cRid)) {
        cRid = Array.from(groupMap.keys())[0] || 'cont_default';
      }

      const finalType = expType || groupMap.get(cRid)?.type || '40 High Cube';

      if (!groupMap.has(cRid)) groupMap.set(cRid, { type: finalType, expenses: [] });
      groupMap.get(cRid)!.expenses.push(parseExpenseItem(exp, line, customer));
    });

    const result: ContainerGroup[] = [];
    groupMap.forEach((val, key) => {
      result.push({ containerRid: key, containerType: val.type, expenses: val.expenses });
    });
    if (result.length > 0) return result;
  }

  // ── CASE 2: containersinfo + extendedexpenses ─────────────────────────────────
  const containersinfo: any[] = params.containersinfo || [];
  const extendedexpenses: any[] = params.extendedexpenses || [];

  if (containersinfo.length === 0) return [];

  return containersinfo.map((c: any, idx: number) => {
    const cRid = c.containerrid || c.CONTAINERRID || c.id || `cont_${idx}`;
    const cType =
      c.containertype || c.CONTAINERTYPE ||
      c.containertypeshort || c.CONTAINERTYPESHORT ||
      c.name || '40 High Cube';
    const baseCost = c.containercost ?? c.CONTAINERCOST ?? '0.00';
    // currency for navlun – try to read from containersinfo, default EUR
    const baseCurrency = c.currency || c.CURRENCY || c.doviz || 'EUR';

    const expenses: ExpenseItem[] = [
      // Row 1: Navlun
      parseExpenseItem(
        {
          expensetype: 'DENİZYOLU NAVLUN ÜCRETİ',
          alisfiyati: baseCost,
          alisdoviz: baseCurrency,
          alistarafi: line,
          containerrid: cRid,
        },
        line,
        customer
      ),
    ];

    // Rows 2+: Extended expenses filtered by containerrid
    const containerExtended = extendedexpenses.filter(
      (ext: any) => (ext.containerrid || ext.CONTAINERRID) === cRid
    );

    containerExtended.forEach((ext: any) => {
      expenses.push(parseExpenseItem(ext, line, customer));
    });

    return { containerRid: cRid, containerType: cType, expenses };
  });
}

function extractUserRid(token?: string, user?: any): string | null {
  // A) user objesinden GUID
  const candidates = [
    user?.RID, user?.rid, user?.USERRID, user?.userrid,
    user?.UserRid, user?.userRid, user?.userAccountRid,
    user?.USERACCOUNTRID, user?.Id, user?.id,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(c.trim())) {
      return c.trim();
    }
  }

  // B) JWT payload
  if (!token || typeof token !== 'string') return null;
  try {
    const raw = token.replace(/^Bearer\s+/i, '').trim();
    const part = raw.split('.')[1];
    if (!part) return null;

    // base64url
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';

    const b64Decode = (str: string): string => {
      if (typeof atob !== 'undefined') return atob(str);
      if (typeof (globalThis as any).Buffer !== 'undefined') return (globalThis as any).Buffer.from(str, 'base64').toString('utf8');
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let output = '';
      let bc = 0;
      let bs = 0;
      let buffer: string;
      for (let idx = 0; idx < str.length; idx++) {
        buffer = str.charAt(idx);
        const charIndex = chars.indexOf(buffer);
        if (charIndex !== -1) {
          bs = bc % 4 ? bs * 64 + charIndex : charIndex;
          if (bc++ % 4) output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
        }
      }
      return output;
    };

    const json = b64Decode(b64);
    const p = JSON.parse(json);
    const rid =
      p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      p.sub ||
      p.nameid ||
      p.USERRID ||
      p.userrid ||
      p.UserRid;

    if (typeof rid === 'string' && /^[0-9a-fA-F-]{36}$/i.test(rid)) {
      return rid;
    }
  } catch (e) {
    console.log('[extractUserRid] error', e);
  }
  return null;
}

function isGuid(val: any): boolean {
  return cleanGuidOrUndefined(val) !== undefined;
}

function calcTotals(groups: ContainerGroup[]) {
  let buyUSD = 0;
  let sellUSD = 0;

  groups.forEach((g) => {
    if (g.isAllIn && g.allInRow) {
      const allInBuyTotal = g.expenses.reduce((acc, e) => {
        if (e.allIn === 'Hayır') return acc;
        const qty = parseFloat(String(e.miktar).replace(',', '.')) || 1;
        const buy = (parseFloat(String(e.alisFiyati).replace(',', '.')) || 0) * qty;
        return acc + convertToUSD(buy, e.alisDoviz);
      }, 0);
      buyUSD += allInBuyTotal;

      const sellVal = parseFloat(String(g.allInRow.satisFiyati).replace(',', '.'));
      if (!isNaN(sellVal)) {
        sellUSD += convertToUSD(sellVal, g.allInRow.satisDoviz || 'EURO');
      }
    } else {
      g.expenses.forEach((e) => {
        const qty = parseFloat(String(e.miktar).replace(',', '.')) || 1;
        const buy = (parseFloat(String(e.alisFiyati).replace(',', '.')) || 0) * qty;
        const sell = (parseFloat(String(e.satisFiyati).replace(',', '.')) || 0) * qty;
        buyUSD += convertToUSD(buy, e.alisDoviz);
        sellUSD += convertToUSD(sell, e.satisDoviz);
      });
    }
  });

  const eurRate = RATES_TO_USD.EUR || 1.1662;
  const gbpRate = RATES_TO_USD.GBP || 1.3636;

  const buyEUR = buyUSD > 0 ? buyUSD / eurRate : 0;
  const buyGBP = buyUSD > 0 ? buyUSD / gbpRate : 0;

  const sellEUR = sellUSD > 0 ? sellUSD / eurRate : 0;
  const sellGBP = sellUSD > 0 ? sellUSD / gbpRate : 0;

  return {
    buy: {
      USD: buyUSD.toFixed(2),
      EURO: buyEUR.toFixed(2),
      GBP: buyGBP.toFixed(2),
    },
    sell: {
      USD: sellUSD.toFixed(2),
      EURO: sellEUR.toFixed(2),
      GBP: sellGBP.toFixed(2),
    },
    profitUSD: (sellUSD - buyUSD).toFixed(2),
  };
}

function renderDesignItem({
  label,
  value,
  hasInfoIcon = true,
  pdfHide = false,
  hasMenuIcon = false,
  isDropdown = false,
  placeholder = '',
  isEditable = false,
  onPress,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  hasInfoIcon?: boolean;
  pdfHide?: boolean;
  hasMenuIcon?: boolean;
  isDropdown?: boolean;
  placeholder?: string;
  isEditable?: boolean;
  onPress?: () => void;
  onChangeText?: (text: string) => void;
  keyboardType?: 'default' | 'numeric';
}) {
  const displayVal = value || placeholder || '';
  const isMuted = !value;

  return (
    <View style={styles.designFieldContainer}>
      {/* LABEL */}
      <View style={styles.designLabelCol}>
        <ThemedText style={styles.designLabelText} numberOfLines={2}>
          {label}
        </ThemedText>
      </View>

      {/* VALUE BOX */}
      <View style={styles.designValueBoxWrapper}>
        {isEditable && onChangeText ? (
          <TextInput
            style={styles.designInputBox}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#94a3b8"
            keyboardType={keyboardType}
          />
        ) : isEditable && onPress ? (
          <Pressable onPress={onPress} style={styles.designDropdownBox}>
            <ThemedText
              style={[styles.designValueText, isMuted && styles.designMutedText]}
              numberOfLines={1}
            >
              {displayVal || '—'}
            </ThemedText>
            <ThemedText style={styles.designDropdownArrow}>▼</ThemedText>
          </Pressable>
        ) : (
          <View style={styles.designStaticBox}>
            <ThemedText
              style={[styles.designValueText, isMuted && styles.designMutedText]}
              numberOfLines={1}
            >
              {displayVal || '—'}
            </ThemedText>
            {isDropdown && <ThemedText style={styles.designDropdownArrow}>▼</ThemedText>}
          </View>
        )}
      </View>
    </View>
  );
}

function cleanGuidOrUndefined(val: any): string | undefined {
  if (!val || typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return undefined;
  if (trimmed.length === 36 && trimmed.includes('-')) return trimmed;
  return undefined;
}

export function KotasyonTeklifScreen({
  selectedQuotation,
  selectedQuotations,
  searchParams,
  onClose,
  onBack,
  onSaveSuccess,
}: KotasyonTeklifProps) {
  const theme = useTheme();
  const responsive = useResponsive();
  const isMobile = responsive.isMobile;
  const isMobilePortrait = responsive.isMobile && !responsive.isLandscape;
  const insets = useSafeAreaInsets();
  const authContext = useAuth();
  const { user, token, apiUrl: contextApiUrl } = authContext || {};
  const authToken = token || user?.TOKEN || user?.token || '';
  const activeBaseUrl = (contextApiUrl || DEFAULT_API_URL).trim().replace(/\/$/, '');

  // Extract initial primary quotation
  const primaryQuotation: QuotationForCreateOfferModel | undefined =
    selectedQuotation || (selectedQuotations && selectedQuotations[0]);

  const isIthalat = isImportCommercialType(
    searchParams?.ticariTipi,
    searchParams?.COMMERCIALTYPE,
    searchParams?.commercialType,
    searchParams?.commercialtype,
    searchParams?.commercialTypeState,
    searchParams?.ticari,
    searchParams?.type,
    (primaryQuotation as any)?.commercialtype,
    (primaryQuotation as any)?.COMMERCIALTYPE,
    (primaryQuotation as any)?.commercialType,
    (primaryQuotation as any)?.ticariTipi
  );

  const isDirectImport =
    !primaryQuotation ||
    isIthalat ||
    searchParams?.kotasyonKullanimi === 'Hayır' ||
    searchParams?.kotasyonKullanimi === 'hayır';

  // General Offer Form State
  const [kotasyonNo, setKotasyonNo] = useState<string>(
    primaryQuotation?.quotationno || ''
  );
  const [kotasyonSahibi, setKotasyonSahibi] = useState<string>(
    primaryQuotation?.customername || searchParams?.customerName || ''
  );
  const [hat, setHat] = useState<string>(
    searchParams?.hat || primaryQuotation?.line || (primaryQuotation as any)?.lineName || ''
  );
  const [kotasyonGecerlilik, setKotasyonGecerlilik] = useState<string>(
    primaryQuotation?.quotationvaliditydate || (primaryQuotation as any)?.validitydate || searchParams?.kotasyonGecerlilik || ''
  );
  const [transitTime, setTransitTime] = useState<string>(
    primaryQuotation?.transittime !== undefined && primaryQuotation.transittime !== null ? String(primaryQuotation.transittime) : ''
  );
  const [freeTime, setFreeTime] = useState<string>(
    primaryQuotation?.freetime !== undefined && primaryQuotation.freetime !== null ? String(primaryQuotation.freetime) : ''
  );
  const [odemeTipi, setOdemeTipi] = useState<string>(
    primaryQuotation?.payment || searchParams?.odemeTipi || ''
  );
  const [teklifGecerlilik, setTeklifGecerlilik] = useState<string>(
    primaryQuotation?.quotationvaliditydate || (primaryQuotation as any)?.validitydate || searchParams?.kotasyonGecerlilik || getTodayDateString()
  );

  const hasQuotation = !!primaryQuotation;

  const quotationLoadingPortName =
    (primaryQuotation as any)?.loadingport ||
    (primaryQuotation as any)?.LOADINGPORT ||
    (primaryQuotation as any)?.loadingportname ||
    (primaryQuotation as any)?.LOADINGPORTNAME ||
    (primaryQuotation as any)?.loadingportshort ||
    (primaryQuotation as any)?.LOADINGPORTSHORT ||
    (primaryQuotation as any)?.loadingportcode ||
    (primaryQuotation as any)?.LOADINGPORTCODE ||
    (primaryQuotation as any)?.portofloading ||
    (primaryQuotation as any)?.PORTOFLOADING ||
    (primaryQuotation as any)?.pol ||
    (primaryQuotation as any)?.POL ||
    '';

  const quotationDischargePortName =
    (primaryQuotation as any)?.dischargeport ||
    (primaryQuotation as any)?.DISCHARGEPORT ||
    (primaryQuotation as any)?.dischargeportname ||
    (primaryQuotation as any)?.DISCHARGEPORTNAME ||
    (primaryQuotation as any)?.dischargeportshort ||
    (primaryQuotation as any)?.DISCHARGEPORTSHORT ||
    (primaryQuotation as any)?.dischargeportcode ||
    (primaryQuotation as any)?.DISCHARGEPORTCODE ||
    (primaryQuotation as any)?.portofdischarge ||
    (primaryQuotation as any)?.PORTOFDISCHARGE ||
    (primaryQuotation as any)?.pod ||
    (primaryQuotation as any)?.POD ||
    '';

  const [yuklemeYeri, setYuklemeYeri] = useState<string>(
    (primaryQuotation as any)?.loadinglocation ||
    (primaryQuotation as any)?.LOADINGLOCATION ||
    (primaryQuotation as any)?.loadinglocationname ||
    (primaryQuotation as any)?.loadinglocationshort ||
    searchParams?.yuklemeYeri ||
    ''
  );
  const [yuklemeLimani, setYuklemeLimani] = useState<string>(
    hasQuotation ? quotationLoadingPortName : (searchParams?.yuklemeLimani || '')
  );
  const [tahliyeYeri, setTahliyeYeri] = useState<string>(
    (primaryQuotation as any)?.dischargelocation ||
    (primaryQuotation as any)?.DISCHARGELOCATION ||
    (primaryQuotation as any)?.dischargelocationname ||
    (primaryQuotation as any)?.dischargelocationshort ||
    searchParams?.tahliyeYeri ||
    searchParams?.teslimYeri ||
    ''
  );
  const [tahliyeLimani, setTahliyeLimani] = useState<string>(
    hasQuotation ? quotationDischargePortName : (searchParams?.tahliyeLimani || searchParams?.teslimLimani || '')
  );
  const [dolumTipi, setDolumTipi] = useState<string>(
    primaryQuotation?.fillingtype || searchParams?.dolumTipi || 'Fabrika Dolum'
  );

  // RID states for line, ports, and locations (will be updated when detail endpoint completes)
  const [lineRid, setLineRid] = useState<string | undefined>(
    cleanGuidOrUndefined(searchParams?.lineRID) ||
    cleanGuidOrUndefined(searchParams?.lineRid) ||
    cleanGuidOrUndefined(searchParams?.hatRID) ||
    cleanGuidOrUndefined(searchParams?.hatRid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.linerid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.LINERID) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.lineRid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.lineRID)
  );

  const quotationLoadingPortRid =
    cleanGuidOrUndefined((primaryQuotation as any)?.loadingportrid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.LOADINGPORTRID) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.portofloadingrid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.PORTOFLOADINGRID) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.polrid);

  const [loadingPortRid, setLoadingPortRid] = useState<string | undefined>(
    hasQuotation
      ? quotationLoadingPortRid
      : (cleanGuidOrUndefined(searchParams?.loadingPortRID) || cleanGuidOrUndefined(searchParams?.loadingPortRid))
  );

  const quotationDischargePortRid =
    cleanGuidOrUndefined((primaryQuotation as any)?.dischargeportrid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.DISCHARGEPORTRID) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.portofdischargerid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.PORTOFDISCHARGERID) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.podrid);

  const [dischargePortRid, setDischargePortRid] = useState<string | undefined>(
    hasQuotation
      ? quotationDischargePortRid
      : (cleanGuidOrUndefined(searchParams?.dischargePortRID) || cleanGuidOrUndefined(searchParams?.dischargePortRid))
  );

  const [loadingLocationRid, setLoadingLocationRid] = useState<string | undefined>(
    cleanGuidOrUndefined((primaryQuotation as any)?.loadinglocationrid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.LOADINGLOCATIONRID) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.selectedloadinglocationrid) ||
    cleanGuidOrUndefined(searchParams?.loadingLocationRID) ||
    cleanGuidOrUndefined(searchParams?.loadingLocationRid)
  );

  const [dischargeLocationRid, setDischargeLocationRid] = useState<string | undefined>(
    cleanGuidOrUndefined((primaryQuotation as any)?.dischargelocationrid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.DISCHARGELOCATIONRID) ||
    cleanGuidOrUndefined(searchParams?.dischargeLocationRID) ||
    cleanGuidOrUndefined(searchParams?.dischargeLocationRid)
  );

  // View mode & Offer Details states (populated on AddOffer success & GetOfferWithRid)
  const [isViewMode, setIsViewMode] = useState<boolean>(false);
  const [offerNo, setOfferNo] = useState<string>('');
  const [offerOwner, setOfferOwner] = useState<string>('');
  const [createdAt, setCreatedAt] = useState<string>('');
  const [service, setService] = useState<string>('');
  const [shippingMode, setShippingMode] = useState<string>(searchParams?.yuklemeTipi || 'FCL');
  const [offerRidState, setOfferRidState] = useState<string | null>(null);

  const [yanicilik, setYanicilik] = useState<string>(
    (primaryQuotation as any)?.flammability ||
    (primaryQuotation as any)?.FLAMMABILITY ||
    searchParams?.tehlikelilikDurumu ||
    searchParams?.flammability ||
    'Yanıcısız'
  );
  const [yanicilikAciklama, setYanicilikAciklama] = useState<string>(
    (primaryQuotation as any)?.flammabilitydescription ||
    (primaryQuotation as any)?.FLAMMABILITYDESCRIPTION ||
    searchParams?.flammabilityDescription ||
    searchParams?.flammabilitydescription ||
    ''
  );
  const [incoterm, setIncoterm] = useState<string>(searchParams?.incoterm || '');

  const [yukleyici, setYukleyici] = useState<string>(
    primaryQuotation?.customername || searchParams?.customerName || ''
  );
  const [coLoader, setCoLoader] = useState<string>('');

  const [searchModalConfig, setSearchModalConfig] = useState<{
    visible: boolean;
    title: string;
    type: 'hat' | 'location' | 'port' | 'loader';
    placeholder?: string;
    onSelect: (item: OptionItem) => void;
  } | null>(null);

  // Info fields (Yurtiçi & Yurtdışı)
  const [frontShipping, setFrontShipping] = useState<string>(
    String((primaryQuotation as any)?.frontshipping || '')
  );
  const [localExpense, setLocalExpense] = useState<string>(
    String((primaryQuotation as any)?.localexpense || (primaryQuotation as any)?.localexpenses || '')
  );
  const [lastShipping, setLastShipping] = useState<string>(
    String((primaryQuotation as any)?.lastshipping || '')
  );
  const [custom, setCustom] = useState<string>(
    String((primaryQuotation as any)?.custom || '')
  );
  const [documentation, setDocumentation] = useState<string>(
    String((primaryQuotation as any)?.documentation || '')
  );
  const [portExpenses, setPortExpenses] = useState<string>(
    String((primaryQuotation as any)?.portexpenses || '')
  );

  useEffect(() => {
    if (primaryQuotation) {
      const p = primaryQuotation as any;
      if (p.frontshipping != null && p.frontshipping !== '') setFrontShipping(String(p.frontshipping));
      if (p.localexpense != null || p.localexpenses != null) setLocalExpense(String(p.localexpense || p.localexpenses));
      if (p.lastshipping != null && p.lastshipping !== '') setLastShipping(String(p.lastshipping));
      if (p.custom != null && p.custom !== '') setCustom(String(p.custom));
      if (p.documentation != null && p.documentation !== '') setDocumentation(String(p.documentation));
      if (p.portexpenses != null && p.portexpenses !== '') setPortExpenses(String(p.portexpenses));
    }
  }, [primaryQuotation]);

  // Sayfa açıldığında liman listesini arka planda hemen indirmeye başla (kotasyon arama sayfasında olduğu gibi)
  useEffect(() => {
    if (activeBaseUrl) {
      getOrFetchAllPorts(activeBaseUrl, authToken).catch(() => {});
    }
  }, [activeBaseUrl, authToken]);

  const [loaderSearchModal, setLoaderSearchModal] = useState<{
    visible: boolean;
    title: string;
    onSelect: (item: OptionItem) => void;
  } | null>(null);
  const [expenseSearchModal, setExpenseSearchModal] = useState<{
    visible: boolean;
    title: string;
    onSelect: (item: OptionItem) => void;
  } | null>(null);

  // DatePicker Modal State 
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [pickerMode, setPickerMode] = useState<'calendar' | 'month' | 'year'>('calendar');

  const currentYear = calendarDate.getFullYear();
  const currentMonth = calendarDate.getMonth();

  const getCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1; // 0=Mon, 6=Sun
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    const daysInMonth = lastDay.getDate();
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();

    const days: { day: number; isCurrent: boolean; month: number; year: number }[] = [];

    // Prev month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrent: false,
        month: currentMonth === 0 ? 11 : currentMonth - 1,
        year: currentMonth === 0 ? currentYear - 1 : currentYear,
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        day: d,
        isCurrent: true,
        month: currentMonth,
        year: currentYear,
      });
    }

    // Next month padding
    const remainder = 7 - (days.length % 7);
    if (remainder < 7) {
      for (let d = 1; d <= remainder; d++) {
        days.push({
          day: d,
          isCurrent: false,
          month: currentMonth === 11 ? 0 : currentMonth + 1,
          year: currentMonth === 11 ? currentYear + 1 : currentYear,
        });
      }
    }
    return days;
  };

  const calendarDays = getCalendarDays();

  // Loading state for fetching live container expenses
  const [isLoadingExpenses, setIsLoadingExpenses] = useState<boolean>(true);

  // Expenses per container group state – start empty while API loads
  const [containerGroups, setContainerGroups] = useState<ContainerGroup[]>([]);

  // ── Fetch live data from backend on mount ──────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const fetchLiveExpenses = async () => {
      const qRid =
        (primaryQuotation as any)?.quotationrid ||
        (primaryQuotation as any)?.RID ||
        (primaryQuotation as any)?.rid;
      const oRid =
        (primaryQuotation as any)?.offerrid ||
        (primaryQuotation as any)?.OFFERRID;

      const lineVal =
        (primaryQuotation as any)?.line ||
        searchParams?.hat || '';
      const customerVal =
        (primaryQuotation as any)?.customername ||
        searchParams?.customerName || '';

      setIsLoadingExpenses(true);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      }

      // ── Strategy 1: GetOfferWithRid (ONLY when real OFFERRID exists for editing existing offer) ──
      if (oRid) {
        const res = await fetch(`${activeBaseUrl}/Offer/GetOfferWithRid`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ OFFERRID: oRid, MODE: 'edit', CONTYPE: 'MSSQL' }),
        }).catch(() => null);

        if (res?.ok) {
          const data = await res.json().catch(() => null);
          if (data && (data.OFFEREXPENSES?.length || data.offerexpenses?.length)) {
            const groups = buildContainerGroups(
              {
                OFFEREXPENSES: data.OFFEREXPENSES || data.offerexpenses || [],
                QUOTATIONCONTAINERS: data.QUOTATIONCONTAINERS || data.quotationcontainers || []
              },
              lineVal, customerVal
            );
            if (isMounted && groups.length > 0) {
              setContainerGroups(groups);
              setIsLoadingExpenses(false);
              return;
            }
          }
        }
      }

      // ── Strategy 2: GetQuotationDetailWithRid (Same endpoint as kotasyon-arama) ──
      if (qRid) {
        const qCustomerRID =
          cleanGuidOrUndefined((primaryQuotation as any)?.customerrid) ||
          cleanGuidOrUndefined((primaryQuotation as any)?.CUSTOMERRID) ||
          cleanGuidOrUndefined(searchParams?.customerRID) ||
          cleanGuidOrUndefined(searchParams?.customerRid) ||
          cleanGuidOrUndefined(searchParams?.customerrid) ||
          null;

        const qLoaderRID =
          cleanGuidOrUndefined((primaryQuotation as any)?.loaderrid) ||
          cleanGuidOrUndefined((primaryQuotation as any)?.LOADERRID) ||
          cleanGuidOrUndefined(searchParams?.loaderRID) ||
          cleanGuidOrUndefined(searchParams?.loaderRid) ||
          qCustomerRID ||
          null;

        const qLoadingRID =
          cleanGuidOrUndefined((primaryQuotation as any)?.selectedloadinglocationrid) ||
          cleanGuidOrUndefined((primaryQuotation as any)?.loadinglocationrid) ||
          cleanGuidOrUndefined(searchParams?.loadingLocationRID) ||
          cleanGuidOrUndefined(searchParams?.loadingLocationRid) ||
          null;

        const body: Record<string, any> = {
          QUOTATIONRID: qRid,
          CUSTOMERRID: qCustomerRID,
          LOADERRID: qLoaderRID,
          CONTYPE: 'MSSQL',
        };
        if (qLoadingRID) {
          body.SELECTEDLOADINGLOCATIONRID = qLoadingRID;
        }

        console.log('[TEKLIF QUOTATION DETAIL REQ]', JSON.stringify(body));

        try {
          const detailRes = await fetch(`${activeBaseUrl}/Quotation/GetQuotationDetailWithRid`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          }).catch(() => null);

          if (detailRes && detailRes.ok) {
            const rawData = await detailRes.json().catch(() => null);
            if (rawData) {
              const data = normalizeKeysDeep(rawData);
              console.log('[TEKLIF QUOTATION DETAIL RES]', qRid, JSON.stringify(data).slice(0, 500));
              console.log('[TEKLIF DETAIL] linerid:', data.linerid || data.linerid || data.lineRid || data.lineRID);

              const foundLineRid = cleanGuidOrUndefined(data.linerid || data.linerid || data.lineRid || data.lineRID || data.hatrid || data.hatrid);
              if (foundLineRid) setLineRid(foundLineRid);

              const foundLoadingPortRid = cleanGuidOrUndefined(
                data.loadingportrid || data.LOADINGPORTRID || data.portofloadingrid || data.PORTOFLOADINGRID || data.polrid
              );
              if (foundLoadingPortRid) setLoadingPortRid(foundLoadingPortRid);

              const foundDischargePortRid = cleanGuidOrUndefined(
                data.dischargeportrid || data.DISCHARGEPORTRID || data.portofdischargerid || data.PORTOFDISCHARGERID || data.podrid
              );
              if (foundDischargePortRid) setDischargePortRid(foundDischargePortRid);

              const foundLoadingLocationRid = cleanGuidOrUndefined(
                data.loadinglocationrid || data.LOADINGLOCATIONRID || data.selectedloadinglocationrid
              );
              if (foundLoadingLocationRid) setLoadingLocationRid(foundLoadingLocationRid);

              const foundDischargeLocationRid = cleanGuidOrUndefined(
                data.dischargelocationrid || data.DISCHARGELOCATIONRID
              );
              if (foundDischargeLocationRid) setDischargeLocationRid(foundDischargeLocationRid);

              const foundLoadingPortName =
                data.loadingport ||
                data.LOADINGPORT ||
                data.loadingportname ||
                data.LOADINGPORTNAME ||
                data.loadingportshort ||
                data.LOADINGPORTSHORT ||
                data.portofloading ||
                data.PORTOFLOADING ||
                data.pol ||
                data.POL;
              if (foundLoadingPortName && String(foundLoadingPortName).trim() !== '') {
                setYuklemeLimani(String(foundLoadingPortName).trim());
              }

              const foundDischargePortName =
                data.dischargeport ||
                data.DISCHARGEPORT ||
                data.dischargeportname ||
                data.DISCHARGEPORTNAME ||
                data.dischargeportshort ||
                data.DISCHARGEPORTSHORT ||
                data.portofdischarge ||
                data.PORTOFDISCHARGE ||
                data.pod ||
                data.POD;
              if (foundDischargePortName && String(foundDischargePortName).trim() !== '') {
                setTahliyeLimani(String(foundDischargePortName).trim());
              }

              const foundLoadingLocationName =
                data.loadinglocation ||
                data.LOADINGLOCATION ||
                data.loadinglocationname ||
                data.LOADINGLOCATIONNAME ||
                data.loadinglocationshort;
              if (foundLoadingLocationName && String(foundLoadingLocationName).trim() !== '') {
                setYuklemeYeri(String(foundLoadingLocationName).trim());
              }

              const foundDischargeLocationName =
                data.dischargelocation ||
                data.DISCHARGELOCATION ||
                data.dischargelocationname ||
                data.DISCHARGELOCATIONNAME ||
                data.dischargelocationshort;
              if (foundDischargeLocationName && String(foundDischargeLocationName).trim() !== '') {
                setTahliyeYeri(String(foundDischargeLocationName).trim());
              }

              if (data.line) setHat(String(data.line));

              if (data.frontshipping != null) setFrontShipping(String(data.frontshipping));
              if (data.localexpense != null || data.localexpenses != null) setLocalExpense(String(data.localexpense || data.localexpenses));
              if (data.lastshipping != null) setLastShipping(String(data.lastshipping));
              if (data.custom != null) setCustom(String(data.custom));
              if (data.documentation != null) setDocumentation(String(data.documentation));
              if (data.portexpenses != null) setPortExpenses(String(data.portexpenses));

              const ownerFromApi = data.quotationowner || data.salesperson || data.customername || data.customer || '';
              if (ownerFromApi) {
                setKotasyonSahibi(String(ownerFromApi));
              }

              const detailExpenses: any[] = [
                ...(Array.isArray(data.quotationexpensedetail) ? data.quotationexpensedetail : []),
                ...(Array.isArray(data.quotationExpenseDetail) ? data.quotationExpenseDetail : []),
              ];

              // Merge navlun container costs from containersinfo if missing
              // Resolve primary container type & RID from quotation header / search params
              const primaryQuotationContainerType =
                (primaryQuotation as any)?.containertype ||
                (primaryQuotation as any)?.CONTAINERTYPE ||
                (primaryQuotation as any)?.containertypeshort ||
                (primaryQuotation as any)?.containersinfo?.[0]?.containertype ||
                (primaryQuotation as any)?.containersinfo?.[0]?.CONTAINERTYPE ||
                data?.containertype ||
                data?.CONTAINERTYPE ||
                data?.containersinfo?.[0]?.containertype ||
                searchParams?.konteynerTipi ||
                (Array.isArray(searchParams?.konteynerTipleri) ? searchParams?.konteynerTipleri?.[0] : searchParams?.konteynerTipleri) ||
                '40 High Cube';

              const primaryQuotationContainerRid =
                cleanGuidOrUndefined((primaryQuotation as any)?.containerrid) ||
                cleanGuidOrUndefined((primaryQuotation as any)?.CONTAINERRID) ||
                cleanGuidOrUndefined((primaryQuotation as any)?.containersinfo?.[0]?.containerrid) ||
                cleanGuidOrUndefined((primaryQuotation as any)?.containersinfo?.[0]?.id) ||
                cleanGuidOrUndefined(data?.containersinfo?.[0]?.containerrid) ||
                resolveToContainerGuid(undefined, primaryQuotationContainerType) ||
                'a992765f-1f8d-4a05-945c-2e621d9ab1a1';

              console.log('[RESOLVED QUOTATION CONTAINER TYPE]', primaryQuotationContainerType, primaryQuotationContainerRid);

              if (detailExpenses.length > 0) {
                const groupMap = new Map<string, { rid: string; type: string; expenses: ExpenseItem[] }>();

                // Seed container groups from containersinfo or primaryQuotationContainerType
                const contInfo = data.containersinfo || data.containers || (primaryQuotation as any)?.containersinfo || [];
                if (Array.isArray(contInfo) && contInfo.length > 0) {
                  contInfo.forEach((c: any) => {
                    const cType = c.containertype || c.CONTAINERTYPE || c.containertypeshort || primaryQuotationContainerType;
                    const cRid = resolveToContainerGuid(c.containerrid || c.CONTAINERRID || c.id, cType) || primaryQuotationContainerRid;
                    if (!groupMap.has(cType.toUpperCase())) {
                      groupMap.set(cType.toUpperCase(), { rid: cRid, type: cType, expenses: [] });
                    }
                  });
                }

                if (groupMap.size === 0) {
                  groupMap.set(primaryQuotationContainerType.toUpperCase(), {
                    rid: primaryQuotationContainerRid,
                    type: primaryQuotationContainerType,
                    expenses: [],
                  });
                }

                // Parse and distribute detailExpenses into container groups
                detailExpenses.forEach((exp: any) => {
                  const item = parseExpenseItem(exp, lineVal, customerVal);
                  groupMap.forEach((g) => {
                    const exists = g.expenses.some(
                      (e) => e.id === item.id || (e.masrafTipi === item.masrafTipi && e.alisFiyati === item.alisFiyati)
                    );
                    if (!exists) {
                      g.expenses.push({ ...item });
                    }
                  });
                });

                const groups: ContainerGroup[] = Array.from(groupMap.values()).map((g) => ({
                  containerRid: g.rid,
                  containerType: g.type,
                  expenses: g.expenses,
                }));

                if (isMounted && groups.length > 0) {
                  setContainerGroups(groups);
                  setIsLoadingExpenses(false);
                  return;
                }
              }
            }
          }
        } catch (e: any) {
          console.warn('[TEKLIF QUOTATION DETAIL ERROR]', e?.message);
        }

        // Fallback: GetContainerExpensesFromQuotation if GetQuotationDetailWithRid returns no expenses
        const containerTypeRid =
          cleanGuidOrUndefined((primaryQuotation as any)?.containersinfo?.[0]?.containerrid) ||
          cleanGuidOrUndefined((primaryQuotation as any)?.containersinfo?.[0]?.id) ||
          resolveToContainerGuid(undefined, (primaryQuotation as any)?.containertype || searchParams?.konteynerTipi) ||
          'a992765f-1f8d-4a05-945c-2e621d9ab1a1';

        const expenseReq: any = {
          quotationrid: qRid,
          containertyperid: containerTypeRid,
          customerrid: qCustomerRID,
          loaderrid: qLoaderRID,
        };
        if (qLoadingRID) {
          expenseReq.selectedloadinglocationrid = qLoadingRID;
        }

        const expRes = await fetch(`${activeBaseUrl}/Offer/GetContainerExpensesFromQuotation`, {
          method: 'POST',
          headers,
          body: JSON.stringify(expenseReq),
        }).catch(() => null);

        let expensesFromQuotation: any[] = [];
        if (expRes && expRes.ok) {
          const data = await expRes.json().catch(() => null);
          expensesFromQuotation = Array.isArray(data) ? data : data?.data || [];
        }

        if (isMounted && expensesFromQuotation.length > 0) {
          const mappedItems = expensesFromQuotation.map((e: any) => parseExpenseItem(e, lineVal, customerVal));
          const groups: ContainerGroup[] = [
            {
              containerRid: containerTypeRid || qRid,
              containerType: (primaryQuotation as any)?.containertype || '40 High Cube',
              expenses: mappedItems,
            },
          ];
          setContainerGroups(groups);
          setIsLoadingExpenses(false);
          return;
        }
      }

      // ── Strategy 3: Use already-attached data from kotasyon-arama ──
      const attached = primaryQuotation as any;
      const fallbackList = attached?.extendedexpenses || attached?.containersinfo || [];
      if (Array.isArray(fallbackList) && fallbackList.length > 0) {
        const mappedItems = fallbackList.map((e: any) => parseExpenseItem(e, lineVal, customerVal));
        const groups: ContainerGroup[] = [
          {
            containerRid: (primaryQuotation as any)?.quotationrid || 'cnt_1',
            containerType: (primaryQuotation as any)?.containertype || '40 High Cube',
            expenses: mappedItems,
          },
        ];
        if (isMounted) {
          setContainerGroups(groups);
          setIsLoadingExpenses(false);
          return;
        }
      }

      // ── Strategy 4: Initialize container groups from searchParams if no quotation or API expenses ──
      const rawSelectedContainers: any =
        searchParams?.selectedKonteynerler ||
        searchParams?.konteynerTipleri ||
        searchParams?.konteynerTipi;

      let selectedContainerList: string[] = [];
      if (Array.isArray(rawSelectedContainers)) {
        selectedContainerList = rawSelectedContainers.filter(
          (c) => typeof c === 'string' && c.trim() !== ''
        );
      } else if (typeof rawSelectedContainers === 'string' && rawSelectedContainers.trim() !== '') {
        selectedContainerList = rawSelectedContainers
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s !== '');
      }

      const containerRidsFromParams: string[] =
        searchParams?.containerTypeRIDs ||
        searchParams?.containerTypeRids ||
        searchParams?.selectedContainerRids ||
        [];

      if (selectedContainerList.length > 0) {
        const groups: ContainerGroup[] = selectedContainerList.map((cType, idx) => {
          const paramRid = containerRidsFromParams[idx];
          const resolvedGuid =
            resolveToContainerGuid(paramRid, cType) ||
            cleanGuidOrUndefined(paramRid) ||
            `cnt_param_${idx}_${Date.now()}`;
          return {
            containerRid: resolvedGuid,
            containerType: cType,
            expenses: [],
          };
        });

        if (isMounted) {
          setContainerGroups(groups);
          setIsLoadingExpenses(false);
          return;
        }
      } else if (isMounted) {
        const defaultType = searchParams?.konteynerTipi || '40 High Cube';
        const defaultGuid =
          resolveToContainerGuid(undefined, defaultType) ||
          'a992765f-1f8d-4a05-945c-2e621d9ab1a1';
        setContainerGroups([
          {
            containerRid: defaultGuid,
            containerType: defaultType,
            expenses: [],
          },
        ]);
        setIsLoadingExpenses(false);
      }
    };

    fetchLiveExpenses();
    return () => { isMounted = false; };
  }, [primaryQuotation, activeBaseUrl, authToken, searchParams]);

  // Modal / Feedback state
  const [activePickerModal, setActivePickerModal] = useState<{
    title: string;
    options: string[];
    selected: string;
    onSelect: (val: string) => void;
  } | null>(null);

  const [addExpenseModalGroupRid, setAddExpenseModalGroupRid] = useState<string | null>(null);
  const [newExpenseName, setNewExpenseName] = useState<string>('');
  const [newExpensePrice, setNewExpensePrice] = useState<string>('');
  const [newExpenseCurrency, setNewExpenseCurrency] = useState<string>('EUR');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isOfferCreated, setIsOfferCreated] = useState<boolean>(false);
  const [createdOfferRid, setCreatedOfferRid] = useState<string>('');

  const [swalModal, setSwalModal] = useState<{
    visible: boolean;
    icon: 'success' | 'warning' | 'error';
    title: string;
    text: string;
  } | null>(null);

  // Helper calculation functions
  const calculateRowProfit = (exp: ExpenseItem, isGroupAllIn?: boolean): string => {
    const qty = parseFloat(String(exp.miktar)) || 1;
    const buy = parseFloat(String(exp.alisFiyati)) || 0;
    const sell = parseFloat(String(exp.satisFiyati));

    if (isNaN(sell) || String(exp.satisFiyati).trim() === '') {
      if (isGroupAllIn || exp.allIn === 'Evet') {
        const buyUSD = convertToUSD(buy * qty, exp.alisDoviz);
        if (buyUSD > 0) {
          return (-buyUSD).toFixed(2);
        }
      }
      return 'NaN';
    }

    const buyUSD = convertToUSD(buy * qty, exp.alisDoviz);
    const sellUSD = convertToUSD(sell * qty, exp.satisDoviz);
    const profitUSD = sellUSD - buyUSD;

    return profitUSD.toFixed(2);
  };

  // Calculate currency totals
  const calculateTotals = () => {
    const buyTotals: Record<string, number> = { USD: 0, EURO: 0, GBP: 0 };
    const sellTotals: Record<string, number> = { USD: 0, EURO: 0, GBP: 0 };
    let totalBuyUSD = 0;
    let totalSellUSD = 0;
    let hasValidSell = false;

    containerGroups.forEach((group) => {
      group.expenses.forEach((exp) => {
        const qty = parseFloat(String(exp.miktar)) || 1;
        const buy = parseFloat(String(exp.alisFiyati)) || 0;
        const buyCurr = (exp.alisDoviz || 'EUR').toUpperCase();
        const normBuyCurr = buyCurr === 'EUR' ? 'EURO' : buyCurr;

        totalBuyUSD += convertToUSD(buy * qty, buyCurr);

        if (buyTotals[normBuyCurr] !== undefined) {
          buyTotals[normBuyCurr] += buy * qty;
        } else {
          buyTotals[normBuyCurr] = buy * qty;
        }

        // Process individual row sell prices if group is NOT All In OR if this row is excluded (exp.allIn === 'Hayır')
        const isRowLocked = group.isAllIn && exp.allIn !== 'Hayır';
        if (!isRowLocked) {
          const sellStr = String(exp.satisFiyati).trim();
          if (sellStr !== '') {
            const sell = parseFloat(sellStr);
            if (!isNaN(sell)) {
              hasValidSell = true;
              const sellCurr = (exp.satisDoviz || 'EURO').toUpperCase();
              const normSellCurr = sellCurr === 'EUR' ? 'EURO' : sellCurr;

              totalSellUSD += convertToUSD(sell * qty, sellCurr);

              if (sellTotals[normSellCurr] !== undefined) {
                sellTotals[normSellCurr] += sell * qty;
              } else {
                sellTotals[normSellCurr] = sell * qty;
              }
            }
          }
        }
      });

      // Process ALL IN row sell price when group IS All In
      if (group.isAllIn && group.allInRow?.satisFiyati) {
        const sellVal = parseFloat(group.allInRow.satisFiyati);
        if (!isNaN(sellVal)) {
          hasValidSell = true;
          const allInCurr = (group.allInRow.satisDoviz || 'EURO').toUpperCase();
          const normAllInCurr = allInCurr === 'EUR' ? 'EURO' : allInCurr;
          totalSellUSD += convertToUSD(sellVal, allInCurr);
          if (sellTotals[normAllInCurr] !== undefined) {
            sellTotals[normAllInCurr] += sellVal;
          } else {
            sellTotals[normAllInCurr] = sellVal;
          }
        }
      }
    });

    return { buyTotals, sellTotals, totalBuyUSD, totalSellUSD, hasValidSell };
  };

  const { buyTotals, sellTotals, totalBuyUSD, totalSellUSD, hasValidSell } = calculateTotals();

  // Handlers for expense table edits
  const handleUpdateExpense = (
    groupRid: string,
    expenseId: string,
    field: keyof ExpenseItem,
    value: any
  ) => {
    setContainerGroups((prev) =>
      prev.map((g) => {
        if (g.containerRid !== groupRid) return g;
        return {
          ...g,
          expenses: g.expenses.map((exp) => {
            if (exp.id !== expenseId) return exp;
            return { ...exp, [field]: value };
          }),
        };
      })
    );
  };

  const handleAddExpenseRow = (groupRid: string) => {
    const newExp: ExpenseItem = {
      id: `exp_custom_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      allIn: 'Hayır',
      masrafTipi: '',
      kdv: '0',
      miktar: '1',
      alisFiyati: '',
      alisDoviz: 'EUR',
      alisTarafi: '',
      alisTarafiRid: undefined,
      satisFiyati: '',
      satisDoviz: '',
      beher: 'CNT',
      satisTarafi: yukleyici || kotasyonSahibi || '',
      isCustomAdded: true,
    };

    setContainerGroups((prev) =>
      prev.map((g) => {
        if (g.containerRid !== groupRid) return g;
        return { ...g, expenses: [...g.expenses, newExp] };
      })
    );
  };

  const handleDeleteExpense = (groupRid: string, expenseId: string) => {
    setContainerGroups((prev) =>
      prev.map((g) => {
        if (g.containerRid !== groupRid) return g;
        return {
          ...g,
          expenses: g.expenses.filter((exp) => exp.id !== expenseId),
        };
      })
    );
  };

  const handleToggleAllInGroup = (groupRid: string, checked: boolean) => {
    setContainerGroups((prev) =>
      prev.map((g) => {
        if (g.containerRid !== groupRid) return g;
        return {
          ...g,
          isAllIn: checked,
          allInRow: g.allInRow || {
            satisFiyati: '',
            satisDoviz: 'EUR',
            alisDoviz: 'EUR',
            satisTarafi: yukleyici || kotasyonSahibi || '',
          },
          expenses: g.expenses.map((e) => ({
            ...e,
            allIn: checked ? 'Evet' : 'Hayır',
          })),
        };
      })
    );
  };

  const handleUpdateAllInRow = (
    groupRid: string,
    field: 'masrafTipi' | 'satisFiyati' | 'satisDoviz' | 'alisDoviz' | 'satisTarafi',
    value: string
  ) => {
    setContainerGroups((prev) =>
      prev.map((g) => {
        if (g.containerRid !== groupRid) return g;
        const currentAllIn = g.allInRow || {
          masrafTipi: 'HERŞEY DAHİL TAŞIMA FİYATI',
          satisFiyati: '',
          satisDoviz: 'EURO',
          alisDoviz: 'EUR',
          satisTarafi: yukleyici || kotasyonSahibi || '',
        };

        return {
          ...g,
          allInRow: { ...currentAllIn, [field]: value },
        };
      })
    );
  };

  // Submit Handler (Teklif Oluştur) 
  const handleSubmitOffer = async () => {
    if (isLoadingExpenses) {
      setSwalModal({
        visible: true,
        icon: 'warning',
        title: 'Lütfen Bekleyin',
        text: 'Kotasyon detayları yükleniyor. Yükleme tamamlandıktan sonra tekrar deneyin.',
      });
      return;
    }

    const isImport = isImportCommercialType(
      searchParams?.ticariTipi,
      searchParams?.COMMERCIALTYPE,
      searchParams?.commercialType,
      searchParams?.commercialtype,
      searchParams?.commercialTypeState,
      searchParams?.ticari,
      searchParams?.type,
      (primaryQuotation as any)?.commercialtype,
      (primaryQuotation as any)?.COMMERCIALTYPE,
      (primaryQuotation as any)?.commercialType,
      (primaryQuotation as any)?.ticariTipi
    );

    const quotationRid =
      cleanGuidOrUndefined((primaryQuotation as any)?.quotationrid) ||
      cleanGuidOrUndefined((primaryQuotation as any)?.QUOTATIONRID) ||
      cleanGuidOrUndefined((primaryQuotation as any)?.RID) ||
      cleanGuidOrUndefined((primaryQuotation as any)?.rid) ||
      cleanGuidOrUndefined(searchParams?.quotationRID) ||
      cleanGuidOrUndefined(searchParams?.quotationRid);

    const isNoQuotationRequired =
      isImport ||
      searchParams?.kotasyonKullanimi === 'Hayır' ||
      searchParams?.kotasyonKullanimi === 'hayır' ||
      searchParams?.useQuotation === false;

    // İhracat (Kotasyonlu Evet): kotasyon zorunlu | İthalat & Kotasyonsuz İhracat (Hayır): opsiyonel
    if (!isNoQuotationRequired && !quotationRid) {
      setSwalModal({
        visible: true,
        icon: 'warning',
        title: 'Uyarı',
        text: 'Kotasyonlu ihracat teklifi için kotasyon seçimi zorunludur.',
      });
      return;
    }

    // Required fields validation
    let missingOptions = '';
    if (!hat || hat.trim() === '' || hat === '—') missingOptions += 'Hat seçmeniz gerekmektedir.\n';
    if (!yuklemeLimani || yuklemeLimani.trim() === '' || yuklemeLimani === 'Yükleme limanı seçiniz') missingOptions += 'Yükleme limanı seçmeniz gerekmektedir.\n';
    if (!tahliyeLimani || tahliyeLimani.trim() === '' || tahliyeLimani === 'Tahliye limanı seçiniz') missingOptions += 'Tahliye limanı seçmeniz gerekmektedir.\n';
    if (!incoterm || incoterm === 'Seçiniz') missingOptions += 'Incoterm seçmeniz gerekmektedir.\n';
    if (!teklifGecerlilik) missingOptions += 'Geçerlilik tarihi girmeniz gerekmektedir.\n';
    if (!odemeTipi) missingOptions += 'Ödeme tipini seçmeniz gerekmektedir.\n';

    // Konteyner masrafı kontrolü
    let totalExpenseRowsCount = 0;
    containerGroups.forEach((group) => {
      if (group.isAllIn) {
        totalExpenseRowsCount += 1;
      } else {
        totalExpenseRowsCount += group.expenses.length;
      }
    });

    if (totalExpenseRowsCount === 0) {
      missingOptions += 'Konteyner masrafı seçimi / eklemesi zorunludur. En az 1 masraf eklemelisiniz.\n';
    }

    // Satış fiyatı ve Satış Dövizi validasyonu
    containerGroups.forEach((group) => {
      if (group.isAllIn) {
        // AllIn modunda allInRow'un satış fiyatı ve dövizi kontrol edilir
        if (!group.allInRow?.satisFiyati || String(group.allInRow.satisFiyati).trim() === '') {
          missingOptions += `"${group.containerType}" konteyneri için AllIn satış fiyatı girilmesi gerekmektedir.\n`;
        }
        const allInCurr = (group.allInRow?.satisDoviz || '').trim();
        if (!allInCurr || allInCurr === 'Satış Dövizi Seçiniz' || allInCurr === 'Satış Döviz') {
          missingOptions += `"${group.containerType}" konteyneri için Satış Dövizi seçilmedi.\n`;
        }
      } else {
        group.expenses.forEach((exp) => {
          const sellStr = String(exp.satisFiyati ?? '').trim();
          if (sellStr === '' || isNaN(parseFloat(sellStr))) {
            missingOptions += `"${exp.masrafTipi || 'Masraf'}" satırı için satış fiyatı girilmesi gerekmektedir.\n`;
          }
          const curr = (exp.satisDoviz || '').trim();
          if (!curr || curr === 'Satış Dövizi Seçiniz' || curr === 'Satış Döviz') {
            missingOptions += `"${exp.masrafTipi || 'Masraf'}" satırı için Satış Dövizi seçilmedi.\n`;
          }
          const alisParty = String(exp.alisTarafi ?? '').trim();
          if (!alisParty || alisParty === 'Firma seçiniz' || alisParty === 'Seçiniz') {
            missingOptions += `"${exp.masrafTipi || 'Masraf'}" satırı için Alış Tarafı firması seçilmeli.\n`;
          }
        });
      }
    });

    if (missingOptions) {
      setSwalModal({
        visible: true,
        icon: 'error',
        title: 'Eksik Bilgi',
        text: missingOptions.trim(),
      });
      return;
    }

    setIsSubmitting(true);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) {
      headers['Authorization'] = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
    }

    try {
      const quotationRID = cleanGuidOrUndefined(
        (primaryQuotation as any)?.quotationrid ||
        (primaryQuotation as any)?.RID ||
        (primaryQuotation as any)?.rid
      ) ?? null;

      const customerRID = cleanGuidOrUndefined(
        (primaryQuotation as any)?.customerrid ||
        (primaryQuotation as any)?.CUSTOMERRID ||
        searchParams?.customerRID ||
        searchParams?.customerRid
      ) ?? null;

      const whoAddUserRid = extractUserRid(authToken, user);
      console.log('[AddOffer] whoAddUserRid FINAL:', whoAddUserRid);
      console.log('user keys', user && Object.keys(user), 'token len', authToken?.length);

      if (!whoAddUserRid) {
        setSwalModal({
          visible: true,
          icon: 'error',
          title: 'Hata',
          text: 'Kullanıcı RID alınamadı. Çıkış yapıp tekrar giriş yapın.',
        });
        setIsSubmitting(false);
        return;
      }

      const resolvedLoadingPortRID =
        cleanGuidOrUndefined(loadingPortRid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.loadingportrid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.LOADINGPORTRID) ||
        cleanGuidOrUndefined(searchParams?.loadingPortRID) ||
        cleanGuidOrUndefined(searchParams?.loadingPortRid) ||
        null;

      const resolvedDischargePortRID =
        cleanGuidOrUndefined(dischargePortRid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.dischargeportrid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.DISCHARGEPORTRID) ||
        cleanGuidOrUndefined(searchParams?.dischargePortRID) ||
        cleanGuidOrUndefined(searchParams?.dischargePortRid) ||
        null;

      const resolvedLoadingLocationRID =
        (yuklemeYeri && yuklemeYeri.trim() !== '') ? (
          cleanGuidOrUndefined(loadingLocationRid) ||
          cleanGuidOrUndefined((primaryQuotation as any)?.loadinglocationrid) ||
          cleanGuidOrUndefined((primaryQuotation as any)?.selectedloadinglocationrid) ||
          cleanGuidOrUndefined(searchParams?.loadingLocationRID) ||
          cleanGuidOrUndefined(searchParams?.loadingLocationRid) ||
          null
        ) : null;

      const resolvedDischargeLocationRID =
        (tahliyeYeri && tahliyeYeri.trim() !== '') ? (
          cleanGuidOrUndefined(dischargeLocationRid) ||
          cleanGuidOrUndefined((primaryQuotation as any)?.dischargelocationrid) ||
          cleanGuidOrUndefined((primaryQuotation as any)?.DISCHARGELOCATIONRID) ||
          cleanGuidOrUndefined(searchParams?.dischargeLocationRID) ||
          cleanGuidOrUndefined(searchParams?.dischargeLocationRid) ||
          null
        ) : null;

      console.log('[AddOffer PORTS]', {
        LOADINGLOCATIONRID: resolvedLoadingLocationRID,
        LOADINGPORTRID: resolvedLoadingPortRID,
        DISCHARGELOCATIONRID: resolvedDischargeLocationRID,
        DISCHARGEPORTRID: resolvedDischargePortRID,
      });

      const resolvedLineRid =
        cleanGuidOrUndefined(lineRid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.linerid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.LINERID) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.lineRid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.lineRID) ||
        cleanGuidOrUndefined(searchParams?.lineRID) ||
        cleanGuidOrUndefined(searchParams?.lineRid) ||
        cleanGuidOrUndefined(searchParams?.hatRID) ||
        cleanGuidOrUndefined(searchParams?.hatRid) ||
        null;

      console.log('[AddOffer] LINERID:', resolvedLineRid, '| line name:', hat || (primaryQuotation as any)?.line || searchParams?.hat);

      const loaderRid = cleanGuidOrUndefined(
        (primaryQuotation as any)?.loaderrid ||
        (primaryQuotation as any)?.LOADERRID ||
        searchParams?.loaderRID ||
        searchParams?.loaderRid
      ) ?? null;

      const shippingType = searchParams?.tasimaTipi || null;
      const commercialType = searchParams?.ticariTipi || null;
      const loadingType = searchParams?.yuklemeTipi || null;

      // Build relatedCustomers from all expenses' satisTarafi
      const relatedCustomerSet = new Set<string>();
      containerGroups.forEach((g) => {
        g.expenses.forEach((e) => {
          const cleanVal = cleanGuidOrUndefined(e.satisTarafi);
          if (cleanVal) relatedCustomerSet.add(cleanVal);
        });
        if (g.isAllIn && g.allInRow?.satisTarafi) {
          const cleanVal = cleanGuidOrUndefined(g.allInRow.satisTarafi);
          if (cleanVal) relatedCustomerSet.add(cleanVal);
        }
      });
      const relatedCustomers = Array.from(relatedCustomerSet).join(',') || null;

      // Build containerRids & containerTypes
      const resolvedContainerRidsList: string[] = [];
      const resolvedContainerTypesList: string[] = [];

      const containerRidsFromParams: string[] =
        searchParams?.containerTypeRIDs ||
        searchParams?.containerTypeRids ||
        searchParams?.selectedContainerRids ||
        [];

      containerGroups.forEach((g, idx) => {
        const cType = g.containerType && String(g.containerType).trim() !== '' ? String(g.containerType).trim() : (searchParams?.konteynerTipi || '40 High Cube');
        resolvedContainerTypesList.push(cType);

        let cGuid =
          resolveToContainerGuid(g.containerRid, cType) ||
          cleanGuidOrUndefined(g.containerRid) ||
          cleanGuidOrUndefined(containerRidsFromParams[idx]) ||
          cleanGuidOrUndefined(searchParams?.containerTypeRID) ||
          cleanGuidOrUndefined(searchParams?.containerTypeRid) ||
          cleanGuidOrUndefined(searchParams?.containerrid) ||
          cleanGuidOrUndefined(searchParams?.CONTAINERRID);

        if (!cGuid) {
          cGuid = 'a992765f-1f8d-4a05-945c-2e621d9ab1a1';
        }

        resolvedContainerRidsList.push(cGuid);
      });

      const containerRidsStr = resolvedContainerRidsList.join(',') || null;
      const containerTypesStr = resolvedContainerTypesList.join(',') || null;
      const primaryContainerType = resolvedContainerTypesList[0] || (primaryQuotation as any)?.containertype || searchParams?.konteynerTipi || '40 High Cube';
      const primaryContainerRid = resolvedContainerRidsList[0] || 'a992765f-1f8d-4a05-945c-2e621d9ab1a1';

      // Resolve coloader RID
      let coloaderRid: string | null = null;
      if (coLoader && coLoader !== '' && coLoader !== 'Coloader seçiniz') {
        const cl = coLoader.toUpperCase();
        if (cl.includes('LİNK') || cl.includes('LINK')) {
          coloaderRid = 'C947B6CA-8078-42B3-B9BB-1D4719B0010D';
        } else if (cl.includes('GATE')) {
          coloaderRid = '6A394C0A-F403-483C-A333-92BE9C574C81';
        } else {
          coloaderRid = cleanGuidOrUndefined(coLoader) ?? null;
        }
      }

      // Resolve default offer sales currency and exchange rate (Issue 5 fix)
      const mainSalesCurrency =
        containerGroups[0]?.allInRow?.satisDoviz ||
        containerGroups[0]?.expenses[0]?.satisDoviz ||
        'EURO';
      const mainExchangeRate = convertToUSD(1, mainSalesCurrency);

      const addOfferModel: Record<string, any> = {
        QUOTATIONRID: quotationRid || null,
        CUSTOMERRID: customerRID,
        LOADINGLOCATIONRID: resolvedLoadingLocationRID,
        LOADINGPORTRID: resolvedLoadingPortRID,
        DISCHARGEPORTRID: resolvedDischargePortRID,
        DISCHARGELOCATIONRID: resolvedDischargeLocationRID,
        LINERID: resolvedLineRid,
        LINE: hat || searchParams?.hat || null,
        LINENAME: hat || searchParams?.hat || null,
        HAT: hat || searchParams?.hat || null,
        WHOADDUSERRID: whoAddUserRid,
        OFFERVALIDITYDATE: teklifGecerlilik || null,
        FREETIME: freeTime || null,
        PAYMENT: odemeTipi || null,
        FILLINGTYPE: dolumTipi || null,
        RELATEDCUSTOMERS: relatedCustomers,
        CONTAINERRIDS: containerRidsStr,
        CONTAINERTYPES: containerTypesStr,
        CONTAINERTYPERIDS: containerRidsStr,
        CONTAINERTYPERID: primaryContainerRid,
        CONTAINERRID: primaryContainerRid,
        CONTAINERTYPE: primaryContainerType,
        CONTAINERTYPESHORT: primaryContainerType,
        CONTAINERNAME: primaryContainerType,
        CONTAINER: primaryContainerType,
        CONTYPE: primaryContainerType,
        SHIPPINGTYPE: shippingType || 'Denizyolu',
        COMMERCIALTYPE: isImport ? 'İthalat' : (commercialType || 'İhracat'),
        LOADINGTYPE: loadingType || 'FCL',
        FLAMMABILITY: yanicilik || null,
        FLAMMABILITYDESCRIPTION: yanicilikAciklama || null,
        LANDTRANSPORTERRID: null,
        FRONTSHIPPING: frontShipping || null,
        LASTSHIPPING: lastShipping || null,
        LOCALEXPENSES: localExpense || null,
        DOCUMENTATION: documentation || null,
        PORTEXPENSES: portExpenses || null,
        INCOTERM: incoterm && incoterm !== 'Seçiniz' ? incoterm : null,
        LOADERRID: loaderRid,
        COLOADERRID: coloaderRid,
        OFFERCURRENCY: mainSalesCurrency,
        CURRENCY: mainSalesCurrency,
        SATISDOVIZ: mainSalesCurrency,
        ALLINCURRENCY: mainSalesCurrency,
        EXCHANGERATE: mainExchangeRate,
        CURRENCYRATE: mainExchangeRate,
        RATE: mainExchangeRate,
        KUR: mainExchangeRate,
      };

      // Boş string → null
      Object.keys(addOfferModel).forEach((k) => {
        if (addOfferModel[k] === '') addOfferModel[k] = null;
      });

      console.log('[AddOffer IMPORT]', {
        isImport,
        QUOTATIONRID: addOfferModel.QUOTATIONRID,
        COMMERCIALTYPE: addOfferModel.COMMERCIALTYPE,
      });

      console.log('[AddOffer BODY]', JSON.stringify(addOfferModel));

      // Step 1: AddOffer
      const offerRes = await fetch(`${activeBaseUrl}/Offer/AddOffer`, {
        method: 'POST',
        headers,
        body: JSON.stringify(addOfferModel),
      }).catch(() => null);

      if (!offerRes) {
        throw new Error('Sunucuya bağlanılamadı.');
      }

      const text = await offerRes.text();
      console.log('[AddOffer STATUS]', offerRes.status, text);

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        /* ignore */
      }

      const offerRID: string =
        data?.offerRid ||
        data?.OFFERRID ||
        data?.offerrid ||
        data?.OfferRid ||
        data?.data?.offerRid ||
        data?.offer_rid ||
        data?.id ||
        '';

      if (!offerRes.ok || !offerRID) {
        setSwalModal({
          visible: true,
          icon: 'error',
          title: 'Hata',
          text: data?.error || data?.message || data?.Error || data?.Message || `Kayıt başarısız (${offerRes.status})`,
        });
        setIsSubmitting(false);
        return;
      }

      // Step 2: AddOfferExpenses – iterate container groups
      for (const group of containerGroups) {
        const containerTypeRid =
          resolveToContainerGuid(group.containerRid, group.containerType) ||
          cleanGuidOrUndefined(group.containerRid);

        console.log('[CONTAINER SAVE]', group.containerType, '→', containerTypeRid);

        if (!containerTypeRid) {
          console.warn('[CONTAINER SAVE] Konteyner GUID bulunamadı:', group.containerType);
        }

        const effectiveContainerRid = containerTypeRid || null;
        const containerTypeName = group.containerType || primaryContainerType;
        const isAllIn = !!group.isAllIn;

        // A) Normal masraf satırları
        for (const exp of group.expenses) {
          const expenseRid = cleanGuidOrUndefined(exp.id);
          if (!expenseRid) continue;

          const buyingCurrency = toSiteCurrency(exp.alisDoviz, 'EUR');
          const buyingCost = toMoneyString(exp.alisFiyati);
          const sellingCurrency = isAllIn ? null : toSiteCurrency(exp.satisDoviz, exp.alisDoviz);
          const sellingCost = isAllIn ? null : toMoneyString(exp.satisFiyati);

          const expName = exp.masrafTipi || 'MASRAF';
          const rowRate = convertToUSD(1, sellingCurrency || buyingCurrency || 'EUR');

          const buyingCustomerRid =
            cleanGuidOrUndefined(exp.alisTarafiRid) ||
            cleanGuidOrUndefined(addOfferModel.LOADERRID) ||
            null;

          const sellingCustomerRid =
            cleanGuidOrUndefined(exp.satisTarafiRid) ||
            cleanGuidOrUndefined(searchParams?.customerRID) ||
            cleanGuidOrUndefined(addOfferModel.CUSTOMERRID) ||
            null;

          const allInCurr = isAllIn
            ? toSiteCurrency(group.allInRow?.satisDoviz, 'EUR')
            : null;

          const expenseBody: Record<string, any> = {
            QUOTATIONRID: addOfferModel.QUOTATIONRID,
            OFFERRID: offerRID,
            EXPENSERID: expenseRid,
            CONTAINERTYPERID: effectiveContainerRid,
            CONTAINERRID: effectiveContainerRid,
            CONTAINERTYPE: containerTypeName,
            CONTAINERTYPESHORT: containerTypeName,
            CONTAINERNAME: containerTypeName,
            CONTAINER: containerTypeName,
            EXPENSETYPE: expName,
            OPTIONLABEL: expName,
            EXPENSENAME: expName,
            OPTIONNAME: expName,
            MASRAFTIPI: expName,
            DESCRIPTION: expName,
            BUYINGCOST: buyingCost,
            BUYINGCURRENCY: buyingCurrency,
            SELLINGCOST: sellingCost,
            SELLINGPRICE: sellingCost,
            SATISFIYATI: sellingCost,
            SELLINGCURRENCY: sellingCurrency,
            OFFERCURRENCY: sellingCurrency,
            CURRENCY: sellingCurrency,
            SATISDOVIZ: sellingCurrency,
            BEHER: exp.beher || 'CNT',
            PIECE: toMoneyString(exp.miktar) || '1',
            KDV: String(exp.kdv ?? '0'),
            ISALLIN: isAllIn ? 1 : (exp.allIn === 'Evet' ? 1 : 0),
            ISALLINHIDE: isAllIn ? 1 : 0,
            BUYINGCUSTOMERRID: buyingCustomerRid,
            SELLINGCUSTOMERRID: sellingCustomerRid,
            WHEREISDESCRIPTION: 1,
            WHOADDUSERRID: whoAddUserRid,
            ISADDEDLATER: quotationRid ? (exp.isCustomAdded ? 1 : 0) : 1,
            EXPENSEFROMTYPE: quotationRid ? (exp.isCustomAdded ? 'OFFER' : 'QUOTATION') : 'OFFER',
            EXPENSEFROMTYPERID: quotationRid && !exp.isCustomAdded ? quotationRid : offerRID,
            ALLINCURRENCY: allInCurr,
            EXCHANGERATE: rowRate,
            CURRENCYRATE: rowRate,
            RATE: rowRate,
            KUR: rowRate,
          };

          console.log('[AddOfferExpenses ROW]', {
            masraf: expName,
            ISALLIN: expenseBody.ISALLIN,
            ISALLINHIDE: expenseBody.ISALLINHIDE,
            SELLINGCOST: expenseBody.SELLINGCOST,
            SELLINGCURRENCY: expenseBody.SELLINGCURRENCY,
          });

          await fetch(`${activeBaseUrl}/Offer/AddOfferExpenses`, {
            method: 'POST',
            headers,
            body: JSON.stringify(expenseBody),
          }).catch(() => null);
        }

        // B) All-In özet satırı (site mantığı)
        if (isAllIn && group.allInRow) {
          const allInExpenseRid =
            cleanGuidOrUndefined(group.allInRow.expenseRid) ||
            'd0b969ed-b4a5-4059-b1bd-4606bb8df7d6'; // ALLIN masraf tipi RID

          const totalBuy = group.expenses.reduce((acc, e) => {
            const qty = parseFloat(toMoneyString(e.miktar)) || 1;
            return acc + (parseFloat(toMoneyString(e.alisFiyati)) || 0) * qty;
          }, 0);

          const allInSell = toMoneyString(group.allInRow.satisFiyati);
          const allInCurr = toSiteCurrency(group.allInRow.satisDoviz, 'EUR');
          const allInRate = convertToUSD(1, allInCurr);
          const allInExpenseType = group.allInRow.masrafTipi || 'HERŞEY DAHİL TAŞIMA FİYATI';

          const allInBody: Record<string, any> = {
            QUOTATIONRID: addOfferModel.QUOTATIONRID,
            OFFERRID: offerRID,
            EXPENSERID: allInExpenseRid,
            CONTAINERTYPERID: effectiveContainerRid,
            CONTAINERRID: effectiveContainerRid,
            CONTAINERTYPE: containerTypeName,
            CONTAINERTYPESHORT: containerTypeName,
            CONTAINERNAME: containerTypeName,
            CONTAINER: containerTypeName,
            EXPENSETYPE: allInExpenseType,
            OPTIONLABEL: allInExpenseType,
            EXPENSENAME: allInExpenseType,
            OPTIONNAME: allInExpenseType,
            MASRAFTIPI: allInExpenseType,
            DESCRIPTION: allInExpenseType,
            BUYINGCOST: String(totalBuy),
            BUYINGCURRENCY: allInCurr,
            SELLINGCOST: allInSell,
            SELLINGPRICE: allInSell,
            SATISFIYATI: allInSell,
            SELLINGCURRENCY: allInCurr,
            OFFERCURRENCY: allInCurr,
            CURRENCY: allInCurr,
            SATISDOVIZ: allInCurr,
            BEHER: null,
            PIECE: '1',
            KDV: '0',
            ISALLIN: 1,
            ISALLINHIDE: 0,
            BUYINGCUSTOMERRID: null,
            SELLINGCUSTOMERRID: cleanGuidOrUndefined(searchParams?.customerRID) || addOfferModel.CUSTOMERRID || null,
            WHEREISDESCRIPTION: 0,
            WHOADDUSERRID: whoAddUserRid,
            ALLINCURRENCY: allInCurr,
            ISADDEDLATER: 0,
            EXPENSEFROMTYPE: 'ALLIN',
            EXPENSEFROMTYPERID: null,
            EXCHANGERATE: allInRate,
            CURRENCYRATE: allInRate,
            RATE: allInRate,
            KUR: allInRate,
          };

          console.log('[ALLIN BODY]', allInBody);

          await fetch(`${activeBaseUrl}/Offer/AddOfferExpenses`, {
            method: 'POST',
            headers,
            body: JSON.stringify(allInBody),
          }).catch(() => null);
        }
      }

      setIsSubmitting(false);
      setCreatedOfferRid(offerRID);
      setIsOfferCreated(true);
      setOfferRidState(offerRID);
      setIsViewMode(true);

      // Verification check after AddOfferExpenses
      try {
        const checkRes = await fetch(`${activeBaseUrl}/Offer/GetOfferExpensesWithRid`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ offerrid: offerRID, OFFERRID: offerRID }),
        }).catch(() => null);

        if (checkRes && checkRes.ok) {
          const checkData = await checkRes.json().catch(() => null);
          console.log('[SAVED EXPENSES]', JSON.stringify(checkData).slice(0, 2000));
        }
      } catch (checkErr) {
        console.log('[SAVED EXPENSES ERR]', checkErr);
      }

      // Fetch created offer details via GetOfferWithRid to populate view fields
      try {
        const offerRes = await fetch(`${activeBaseUrl}/Offer/GetOfferWithRid`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ OFFERRID: offerRID, MODE: 'view', CONTYPE: 'MSSQL' }),
        }).catch(() => null);

        if (offerRes && offerRes.ok) {
          const rawOffer = await offerRes.json().catch(() => null);
          if (rawOffer) {
            const offerData = normalizeKeysDeep(rawOffer);
            console.log('[GetOfferWithRid RES]', JSON.stringify(offerData).slice(0, 500));
            setOfferNo(offerData.offerno || offerData.teklifno || offerData.offer_no || offerRID);
            setOfferOwner(offerData.offerowner || offerData.teklifsahibi || (user as any)?.USERNAME || (user as any)?.username || (primaryQuotation as any)?.customername || '');
            setCreatedAt(offerData.createdate || offerData.olusturulmatarihi || getTodayDateString());
            setService(offerData.service || offerData.servis || '');
            setShippingMode(offerData.shippingmode || offerData.tasimamodu || searchParams?.yuklemeTipi || 'FCL');
            if (offerData.line) setHat(String(offerData.line));
            if (offerData.customername) setYukleyici(String(offerData.customername));

            const offerExpenses = offerData.offerexpenses || offerData.OFFEREXPENSES || [];
            if (Array.isArray(offerExpenses) && offerExpenses.length > 0) {
              const reloadedGroups = buildContainerGroups(
                {
                  OFFEREXPENSES: offerExpenses,
                  QUOTATIONCONTAINERS: offerData.quotationcontainers || offerData.QUOTATIONCONTAINERS || [],
                  line: offerData.line,
                  customername: offerData.customername,
                },
                hat,
                yukleyici
              );
              if (reloadedGroups.length > 0) {
                // Merge any custom added expenses from pre-submit containerGroups into reloadedGroups
                containerGroups.forEach((oldGroup) => {
                  const customExps = oldGroup.expenses.filter((e) => e.isCustomAdded);
                  if (customExps.length > 0) {
                    const targetGroup =
                      reloadedGroups.find(
                        (rg) => rg.containerType.toLowerCase() === oldGroup.containerType.toLowerCase()
                      ) || reloadedGroups[0];
                    if (targetGroup) {
                      customExps.forEach((cExp) => {
                        const exists = targetGroup.expenses.some(
                          (re) =>
                            re.id === cExp.id ||
                            (re.masrafTipi.toLowerCase() === cExp.masrafTipi.toLowerCase() &&
                              String(re.alisFiyati) === String(cExp.alisFiyati))
                        );
                        if (!exists) {
                          targetGroup.expenses.push(cExp);
                        }
                      });
                    }
                  }
                });

                setContainerGroups(reloadedGroups);
              }
            }
          }
        }
      } catch (e) {
        console.log('[GetOfferWithRid ERROR]', e);
      }

      setSwalModal({
        visible: true,
        icon: 'success',
        title: 'Teklif Başarıyla Oluşturuldu',
        text: `Teklif başarıyla kaydedildi. Teklif RID: ${offerRID}`,
      });

      if (onSaveSuccess) onSaveSuccess({ offerRid: offerRID, ...addOfferModel });
    } catch (err: any) {
      setIsSubmitting(false);
      setSwalModal({
        visible: true,
        icon: 'error',
        title: 'Hata Oluştu',
        text: err?.message || 'Teklif oluşturulurken beklenmeyen bir hata meydana geldi.',
      });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Header Navigation Bar */}
      <View style={[styles.headerNav, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable onPress={onBack || onClose} style={styles.homeBtn}>
        </Pressable>
        <ThemedText style={styles.headerNavTitle}>Müşteri Teklif Oluşturma Ekranı</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* SUCCESS BANNER - shown after offer is created */}
        {isOfferCreated && (
          <View style={{
            backgroundColor: '#dcfce7',
            borderWidth: 1.5,
            borderColor: '#16a34a',
            borderRadius: 10,
            padding: 14,
            marginBottom: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 15, fontWeight: '700', color: '#15803d' }}>Teklif Oluşturuldu</ThemedText>
              <ThemedText style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                Form artık görüntüleme modundadır.
              </ThemedText>
              {createdOfferRid ? (
                <ThemedText style={{ fontSize: 11, color: '#166534', marginTop: 4, fontFamily: 'monospace' }}>
                  Teklif RID: {createdOfferRid}
                </ThemedText>
              ) : null}
            </View>
          </View>
        )}

        {/* SECTION 1: TEKLİF BİLGİLERİ (Matching user screenshot design) */}
        <View style={styles.cardSection}>
          <View style={[styles.cardHeaderBanner, { backgroundColor: '#ff7a45', borderTopLeftRadius: 8, borderTopRightRadius: 8 }]}>
            <ThemedText style={styles.cardHeaderBannerTitle}>Teklif Bilgileri</ThemedText>
          </View>

          <View style={[styles.cardBody, { paddingHorizontal: 8, paddingVertical: 12 }]}>
            {isViewMode || isOfferCreated ? (
              /* VIEW MODE: Sitedeki Tam 26 Alan (Teklif Oluşturulduktan Sonra) */
              <>
                {/* ROW 1: Teklif Sahibi | Oluşturulma Tarihi */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Teklif Sahibi',
                    value: offerOwner || (user as any)?.USERNAME || (user as any)?.username || kotasyonSahibi || 'Cüneyt BAŞ',
                  })}
                  {renderDesignItem({
                    label: 'Oluşturulma Tarihi',
                    value: createdAt || getTodayDateString(),
                  })}
                </View>

                {/* ROW 2: Teklif Numarası | Hat : (Pdf dokümanda gizle) */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Teklif Numarası',
                    value: offerNo || createdOfferRid || '—',
                  })}
                  {renderDesignItem({
                    label: 'Hat :',
                    value: hat || '—',
                    pdfHide: true,
                  })}
                </View>

                {/* ROW 3: Müşteri (≡) | Ödeme */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Müşteri',
                    value: primaryQuotation?.customername || searchParams?.customerName || yukleyici || '—',
                    hasMenuIcon: true,
                  })}
                  {renderDesignItem({
                    label: 'Ödeme',
                    value: odemeTipi || 'Prepaid',
                  })}
                </View>

                {/* ROW 4: Yükleyici (≡) | Kotasyon (≡) */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Yükleyici',
                    value: yukleyici || '—',
                    hasMenuIcon: true,
                  })}
                  {renderDesignItem({
                    label: 'Kotasyon',
                    value: kotasyonNo || '—',
                    hasMenuIcon: true,
                  })}
                </View>

                {/* ROW 5: Taşıma Tipi | Teklif Tarihi */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Taşıma Tipi',
                    value: searchParams?.tasimaTipi || 'Denizyolu',
                  })}
                  {renderDesignItem({
                    label: 'Teklif Tarihi',
                    value: teklifGecerlilik || getTodayDateString(),
                  })}
                </View>

                {/* ROW 6: Dolum Tipi | Teklif Son Geçerlilik Tarihi */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Dolum Tipi',
                    value: dolumTipi || 'Fabrika Dolum',
                  })}
                  {renderDesignItem({
                    label: 'Teklif Son Geçerlilik Tarihi',
                    value: teklifGecerlilik || getTodayDateString(),
                  })}
                </View>

                {/* ROW 7: Yükleme Tipi | Ticaret Tipi */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Yükleme Tipi',
                    value: searchParams?.yuklemeTipi || 'FCL',
                  })}
                  {renderDesignItem({
                    label: 'Ticaret Tipi',
                    value: searchParams?.ticariTipi || 'İhracat',
                  })}
                </View>

                {/* ROW 8: Incoterm | Servis */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Incoterm',
                    value: incoterm || '—',
                  })}
                  {renderDesignItem({
                    label: 'Servis',
                    value: service || 'Direkt Servis',
                  })}
                </View>

                {/* ROW 9: Free Time | Transit Süre */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Free Time',
                    value: freeTime || '—',
                  })}
                  {renderDesignItem({
                    label: 'Transit Süre',
                    value: transitTime || '—',
                  })}
                </View>

                {/* ROW 10: Yükleme Yeri | Yükleme Limanı */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Yükleme Yeri',
                    value: yuklemeYeri || '',
                  })}
                  {renderDesignItem({
                    label: 'Yükleme Limanı',
                    value: yuklemeLimani || '',
                  })}
                </View>

                {/* ROW 11: Tahliye Yeri | Tahliye Limanı */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Tahliye Yeri',
                    value: tahliyeYeri || '',
                  })}
                  {renderDesignItem({
                    label: 'Tahliye Limanı',
                    value: tahliyeLimani || '',
                  })}
                </View>

                {/* ROW 12: Tehlikelilik | Yanıcılık Açıklama */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Tehlikelilik',
                    value: yanicilik || 'Yanıcısız',
                  })}
                  {renderDesignItem({
                    label: 'Yanıcılık Açıklama',
                    value: yanicilikAciklama || '—',
                  })}
                </View>

                {/* ROW 13: Taşıma Modu (Pdf dokümanda gizle) | Co-Loader */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Taşıma Modu',
                    value: shippingMode || searchParams?.yuklemeTipi || 'FCL',
                    pdfHide: true,
                  })}
                  {renderDesignItem({
                    label: 'Co-Loader',
                    value: coLoader && coLoader !== 'Coloader seçiniz' ? coLoader : 'Coloader seçiniz',
                    isDropdown: true,
                  })}
                </View>
              </>
            ) : (
              /* EDIT MODE: Teklif Oluşturma Ekranında Sadece İstenen 13 Form Alanı */
              <>
                {/* ROW 1: Kotasyon | Kotasyon Sahibi */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Kotasyon :',
                    value: kotasyonNo || '—',
                    hasMenuIcon: true,
                  })}
                  {renderDesignItem({
                    label: 'Kotasyon Sahibi :',
                    value: kotasyonSahibi || '—',
                  })}
                </View>

                {/* ROW 2: Hat : | Kotasyon Geçerlilik Tarihi : */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Hat :',
                    value: hat || '—',
                    pdfHide: true,
                    isEditable: isDirectImport,
                    onPress: () =>
                      setSearchModalConfig({
                        visible: true,
                        title: 'Hat Seçiniz',
                        type: 'hat',
                        placeholder: 'Hat adı veya kodu ile canlı arayın...',
                        onSelect: (opt) => {
                          setHat(opt.name);
                          setLineRid(opt.id);
                        },
                      }),
                  })}
                  {renderDesignItem({
                    label: 'Kotasyon Geçerlilik Tarihi :',
                    value: kotasyonGecerlilik || '—',
                  })}
                </View>

                {/* ROW 3: Transit Time : | Free Time : */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Transit Time :',
                    value: transitTime,
                    isEditable: isDirectImport,
                    onChangeText: setTransitTime,
                    keyboardType: 'numeric',
                    placeholder: 'Transit Time',
                  })}
                  {renderDesignItem({
                    label: 'Free Time :',
                    value: freeTime,
                    isEditable: true,
                    onChangeText: setFreeTime,
                    keyboardType: 'numeric',
                    placeholder: 'Free Time',
                  })}
                </View>

                {/* ROW 4: Ödeme Tipi : | Teklif Son Geçerlilik Tarihi : */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Ödeme Tipi :',
                    value: odemeTipi || 'Prepaid',
                    isEditable: true,
                    onPress: () =>
                      setActivePickerModal({
                        title: 'Ödeme Tipi Seçimi',
                        options: ODEME_TIPI_OPTIONS,
                        selected: odemeTipi || 'Prepaid',
                        onSelect: setOdemeTipi,
                      }),
                  })}
                  {renderDesignItem({
                    label: 'Teklif Son Geçerlilik Tarihi :',
                    value: teklifGecerlilik || getTodayDateString(),
                    isEditable: true,
                    onPress: () => {
                      const activeVal = teklifGecerlilik || getTodayDateString();
                      setCalendarDate(parseTurkishDate(activeVal));
                      setShowDatePicker(true);
                    },
                  })}
                </View>

                {/* ROW 5: Yükleme Yeri : | Yükleme Limanı : */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Yükleme Yeri :',
                    value: yuklemeYeri || '',
                    isEditable: isDirectImport,
                    onPress: () =>
                      setSearchModalConfig({
                        visible: true,
                        title: 'Yükleme Yeri Seçiniz',
                        type: 'location',
                        placeholder: 'Yükleme yeri / şehir / bölge arayın...',
                        onSelect: (opt) => {
                          setYuklemeYeri(opt.name);
                          setLoadingLocationRid(opt.id);
                        },
                      }),
                    placeholder: '--',
                  })}
                  {renderDesignItem({
                    label: 'Yükleme Limanı :',
                    value: yuklemeLimani || '',
                    isEditable: isDirectImport,
                    onPress: () =>
                      setSearchModalConfig({
                        visible: true,
                        title: 'Yükleme Limanı Seçiniz',
                        type: 'port',
                        placeholder: 'Yükleme limanı arayın...',
                        onSelect: (opt) => {
                          setYuklemeLimani(opt.name);
                          setLoadingPortRid(opt.id);
                        },
                      }),
                    placeholder: 'Yükleme limanı seçiniz',
                  })}
                </View>

                {/* ROW 6: Tahliye Yeri : | Tahliye Limanı : */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Tahliye Yeri :',
                    value: tahliyeYeri || '',
                    isEditable: isDirectImport,
                    onPress: () =>
                      setSearchModalConfig({
                        visible: true,
                        title: 'Tahliye Yeri Seçiniz',
                        type: 'location',
                        placeholder: 'Tahliye yeri / şehir / bölge arayın...',
                        onSelect: (opt) => {
                          setTahliyeYeri(opt.name);
                          setDischargeLocationRid(opt.id);
                        },
                      }),
                    placeholder: '--',
                  })}
                  {renderDesignItem({
                    label: 'Tahliye Limanı :',
                    value: tahliyeLimani || '',
                    isEditable: isDirectImport,
                    onPress: () =>
                      setSearchModalConfig({
                        visible: true,
                        title: 'Tahliye Limanı Seçiniz',
                        type: 'port',
                        placeholder: 'Tahliye limanı arayın...',
                        onSelect: (opt) => {
                          setTahliyeLimani(opt.name);
                          setDischargePortRid(opt.id);
                        },
                      }),
                    placeholder: 'Tahliye limanı seçiniz',
                  })}
                </View>

                {/* ROW 7: Dolum Tipi : | Incoterm : */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Dolum Tipi :',
                    value: dolumTipi || 'Fabrika Dolum',
                    isEditable: isDirectImport,
                    onPress: () =>
                      setActivePickerModal({
                        title: 'Dolum Tipi Seçimi',
                        options: ['Fabrika Dolum', 'Liman Dolum', 'Depo Dolum'],
                        selected: dolumTipi || 'Fabrika Dolum',
                        onSelect: setDolumTipi,
                      }),
                  })}
                  {renderDesignItem({
                    label: 'Incoterm :',
                    value: incoterm || 'Seçiniz',
                    isEditable: true,
                    onPress: () =>
                      setActivePickerModal({
                        title: 'Incoterm Seçimi',
                        options: INCOTERM_OPTIONS,
                        selected: incoterm || 'Seçiniz',
                        onSelect: setIncoterm,
                      }),
                  })}
                </View>

                {/* ROW 8: Yükleyici : | Co-Loader : */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Yükleyici :',
                    value: yukleyici || 'Yükleyici seçiniz',
                    hasMenuIcon: true,
                    isEditable: true,
                    onPress: () =>
                      setSearchModalConfig({
                        visible: true,
                        title: 'Yükleyici Seçiniz',
                        type: 'loader',
                        placeholder: 'Yükleyici / firma arayın...',
                        onSelect: (opt) => setYukleyici(opt.name),
                      }),
                  })}
                  {renderDesignItem({
                    label: 'Co-Loader :',
                    value: coLoader && coLoader !== 'Coloader seçiniz' ? coLoader : 'Coloader seçiniz',
                    isDropdown: true,
                    isEditable: true,
                    onPress: () =>
                      setSearchModalConfig({
                        visible: true,
                        title: 'Co-Loader Seçiniz',
                        type: 'loader',
                        placeholder: 'Co-Loader / firma arayın...',
                        onSelect: (opt) => setCoLoader(opt.name),
                      }),
                  })}
                </View>

                {/* ROW 9: Tehlikelilik : | Yanıcılık Açıklama : */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Tehlikelilik :',
                    value: yanicilik || 'Yanıcısız',
                    isEditable: true,
                    onPress: () =>
                      setActivePickerModal({
                        title: 'Tehlikelilik Durumu Seçiniz',
                        options: ['Yanıcılı', 'Yanıcısız'],
                        selected: yanicilik || 'Yanıcısız',
                        onSelect: setYanicilik,
                      }),
                  })}
                  {renderDesignItem({
                    label: 'Yanıcılık Açıklama :',
                    value: yanicilikAciklama,
                    isEditable: true,
                    onChangeText: setYanicilikAciklama,
                    placeholder: yanicilik === 'Yanıcılı' ? 'Yanıcılık açıklaması giriniz' : 'Açıklama giriniz',
                  })}
                </View>
              </>
            )}
          </View>
        </View>

        {/* SECTION 2: YURT İÇİ MASRAFLAR */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeaderBanner}>
            <ThemedText style={styles.cardHeaderBannerTitle}>Yurt İçi Masraflar</ThemedText>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.gridRow}>
              <View style={styles.gridItemHalf}>
                <ThemedText style={styles.fieldLabel}>Ön Taşıma :</ThemedText>
                <ThemedText style={styles.fieldValText}>{frontShipping || 'Dahil Değil'}</ThemedText>
              </View>
              <View style={styles.gridItemHalf}>
                <ThemedText style={styles.fieldLabel}>Lokal Masraflar :</ThemedText>
                <ThemedText style={styles.fieldValText}>{localExpense || 'Dahil Değil'}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 3: YURT DIŞI MASRAFLAR */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeaderBanner}>
            <ThemedText style={styles.cardHeaderBannerTitle}>Yurt Dışı Masraflar</ThemedText>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.gridRow}>
              <View style={styles.gridItemHalf}>
                <ThemedText style={styles.fieldLabel}>Son Taşıma :</ThemedText>
                <ThemedText style={styles.fieldValText}>{lastShipping || 'Dahil Değil'}</ThemedText>
              </View>
              <View style={styles.gridItemHalf}>
                <ThemedText style={styles.fieldLabel}>Gümrükleme :</ThemedText>
                <ThemedText style={styles.fieldValText}>{custom || 'Dahil Değil'}</ThemedText>
              </View>
            </View>
            <View style={styles.gridRow}>
              <View style={styles.gridItemHalf}>
                <ThemedText style={styles.fieldLabel}>Dokümantasyon :</ThemedText>
                <ThemedText style={styles.fieldValText}>{documentation || 'Dahil Değil'}</ThemedText>
              </View>
              <View style={styles.gridItemHalf}>
                <ThemedText style={styles.fieldLabel}>Liman Masrafları :</ThemedText>
                <ThemedText style={styles.fieldValText}>{portExpenses || 'Dahil Değil'}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* SECTION 4: CONTAINER EXPENSES TABLES (DYNAMIC TABS/SECTIONS) */}
        {containerGroups.map((group) => (
          <View key={group.containerRid} style={styles.cardSection}>
            {/* Header Banner with Add Expense Button */}
            <View style={styles.containerGroupHeaderBanner}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ThemedText style={styles.containerGroupHeaderTitle}>
                  {group.containerType}
                </ThemedText>
                {isLoadingExpenses && (
                  <ActivityIndicator size="small" color="#ffffff" />
                )}
              </View>
              {!group.isAllIn && (
                <Pressable
                  onPress={() => handleAddExpenseRow(group.containerRid)}
                  style={styles.addExpenseBtn}
                >
                  <ThemedText style={styles.addExpenseBtnText}>+ Masraf Ekle</ThemedText>
                </Pressable>
              )}
            </View>

            {/* Table Horizontal Scroll Container */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View style={styles.expensesTable}>
                {/* Table Header */}
                <View style={styles.tableHeaderRow}>
                  <View style={[styles.thCell, { width: 75 }]}>
                    <Pressable
                      disabled={isViewMode}
                      onPress={() => !isViewMode && handleToggleAllInGroup(group.containerRid, !group.isAllIn)}
                      style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, cursor: 'pointer' }, isViewMode && { opacity: 0.6 }]}
                    >
                      <ThemedText style={styles.thText}>All In</ThemedText>
                      <ThemedText style={{ fontSize: 14, color: group.isAllIn ? '#2563eb' : '#434343' }}>
                        {group.isAllIn ? '☑' : '☐'}
                      </ThemedText>
                    </Pressable>
                  </View>
                  <View style={[styles.thCell, { width: 220 }]}>
                    <ThemedText style={styles.thText}>Masraf Tipi</ThemedText>
                  </View>
                  <View style={[styles.thCell, { width: 55 }]}>
                    <ThemedText style={styles.thText}>KDV</ThemedText>
                  </View>
                  <View style={[styles.thCell, { width: 60 }]}>
                    <ThemedText style={styles.thText}>Miktar</ThemedText>
                  </View>
                  <View style={[styles.thCell, { width: 90 }]}>
                    <ThemedText style={styles.thText}>Alış Fiyatı</ThemedText>
                  </View>
                  <View style={[styles.thCell, { width: 90 }]}>
                    <ThemedText style={styles.thText}>Alış Döviz</ThemedText>
                  </View>
                  <View style={[styles.thCell, { width: 120 }]}>
                    <ThemedText style={styles.thText}>Alış Tarafı</ThemedText>
                  </View>
                  <View style={[styles.thCell, { width: 100 }]}>
                    <ThemedText style={styles.thText}>Satış Fiyatı</ThemedText>
                  </View>
                  <View style={[styles.thCell, { width: 95 }]}>
                    <ThemedText style={styles.thText}>Satış Döviz</ThemedText>
                  </View>
                  <View style={[styles.thCell, { width: 75 }]}>
                    <ThemedText style={styles.thText}>Kar</ThemedText>
                  </View>
                  <View style={[styles.thCell, { width: 60 }]}>
                    <ThemedText style={styles.thText}>Beher</ThemedText>
                  </View>
                  <View style={[styles.thCell, { width: 130 }]}>
                    <ThemedText style={styles.thText}>
                      Satış Tarafı ({'\n'}Teklif Sahibi)
                    </ThemedText>
                  </View>
                </View>

                {/* Table Body Rows */}
                {group.expenses.map((exp, idx) => {
                  const isRowLocked = (group.isAllIn && exp.allIn !== 'Hayır') || isViewMode || isOfferCreated;
                  const profitVal = isRowLocked ? 'NaN' : calculateRowProfit(exp, false);
                  const isCustom = !!exp.isCustomAdded;

                  return (
                    <View
                      key={exp.id}
                      style={[
                        styles.tableBodyRow,
                        idx % 2 === 1 && styles.altRowBackground,
                      ]}
                    >
                      {/* All In */}
                      <View style={[styles.tdCell, { width: 75, alignItems: 'center' }]}>
                        {group.isAllIn ? (
                          <Pressable
                            onPress={() =>
                              setActivePickerModal({
                                title: 'All In Seçimi',
                                options: ['Evet', 'Hayır'],
                                selected: exp.allIn || 'Evet',
                                onSelect: (val) =>
                                  handleUpdateExpense(group.containerRid, exp.id, 'allIn', val),
                              })
                            }
                            style={styles.cellDropdown}
                          >
                            <ThemedText style={styles.cellDropdownText}>
                              {exp.allIn || 'Evet'}
                            </ThemedText>
                            <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                          </Pressable>
                        ) : (
                          <ThemedText style={styles.tdTextReadonly}>
                            Hayır
                          </ThemedText>
                        )}
                      </View>

                      {/* Masraf Tipi */}
                      <View style={[styles.tdCell, { width: 220 }]}>
                        {isCustom ? (
                          <Pressable
                            disabled={isRowLocked}
                            onPress={() =>
                              setExpenseSearchModal({
                                visible: true,
                                title: 'Masraf Kalemi / Tipi Seçiniz',
                                onSelect: async (opt) => {
                                  const targetExpId = exp.id;
                                  let autoKdv =
                                    opt.kdv !== undefined && opt.kdv !== null && String(opt.kdv) !== ''
                                      ? String(opt.kdv)
                                      : getAutoKdvForExpense(opt.name);

                                  let masrafName = opt.name;
                                  let unitName = undefined;

                                  const expRid = cleanGuidOrUndefined(opt.id);
                                  if (expRid) {
                                    const info = await fetchExpenseInfo(expRid, activeBaseUrl, authToken);
                                    if (info) {
                                      if (info.kdv !== undefined && !isNaN(info.kdv)) {
                                        autoKdv = String(info.kdv);
                                      }
                                      if (info.masraf) {
                                        masrafName = info.masraf;
                                      }
                                      if (info.unitname) {
                                        unitName = info.unitname;
                                      }
                                    }
                                  }

                                  setContainerGroups((prev) =>
                                    prev.map((g) => {
                                      if (g.containerRid !== group.containerRid) return g;
                                      return {
                                        ...g,
                                        expenses: g.expenses.map((e) => {
                                          if (e.id !== targetExpId) return e;
                                          return {
                                            ...e,
                                            id: expRid || e.id,
                                            masrafTipi: masrafName,
                                            kdv: autoKdv,
                                            beher: unitName || e.beher,
                                          };
                                        }),
                                      };
                                    })
                                  );
                                },
                              })
                            }
                            style={[styles.cellDropdown, isRowLocked && { opacity: 0.5, backgroundColor: '#f1f5f9' }]}
                          >
                            <ThemedText style={styles.cellDropdownText} numberOfLines={1}>
                              {exp.masrafTipi || 'Kalem seçiniz'}
                            </ThemedText>
                            <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                          </Pressable>
                        ) : (
                          <ThemedText style={styles.tdTextReadonlyBold} numberOfLines={2}>
                            {exp.masrafTipi}
                          </ThemedText>
                        )}
                      </View>

                      {/* KDV */}
                      <View style={[styles.tdCell, { width: 55 }]}>
                        {isCustom ? (
                          <TextInput
                            editable={!isRowLocked}
                            style={[styles.cellTextInputCenter, isRowLocked && { backgroundColor: '#f1f5f9', color: '#64748b' }]}
                            value={String(exp.kdv ?? '0')}
                            placeholder="0"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            onChangeText={(val) =>
                              handleUpdateExpense(group.containerRid, exp.id, 'kdv', val)
                            }
                          />
                        ) : (
                          <ThemedText style={styles.tdTextReadonly}>
                            %{exp.kdv ?? '0'}
                          </ThemedText>
                        )}
                      </View>

                      {/* Miktar */}
                      <View style={[styles.tdCell, { width: 60 }]}>
                        {isCustom ? (
                          <TextInput
                            editable={!isRowLocked}
                            style={[styles.cellTextInputCenter, isRowLocked && { backgroundColor: '#f1f5f9', color: '#64748b' }]}
                            value={String(exp.miktar ?? '1')}
                            placeholder="1"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            onChangeText={(val) =>
                              handleUpdateExpense(group.containerRid, exp.id, 'miktar', val)
                            }
                          />
                        ) : (
                          <ThemedText style={styles.tdTextReadonly}>
                            {exp.miktar ?? '1'}
                          </ThemedText>
                        )}
                      </View>

                      {/* Alış Fiyatı */}
                      <View style={[styles.tdCell, { width: 90 }]}>
                        {isCustom ? (
                          <TextInput
                            editable={!isRowLocked}
                            style={[styles.cellTextInputRight, isRowLocked && { backgroundColor: '#f1f5f9', color: '#64748b' }]}
                            value={String(exp.alisFiyati)}
                            placeholder="Alış Fiyatı"
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            onChangeText={(val) =>
                              handleUpdateExpense(group.containerRid, exp.id, 'alisFiyati', val)
                            }
                          />
                        ) : (
                          <ThemedText style={styles.tdTextReadonlyGreen}>
                            {exp.alisFiyati}
                          </ThemedText>
                        )}
                      </View>

                      {/* Alış Döviz */}
                      <View style={[styles.tdCell, { width: 90 }]}>
                        {isCustom ? (
                          <Pressable
                            disabled={isRowLocked}
                            onPress={() =>
                              setActivePickerModal({
                                title: 'Alış Döviz Seçimi',
                                options: ['EUR', 'USD', 'GBP', 'TL'],
                                selected: exp.alisDoviz,
                                onSelect: (val) =>
                                  handleUpdateExpense(group.containerRid, exp.id, 'alisDoviz', val),
                              })
                            }
                            style={[styles.cellDropdown, isRowLocked && { opacity: 0.5, backgroundColor: '#f1f5f9' }]}
                          >
                            <ThemedText style={styles.cellDropdownText}>
                              {exp.alisDoviz || 'Seçilmeli'}
                            </ThemedText>
                            <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                          </Pressable>
                        ) : (
                          <ThemedText style={styles.tdTextReadonly}>
                            {exp.alisDoviz}
                          </ThemedText>
                        )}
                      </View>

                      {/* Alış Tarafı */}
                      <View style={[styles.tdCell, { width: 120 }]}>
                        {isCustom ? (
                          <Pressable
                            disabled={isRowLocked}
                            onPress={() =>
                              setLoaderSearchModal({
                                visible: true,
                                title: 'Alış Tarafı Seçiniz',
                                onSelect: (opt) => {
                                  handleUpdateExpense(group.containerRid, exp.id, 'alisTarafi', opt.name);
                                  if (isGuid(opt.id)) {
                                    handleUpdateExpense(group.containerRid, exp.id, 'alisTarafiRid', opt.id);
                                  }
                                },
                              })
                            }
                            style={[styles.cellDropdown, isRowLocked && { opacity: 0.5, backgroundColor: '#f1f5f9' }]}
                          >
                            <ThemedText style={styles.cellDropdownText} numberOfLines={1}>
                              {exp.alisTarafi || 'Firma seçiniz'}
                            </ThemedText>
                            <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                          </Pressable>
                        ) : (
                          <ThemedText style={styles.tdTextReadonly} numberOfLines={2}>
                            {exp.alisTarafi || '-'}
                          </ThemedText>
                        )}
                      </View>

                      {/* Satış Fiyatı */}
                      <View style={[styles.tdCell, { width: 100 }]}>
                        <TextInput
                          editable={!isRowLocked}
                          style={[
                            styles.cellTextInputRightHighlight,
                            isRowLocked && { backgroundColor: '#f1f5f9', color: '#64748b' },
                          ]}
                          value={String(exp.satisFiyati)}
                          placeholder="Satış Fiyatı"
                          placeholderTextColor="#94a3b8"
                          keyboardType="numeric"
                          onChangeText={(val) =>
                            handleUpdateExpense(group.containerRid, exp.id, 'satisFiyati', val)
                          }
                        />
                      </View>

                      {/* Satış Döviz */}
                      <View style={[styles.tdCell, { width: 95 }]}>
                        <Pressable
                          disabled={isRowLocked}
                          onPress={() =>
                            setActivePickerModal({
                              title: 'Satış Döviz Seçimi',
                              options: SATIS_CURRENCY_OPTIONS,
                              selected: exp.satisDoviz,
                              onSelect: (val) =>
                                handleUpdateExpense(
                                  group.containerRid,
                                  exp.id,
                                  'satisDoviz',
                                  normalizeSellCurrency(val, exp.alisDoviz)
                                ),
                            })
                          }
                          style={[styles.cellDropdown, isRowLocked && { opacity: 0.5, backgroundColor: '#f1f5f9' }]}
                        >
                          <ThemedText style={styles.cellDropdownText} numberOfLines={1}>
                            {exp.satisDoviz || normalizeSellCurrency('', exp.alisDoviz)}
                          </ThemedText>
                          <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                        </Pressable>
                      </View>

                      {/* Kar */}
                      <View style={[styles.tdCell, { width: 75 }]}>
                        {(() => {
                          const { text, num } = rowProfitStr(exp);
                          return (
                            <ThemedText
                              style={[
                                styles.profitText,
                                num < 0 && styles.profitNegative,
                                num > 0 && styles.profitPositive,
                              ]}
                            >
                              {text}
                            </ThemedText>
                          );
                        })()}
                      </View>

                      {/* Beher */}
                      <View style={[styles.tdCell, { width: 60 }]}>
                        {isCustom ? (
                          <Pressable
                            disabled={isRowLocked}
                            onPress={() =>
                              setActivePickerModal({
                                title: 'Beher Seçimi',
                                options: ['CNT', 'BL', 'KG', 'SEFER'],
                                selected: exp.beher || 'CNT',
                                onSelect: (val) =>
                                  handleUpdateExpense(group.containerRid, exp.id, 'beher', val),
                              })
                            }
                            style={[styles.cellDropdown, isRowLocked && { opacity: 0.5, backgroundColor: '#f1f5f9' }]}
                          >
                            <ThemedText style={styles.cellDropdownText}>
                              {exp.beher || 'CNT'}
                            </ThemedText>
                            <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                          </Pressable>
                        ) : (
                          <ThemedText style={styles.beherText}>{exp.beher || 'CNT'}</ThemedText>
                        )}
                      </View>

                      {/* Satış Tarafı */}
                      <View style={[styles.tdCell, { width: 130, flexDirection: 'row', alignItems: 'center' }]}>
                        <Pressable
                          disabled={isRowLocked}
                          onPress={() =>
                            setLoaderSearchModal({
                              visible: true,
                              title: 'Satış Tarafı Seçiniz',
                              onSelect: (opt) =>
                                handleUpdateExpense(group.containerRid, exp.id, 'satisTarafi', opt.name),
                            })
                          }
                          style={[styles.cellDropdown, { flex: 1 }, isRowLocked && { opacity: 0.5, backgroundColor: '#f1f5f9' }]}
                        >
                          <ThemedText style={styles.cellDropdownText} numberOfLines={1}>
                            {exp.satisTarafi || 'Seçiniz'}
                          </ThemedText>
                          <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                        </Pressable>
                        {isCustom && (
                          <Pressable
                            disabled={isRowLocked}
                            onPress={() => handleDeleteExpense(group.containerRid, exp.id)}
                            style={[styles.deleteBtn, { marginLeft: 4 }, isRowLocked && { opacity: 0.3 }]}
                          >
                            <ThemedText style={styles.deleteBtnText}>🗑️</ThemedText>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* SPECIAL GRAY ALL IN SUMMARY ROW (When All In checkbox is ticked) */}
                {group.isAllIn && (
                  <View style={[styles.tableBodyRow, { backgroundColor: '#e2e8f0', borderTopWidth: 2, borderTopColor: '#cbd5e1' }]}>
                    {/* Column 1: ALL IN Label */}
                    <View style={[styles.tdCell, { width: 75, alignItems: 'center' }]}>
                      <ThemedText style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>
                        ALL IN
                      </ThemedText>
                    </View>

                    {/* Column 2: Masraf Tipi - Live Expense Select2 */}
                    <View style={[styles.tdCell, { width: 220 }]}>
                      <Pressable
                        disabled={isViewMode}
                        onPress={() =>
                          setExpenseSearchModal({
                            visible: true,
                            title: 'Masraf Kalemi / Tipi Seçiniz',
                            onSelect: (opt) =>
                              handleUpdateAllInRow(group.containerRid, 'masrafTipi', opt.name),
                          })
                        }
                        style={[styles.cellDropdown, isViewMode && { opacity: 0.6, backgroundColor: '#cbd5e1' }]}
                      >
                        <ThemedText style={[styles.cellDropdownText, { fontWeight: '700' }]} numberOfLines={1}>
                          {group.allInRow?.masrafTipi || 'HERŞEY DAHİL TAŞIMA FİYATI'}
                        </ThemedText>
                        <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                      </Pressable>
                    </View>

                    {/* Column 3: KDV */}
                    <View style={[styles.tdCell, { width: 55 }]} />

                    {/* Column 4: Miktar */}
                    <View style={[styles.tdCell, { width: 60 }]} />

                    {/* Column 5: Alış Fiyatı */}
                    <View style={[styles.tdCell, { width: 90, alignItems: 'center' }]}>
                      {(() => {
                        const allInGroupBuyUSD = group.expenses.reduce((acc, e) => {
                          if (e.allIn === 'Hayır') return acc;
                          const qty = parseFloat(String(e.miktar)) || 1;
                          const buy = parseFloat(String(e.alisFiyati)) || 0;
                          return acc + convertToUSD(buy * qty, e.alisDoviz);
                        }, 0);

                        const selectedAlisCurr = group.allInRow?.alisDoviz || 'EUR';
                        const convertedGroupBuy = convertCurrency(allInGroupBuyUSD, 'USD', selectedAlisCurr);

                        return (
                          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                            {convertedGroupBuy.toFixed(2)}
                          </ThemedText>
                        );
                      })()}
                    </View>

                    {/* Column 6: Alış Döviz */}
                    <View style={[styles.tdCell, { width: 90 }]}>
                      <Pressable
                        disabled={isViewMode}
                        onPress={() =>
                          setActivePickerModal({
                            title: 'Alış Döviz Seçimi',
                            options: ['EUR', 'USD', 'GBP', 'TL'],
                            selected: group.allInRow?.alisDoviz || 'EUR',
                            onSelect: (val) =>
                              handleUpdateAllInRow(group.containerRid, 'alisDoviz', val),
                          })
                        }
                        style={[styles.cellDropdown, isViewMode && { opacity: 0.6, backgroundColor: '#cbd5e1' }]}
                      >
                        <ThemedText style={styles.cellDropdownText}>
                          {group.allInRow?.alisDoviz || 'Alış Döviz'}
                        </ThemedText>
                        <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                      </Pressable>
                    </View>

                    {/* Column 7: Alış Tarafı */}
                    <View style={[styles.tdCell, { width: 120 }]} />

                    {/* Column 8: Satış Fiyatı */}
                    <View style={[styles.tdCell, { width: 100 }]}>
                      <TextInput
                        editable={!isViewMode}
                        style={[
                          styles.cellTextInputRightHighlight,
                          isViewMode && { backgroundColor: '#cbd5e1', color: '#475569' },
                        ]}
                        value={group.allInRow?.satisFiyati || ''}
                        placeholder="Satış Fiyatı"
                        placeholderTextColor="#94a3b8"
                        keyboardType="numeric"
                        onChangeText={(val) =>
                          handleUpdateAllInRow(group.containerRid, 'satisFiyati', val)
                        }
                      />
                    </View>

                    {/* Column 9: Satış Döviz */}
                    <View style={[styles.tdCell, { width: 95 }]}>
                      <Pressable
                        disabled={isViewMode}
                        onPress={() =>
                          setActivePickerModal({
                            title: 'Satış Döviz Seçimi',
                            options: SATIS_CURRENCY_OPTIONS,
                            selected: group.allInRow?.satisDoviz || 'EUR',
                            onSelect: (val) =>
                              handleUpdateAllInRow(
                                group.containerRid,
                                'satisDoviz',
                                val
                              ),
                          })
                        }
                        style={[styles.cellDropdown, isViewMode && { opacity: 0.6, backgroundColor: '#cbd5e1' }]}
                      >
                        <ThemedText style={styles.cellDropdownText} numberOfLines={1}>
                          {group.allInRow?.satisDoviz || 'EUR'}
                        </ThemedText>
                        <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                      </Pressable>
                    </View>

                    {/* Column 10: Kar */}
                    <View style={[styles.tdCell, { width: 75, alignItems: 'center' }]}>
                      {(() => {
                        const allInGroupBuyUSD = group.expenses.reduce((acc, e) => {
                          if (e.allIn === 'Hayır') return acc;
                          const qty = parseFloat(String(e.miktar)) || 1;
                          const buy = parseFloat(String(e.alisFiyati)) || 0;
                          return acc + convertToUSD(buy * qty, e.alisDoviz);
                        }, 0);

                        // ALL IN summary row sales price
                        const allInSellVal = parseFloat(group.allInRow?.satisFiyati || '');
                        if (!isNaN(allInSellVal)) {
                          const allInSellUSD = convertToUSD(allInSellVal, group.allInRow?.satisDoviz || 'EURO');
                          const profitUSD = allInSellUSD - allInGroupBuyUSD;
                          const isNeg = profitUSD < 0;
                          const isPos = profitUSD > 0;
                          const formattedProfit = (isNeg ? '-' : (isPos ? '+' : '')) + Math.abs(profitUSD).toFixed(2) + ' $';

                          return (
                            <ThemedText style={{ fontSize: 12, fontWeight: '800', color: isNeg ? '#dc2626' : '#16a34a' }}>
                              {formattedProfit}
                            </ThemedText>
                          );
                        }

                        // Satış Fiyatı boş ise: ALL IN kapsamındaki tüm giderler negatif olarak USD formatında kırmızı yazılır
                        return (
                          <ThemedText style={{ fontSize: 12, fontWeight: '800', color: '#dc2626' }}>
                            -{allInGroupBuyUSD.toFixed(2)} $
                          </ThemedText>
                        );
                      })()}
                    </View>

                    {/* Column 11: Beher */}
                    <View style={[styles.tdCell, { width: 60 }]} />

                    {/* Column 12: Satış Tarafı */}
                    <View style={[styles.tdCell, { width: 130 }]}>
                      <Pressable
                        onPress={() =>
                          setLoaderSearchModal({
                            visible: true,
                            title: 'Satış Tarafı Seçiniz',
                            onSelect: (opt) =>
                              handleUpdateAllInRow(group.containerRid, 'satisTarafi', opt.name),
                          })
                        }
                        style={styles.cellDropdown}
                      >
                        <ThemedText style={styles.cellDropdownText} numberOfLines={1}>
                          {group.allInRow?.satisTarafi || yukleyici || kotasyonSahibi || ''}
                        </ThemedText>
                        <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* TOTALS SUMMARY BOX (TOPLAM ALIŞ / SATIŞ FİYATLARI - 3 CURRENCIES + KAR ($)) */}
            {(() => {
              const totals = calcTotals([group]);

              return (
                <View style={{ marginTop: 12 }}>
                  {isMobilePortrait ? (
                    <View style={styles.summaryTotalsCardMobile}>
                      {/* Header Row */}
                      <View style={styles.summaryMobileHeaderRow}>
                        <ThemedText style={styles.summaryMobileThCurrency}>Döviz</ThemedText>
                        <ThemedText style={styles.summaryMobileThVal}>TOPLAM ALIŞ</ThemedText>
                        <ThemedText style={styles.summaryMobileThVal}>TOPLAM SATIŞ</ThemedText>
                      </View>

                      {/* USD Row */}
                      <View style={styles.summaryMobileRow}>
                        <ThemedText style={styles.summaryMobileCurrencyLabel}>USD ($)</ThemedText>
                        <View style={styles.summaryMobileValBox}>
                          <ThemedText style={styles.summaryValText}>{totals.buy.USD}</ThemedText>
                        </View>
                        <View style={styles.summaryMobileValBox}>
                          <ThemedText style={styles.summaryValText}>{totals.sell.USD}</ThemedText>
                        </View>
                      </View>

                      {/* EURO Row */}
                      <View style={styles.summaryMobileRow}>
                        <ThemedText style={styles.summaryMobileCurrencyLabel}>EURO (€)</ThemedText>
                        <View style={styles.summaryMobileValBox}>
                          <ThemedText style={styles.summaryValText}>{totals.buy.EURO}</ThemedText>
                        </View>
                        <View style={styles.summaryMobileValBox}>
                          <ThemedText style={styles.summaryValText}>{totals.sell.EURO}</ThemedText>
                        </View>
                      </View>

                      {/* GBP Row */}
                      <View style={styles.summaryMobileRow}>
                        <ThemedText style={styles.summaryMobileCurrencyLabel}>GBP (£)</ThemedText>
                        <View style={styles.summaryMobileValBox}>
                          <ThemedText style={styles.summaryValText}>{totals.buy.GBP}</ThemedText>
                        </View>
                        <View style={styles.summaryMobileValBox}>
                          <ThemedText style={styles.summaryValText}>{totals.sell.GBP}</ThemedText>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.summaryTotalsCard}>
                      {/* TOPLAM ALIŞ FİYATLARI */}
                      <View style={styles.summaryHalfLeft}>
                        <ThemedText style={styles.summaryTitle}>TOPLAM ALIŞ FİYATLARI :</ThemedText>
                        <View style={styles.summaryList}>
                          <View style={styles.summaryRowItem}>
                            <ThemedText style={styles.summaryCurrencyLabel}>USD</ThemedText>
                            <View style={styles.summaryValBox}>
                              <ThemedText style={styles.summaryValText}>{totals.buy.USD}</ThemedText>
                            </View>
                          </View>
                          <View style={styles.summaryRowItem}>
                            <ThemedText style={styles.summaryCurrencyLabel}>EURO</ThemedText>
                            <View style={styles.summaryValBox}>
                              <ThemedText style={styles.summaryValText}>{totals.buy.EURO}</ThemedText>
                            </View>
                          </View>
                          <View style={styles.summaryRowItem}>
                            <ThemedText style={styles.summaryCurrencyLabel}>GBP</ThemedText>
                            <View style={styles.summaryValBox}>
                              <ThemedText style={styles.summaryValText}>{totals.buy.GBP}</ThemedText>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* TOPLAM SATIŞ FİYATLARI */}
                      <View style={styles.summaryHalfRight}>
                        <ThemedText style={styles.summaryTitle}>TOPLAM SATIŞ FİYATLARI :</ThemedText>
                        <View style={styles.summaryList}>
                          <View style={styles.summaryRowItem}>
                            <ThemedText style={styles.summaryCurrencyLabel}>USD</ThemedText>
                            <View style={styles.summaryValBox}>
                              <ThemedText style={styles.summaryValText}>{totals.sell.USD}</ThemedText>
                            </View>
                          </View>
                          <View style={styles.summaryRowItem}>
                            <ThemedText style={styles.summaryCurrencyLabel}>EURO</ThemedText>
                            <View style={styles.summaryValBox}>
                              <ThemedText style={styles.summaryValText}>{totals.sell.EURO}</ThemedText>
                            </View>
                          </View>
                          <View style={styles.summaryRowItem}>
                            <ThemedText style={styles.summaryCurrencyLabel}>GBP</ThemedText>
                            <View style={styles.summaryValBox}>
                              <ThemedText style={styles.summaryValText}>{totals.sell.GBP}</ThemedText>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* KAR ($) RED LINE - Only visible in view mode after offer creation */}
                  {(isViewMode || isOfferCreated) && (
                    <View style={{ alignItems: 'flex-end', marginTop: 10, paddingRight: 4 }}>
                      <ThemedText style={{ fontSize: 16, fontWeight: '800', color: '#ff4d4f' }}>
                        KAR ($): {totals.profitUSD} $
                      </ThemedText>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        ))}

        {/* BOTTOM ACTION BUTTONS */}
        <View style={styles.bottomActionsRow}>
          <Pressable
            onPress={onBack || onClose}
            style={[styles.actionButton, styles.btnBack]}
          >
            <ThemedText style={styles.actionBtnText}>
              Kotasyon Arama Ekranına Dön
            </ThemedText>
          </Pressable>

          {!isOfferCreated ? (
            <Pressable
              onPress={handleSubmitOffer}
              disabled={isSubmitting || isLoadingExpenses}
              style={[
                styles.actionButton,
                styles.btnSubmit,
                (isSubmitting || isLoadingExpenses) && styles.btnDisabled,
              ]}
            >
              {isSubmitting || isLoadingExpenses ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText style={styles.actionBtnText}>Teklif Oluştur</ThemedText>
              )}
            </Pressable>
          ) : (
            <View style={[styles.actionButton, { backgroundColor: '#16a34a', opacity: 0.85, flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
              <ThemedText style={styles.actionBtnText}>Teklif Oluşturuldu</ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      {/* GENERIC OPTION PICKER MODAL */}
      {activePickerModal && (
        <Modal
          transparent
          visible={!!activePickerModal}
          onRequestClose={() => setActivePickerModal(null)}
          animationType="fade"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActivePickerModal(null)}
          >
            <View style={styles.pickerModalCard}>
              <View style={styles.pickerHeader}>
                <ThemedText style={styles.pickerTitle}>
                  {activePickerModal.title}
                </ThemedText>
                <Pressable onPress={() => setActivePickerModal(null)}>
                  <ThemedText style={styles.pickerCloseText}>✕</ThemedText>
                </Pressable>
              </View>
              <ScrollView style={styles.pickerScrollView}>
                {activePickerModal.options.map((opt, i) => (
                  <Pressable
                    key={`${opt}_${i}`}
                    onPress={() => {
                      activePickerModal.onSelect(opt);
                      setActivePickerModal(null);
                    }}
                    style={[
                      styles.pickerOptionItem,
                      activePickerModal.selected === opt && styles.pickerOptionSelected,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.pickerOptionText,
                        activePickerModal.selected === opt && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {opt}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}

      {/* LIVE SEARCH PICKER MODAL (HAT / LOCATION / PORT / LOADER) */}
      {searchModalConfig && (
        <SearchablePickerModal
          visible={searchModalConfig.visible}
          title={searchModalConfig.title}
          placeholder={searchModalConfig.placeholder || 'Aramak için yazınız...'}
          type={searchModalConfig.type}
          activeBaseUrl={activeBaseUrl}
          authToken={authToken}
          onClose={() => setSearchModalConfig(null)}
          onSelect={(item) => {
            searchModalConfig.onSelect(item);
            setSearchModalConfig(null);
          }}
        />
      )}

      {/* LIVE LOADER / CO-LOADER API SEARCH MODAL */}
      {loaderSearchModal && (
        <SearchablePickerModal
          visible={loaderSearchModal.visible}
          title={loaderSearchModal.title}
          placeholder="Firma / Yükleyici adı veya kodu ile canlı arayın..."
          type="loader"
          activeBaseUrl={activeBaseUrl}
          authToken={authToken}
          onClose={() => setLoaderSearchModal(null)}
          onSelect={(item) => {
            loaderSearchModal.onSelect(item);
            setLoaderSearchModal(null);
          }}
        />
      )}

      {/* LIVE EXPENSE API SEARCH MODAL */}
      {expenseSearchModal && (
        <SearchablePickerModal
          visible={expenseSearchModal.visible}
          title={expenseSearchModal.title}
          placeholder="Masraf kalemi adı veya kodu ile canlı arayın..."
          type="expense"
          activeBaseUrl={activeBaseUrl}
          authToken={authToken}
          onClose={() => setExpenseSearchModal(null)}
          onSelect={(item) => {
            expenseSearchModal.onSelect(item);
            setExpenseSearchModal(null);
          }}
        />
      )}

      {/* TURKISH CALENDAR / DATE PICKER MODAL */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
          <Pressable style={styles.calendarCard} onPress={(e) => e.stopPropagation()}>
            {pickerMode === 'month' ? (
              /* ================= MONTH SELECTION VIEW ================= */
              <View>
                <View style={styles.pickerSubHeader}>
                  <Pressable onPress={() => setPickerMode('calendar')} style={styles.pickerBackBtn}>
                    <ThemedText style={styles.pickerBackBtnText}>← Takvim</ThemedText>
                  </Pressable>
                  <ThemedText style={styles.pickerSubTitle}>Ay Seçiniz ({currentYear})</ThemedText>
                </View>

                <View style={styles.monthGrid}>
                  {TURKISH_MONTHS.map((monthName, idx) => {
                    const isSelected = idx === currentMonth;
                    const isMonthDisabled = isDateAfterMax(currentYear, idx, 1, kotasyonGecerlilik);
                    return (
                      <Pressable
                        key={idx}
                        disabled={isMonthDisabled}
                        onPress={() => {
                          if (isMonthDisabled) return;
                          setCalendarDate(new Date(currentYear, idx, 1));
                          setPickerMode('calendar');
                        }}
                        style={({ pressed }) => [
                          styles.monthCell,
                          isSelected && styles.monthCellSelected,
                          isMonthDisabled && { opacity: 0.35 },
                          pressed && !isMonthDisabled && { opacity: 0.7 },
                        ]}
                      >
                        <ThemedText style={[styles.monthCellText, isSelected && styles.monthCellTextSelected, isMonthDisabled && { color: '#cbd5e1' }]}>
                          {monthName}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : pickerMode === 'year' ? (
              /* ================= YEAR SELECTION VIEW ================= */
              <View>
                <View style={styles.pickerSubHeader}>
                  <Pressable onPress={() => setPickerMode('calendar')} style={styles.pickerBackBtn}>
                    <ThemedText style={styles.pickerBackBtnText}>← Takvim</ThemedText>
                  </Pressable>
                  <ThemedText style={styles.pickerSubTitle}>Yıl Seçiniz ({TURKISH_MONTHS[currentMonth]})</ThemedText>
                </View>

                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={true}>
                  <View style={styles.yearGrid}>
                    {YEAR_OPTIONS.map((y) => {
                      const isSelected = y === currentYear;
                      const isYearDisabled = isDateAfterMax(y, 0, 1, kotasyonGecerlilik);
                      return (
                        <Pressable
                          key={y}
                          disabled={isYearDisabled}
                          onPress={() => {
                            if (isYearDisabled) return;
                            setCalendarDate(new Date(y, currentMonth, 1));
                            setPickerMode('calendar');
                          }}
                          style={({ pressed }) => [
                            styles.yearCell,
                            isSelected && styles.yearCellSelected,
                            isYearDisabled && { opacity: 0.35 },
                            pressed && !isYearDisabled && { opacity: 0.7 },
                          ]}
                        >
                          <ThemedText style={[styles.yearCellText, isSelected && styles.yearCellTextSelected, isYearDisabled && { color: '#cbd5e1' }]}>
                            {y}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            ) : (
              /* ================= STANDARD CALENDAR VIEW ================= */
              <>
                {/* Max Date Info Hint Box */}
                {kotasyonGecerlilik ? (
                  <View style={{ backgroundColor: '#fffbe6', borderWidth: 1, borderColor: '#ffe58f', borderRadius: 6, padding: 8, marginBottom: 10 }}>
                    <ThemedText style={{ fontSize: 11, color: '#d46b08', textAlign: 'center', fontWeight: '600' }}>
                      ℹ Teklif geçerlilik tarihi en geç Kotasyon Geçerlilik Tarihine ({kotasyonGecerlilik}) kadar seçilebilir.
                    </ThemedText>
                  </View>
                ) : null}

                {/* Calendar Header (Month/Year & Prev/Next buttons) */}
                <View style={styles.calendarHeader}>
                  <Pressable
                    onPress={() => setCalendarDate(new Date(currentYear, currentMonth - 1, 1))}
                    style={styles.calendarNavBtn}
                  >
                    <ThemedText style={styles.calendarNavText}>‹</ThemedText>
                  </Pressable>

                  {/* Clickable Month & Year for quick Selection */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Pressable
                      onPress={() => setPickerMode('month')}
                      style={({ pressed }) => [styles.calendarTitlePill, pressed && { opacity: 0.8 }]}
                    >
                      <ThemedText style={styles.calendarTitlePillText}>{TURKISH_MONTHS[currentMonth]}</ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => setPickerMode('year')}
                      style={({ pressed }) => [styles.calendarTitlePill, pressed && { opacity: 0.8 }]}
                    >
                      <ThemedText style={styles.calendarTitlePillText}>{currentYear}</ThemedText>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => setCalendarDate(new Date(currentYear, currentMonth + 1, 1))}
                    style={styles.calendarNavBtn}
                  >
                    <ThemedText style={styles.calendarNavText}>›</ThemedText>
                  </Pressable>
                </View>

                {/* Weekday Row */}
                <View style={styles.weekdayRow}>
                  {TURKISH_WEEKDAYS.map((dayName, idx) => (
                    <View key={idx} style={styles.weekdayCol}>
                      <ThemedText style={styles.weekdayText}>{dayName}</ThemedText>
                    </View>
                  ))}
                </View>

                {/* Calendar Days Grid */}
                <View style={styles.daysGrid}>
                  {calendarDays.map((item, index) => {
                    const formattedDateStr = `${String(item.day).padStart(2, '0')}/${String(item.month + 1).padStart(2, '0')}/${item.year}`;
                    const isSelected = (teklifGecerlilik || getTodayDateString()) === formattedDateStr;
                    const isFutureDisabled = isDateAfterMax(item.year, item.month, item.day, kotasyonGecerlilik);

                    return (
                      <Pressable
                        key={index}
                        style={styles.dayCell}
                        disabled={isFutureDisabled}
                        onPress={() => {
                          if (isFutureDisabled) return;
                          setTeklifGecerlilik(formattedDateStr);
                          setShowDatePicker(false);
                        }}
                      >
                        <View style={[
                          styles.dayInner,
                          isSelected && styles.dayInnerSelected,
                          isFutureDisabled && { opacity: 0.25 }
                        ]}>
                          <ThemedText
                            style={[
                              styles.dayText,
                              (!item.isCurrent || isFutureDisabled) && styles.dayTextDisabled,
                              isSelected && styles.dayTextSelected,
                            ]}
                          >
                            {item.day}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* SWEETALERT STYLE FEEDBACK POPUP */}
      {swalModal && (
        <Modal
          transparent
          visible={swalModal.visible}
          onRequestClose={() => setSwalModal(null)}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.swalCard}>
              <View style={styles.swalIconContainer}>
                <ThemedText style={styles.swalIconText}>
                  {swalModal.icon === 'success' ? '✓' : swalModal.icon === 'warning' ? '⚠️' : '❌'}
                </ThemedText>
              </View>

              <ThemedText style={styles.swalTitle}>{swalModal.title}</ThemedText>
              <ThemedText style={styles.swalText}>{swalModal.text}</ThemedText>

              <Pressable
                onPress={() => {
                  setSwalModal(null);
                  // Başarı durumunda sayfada kal (görüntüleme modu), sadece modali kapat
                }}
                style={styles.swalConfirmBtn}
              >
                <ThemedText style={styles.swalConfirmBtnText}>Tamam</ThemedText>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  homeBtn: {
    padding: 6,
    marginRight: 10,
  },
  homeIcon: {
    fontSize: 18,
    color: '#0284c7',
  },
  headerNavTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0284c7',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardSection: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardHeaderBanner: {
    backgroundColor: '#ff7a45',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cardHeaderBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardBody: {
    padding: 16,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 10,
  },
  gridItemQuarter: {
    width: Platform.OS === 'web' ? '25%' : '50%',
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  gridItemHalf: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  fieldValBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  fieldValText: {
    fontSize: 13,
    color: '#475569',
  },
  mutedText: {
    color: '#94a3b8',
  },
  textInputBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textInputBoxFlex: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  dropdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#f8fafc',
  },
  dropdownText: {
    fontSize: 13,
    color: '#0f172a',
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 6,
  },
  inputWithActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearBtn: {
    position: 'absolute',
    right: 28,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  inputDropdownIcon: {
    position: 'absolute',
    right: 8,
    paddingHorizontal: 4,
  },

  /* CONTAINER GROUP HEADER */
  containerGroupHeaderBanner: {
    backgroundColor: '#ff7a45',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  containerGroupHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  addExpenseBtn: {
    backgroundColor: '#722ed1',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addExpenseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* EXPENSES TABLE */
  expensesTable: {
    width: '100%',
    minWidth: 1100,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#fff1f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ffd591',
    alignItems: 'center',
  },
  thCell: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  thText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#434343',
    textAlign: 'center',
  },
  tableBodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  altRowBackground: {
    backgroundColor: '#fafafa',
  },
  tdCell: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    justifyContent: 'center',
  },
  cellTextInput: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    color: '#262626',
    backgroundColor: '#ffffff',
  },
  cellTextInputCenter: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontSize: 12,
    textAlign: 'center',
    color: '#262626',
    backgroundColor: '#ffffff',
  },
  cellTextInputRight: {
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    textAlign: 'right',
    color: '#262626',
    backgroundColor: '#ffffff',
  },
  cellTextInputRightHighlight: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    textAlign: 'right',
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  cellDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d9d9d9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  cellDropdownText: {
    fontSize: 11,
    color: '#262626',
  },
  dropdownArrowSmall: {
    fontSize: 8,
    color: '#8c8c8c',
    marginLeft: 2,
  },
  profitText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#595959',
  },
  profitPositive: {
    color: '#52c41a',
    fontWeight: '700',
  },
  profitNegative: {
    color: '#ff4d4f',
    fontWeight: '700',
  },
  beherText: {
    fontSize: 12,
    textAlign: 'center',
    color: '#595959',
    fontWeight: '600',
  },
  tdTextReadonly: {
    fontSize: 12,
    color: '#1e293b',
    textAlign: 'center',
  },
  tdTextReadonlyBold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  tdTextReadonlyGreen: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803d',
    textAlign: 'right',
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 14,
  },

  /* SUMMARY TOTALS CARD */
  summaryTotalsCardMobile: {
    backgroundColor: '#e2e8f0',
    marginTop: 12,
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  summaryMobileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    gap: 8,
  },
  summaryMobileThCurrency: {
    width: 68,
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textAlign: 'left',
  },
  summaryMobileThVal: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  summaryMobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryMobileCurrencyLabel: {
    width: 68,
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryMobileValBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  summaryTotalsCard: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    marginTop: 12,
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 6,
    padding: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  summaryHalfLeft: {
    flex: 1,
  },
  summaryHalfRight: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryList: {
    gap: 6,
  },
  summaryRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  summaryCurrencyLabel: {
    width: 45,
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'right',
  },
  summaryValBox: {
    flex: 1,
    maxWidth: 120,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  summaryValText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'left',
  },

  /* BOTTOM ACTIONS */
  bottomActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnBack: {
    backgroundColor: '#1e293b',
  },
  btnSubmit: {
    backgroundColor: '#2563eb',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* PICKER & ADD EXPENSE MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
    marginBottom: 10,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#262626',
  },
  pickerCloseText: {
    fontSize: 16,
    color: '#8c8c8c',
  },
  pickerScrollView: {
    maxHeight: 300,
  },
  pickerOptionItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#fafafa',
  },
  pickerOptionSelected: {
    backgroundColor: '#e6f7ff',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#262626',
  },
  pickerOptionTextSelected: {
    color: '#1890ff',
    fontWeight: '700',
  },

  addExpenseModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    width: '90%',
    maxWidth: 420,
    padding: 20,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 16,
  },
  currencyChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d9d9d9',
    backgroundColor: '#ffffff',
  },
  currencyChipActive: {
    borderColor: '#1890ff',
    backgroundColor: '#e6f7ff',
  },
  currencyChipText: {
    fontSize: 12,
    color: '#595959',
  },
  currencyChipTextActive: {
    color: '#1890ff',
    fontWeight: '700',
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#f5f5f5',
  },
  modalCancelBtnText: {
    fontSize: 13,
    color: '#595959',
  },
  modalAddBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#1890ff',
  },
  modalAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* SWEETALERT POPUP STYLES */
  swalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 420,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  swalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#52c41a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  swalIconText: {
    fontSize: 28,
    color: '#52c41a',
  },
  swalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#262626',
    textAlign: 'center',
    marginBottom: 8,
  },
  swalText: {
    fontSize: 14,
    color: '#595959',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  swalConfirmBtn: {
    backgroundColor: '#7066e0',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 6,
  },
  swalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Calendar & DatePicker Modal Styles (from sefer-duzenleme.tsx)
  calendarCard: {
    width: 330,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  calendarNavText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
  },
  calendarTitlePill: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  calendarTitlePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  pickerSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerBackBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pickerBackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  pickerSubTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  monthCell: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 4,
  },
  monthCellSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  monthCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  monthCellTextSelected: {
    color: '#ffffff',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  yearCell: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 4,
  },
  yearCellSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  yearCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  yearCellTextSelected: {
    color: '#ffffff',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCol: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerSelected: {
    backgroundColor: '#2563eb',
  },
  dayText: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '500',
  },
  dayTextDisabled: {
    color: '#cbd5e1',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },

  /* TEKLİF BİLGİLERİ SCREENSHOT DESIGN STYLES */
  designFieldContainer: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  designLabelCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 3,
    paddingRight: 4,
  },
  designLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  designInfoCircle: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  designInfoCircleText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  designPdfHideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
    gap: 2,
  },
  designPdfHideText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  designPdfHideIcon: {
    fontSize: 10,
    color: '#64748b',
  },
  designMenuIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginHorizontal: 2,
  },
  designValueBoxWrapper: {
    flex: 1.2,
  },
  designStaticBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 34,
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  designDropdownBox: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  designInputBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    color: '#0f172a',
    minHeight: 34,
  },
  designValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  designMutedText: {
    color: '#94a3b8',
  },
  designDropdownArrow: {
    fontSize: 9,
    color: '#64748b',
    marginLeft: 4,
  },
});
