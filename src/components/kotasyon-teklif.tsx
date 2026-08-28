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
import { OptionItem, SearchablePickerModal } from './kotasyon-arama';

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

export interface ExpenseItem {
  id: string;
  allIn: string; // "Evet" | "Hayır"
  masrafTipi: string;
  kdv: string | number;
  miktar: string | number;
  alisFiyati: string | number;
  alisDoviz: string;
  alisTarafi: string;
  satisFiyati: string | number;
  satisDoviz: string;
  beher: string;
  satisTarafi: string;
  isCustomAdded?: boolean;
}

export interface ContainerGroup {
  containerRid: string;
  containerType: string;
  isAllIn?: boolean;
  allInRow?: {
    masrafTipi?: string;
    satisFiyati: string;
    satisDoviz: string;
    alisDoviz: string;
    satisTarafi: string;
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

const SATIS_CURRENCY_OPTIONS = ['EURO', 'USD', 'GBP'];
const BEHER_OPTIONS = ['CNT', 'CBM', 'SET', 'KG', 'BL'];


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
    rawItem?.sellingprice ??
    rawItem?.SELLINGPRICE ??
    rawItem?.satisfiyati ??
    rawItem?.SATISFIYATI ??
    rawItem?.salesprice ??
    rawItem?.SALESPRICE ??
    '';

  const satisDovizVal =
    rawItem?.sellingcurrency ||
    rawItem?.SELLINGCURRENCY ||
    rawItem?.satisdoviz ||
    rawItem?.SATISDOVIZ ||
    rawItem?.salescurrency ||
    rawItem?.SALESCURRENCY ||
    (alisDovizVal === 'USD' ? 'USD' : 'EURO');

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
    alisDoviz: String(alisDovizVal),
    alisTarafi: String(alisTarafiVal),
    satisFiyati: String(satisFiyatiVal),
    satisDoviz: String(satisDovizVal),
    beher: String(beherVal),
    satisTarafi: String(satisTarafiVal),
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
      const expType = exp.CONTAINERTYPE || exp.containertype || exp.containertypeshort || exp.CONTAINERTYPESHORT || '';
      let cRid = exp.CONTAINERRID || exp.containerrid;

      // If cRid not provided, try matching by container type name
      if (!cRid && expType) {
        for (const [key, val] of groupMap.entries()) {
          if (val.type.toLowerCase() === expType.toLowerCase()) {
            cRid = key;
            break;
          }
        }
      }

      if (!cRid) cRid = Array.from(groupMap.keys())[0] || 'cont_default';
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

  const ticariTipiStr = searchParams?.ticariTipi || '';
  const isIthalat =
    ticariTipiStr.includes('İthalat') ||
    ticariTipiStr.includes('ITHALAT') ||
    ticariTipiStr.toLowerCase().includes('ithal');

  const isDirectImport = !primaryQuotation || isIthalat;

  // General Offer Form State
  const [kotasyonNo, setKotasyonNo] = useState<string>(
    primaryQuotation?.quotationno || ''
  );
  const [kotasyonSahibi, setKotasyonSahibi] = useState<string>(
    primaryQuotation?.customername || searchParams?.customerName || ''
  );
  const [hat, setHat] = useState<string>(
    primaryQuotation?.line || searchParams?.hat || ''
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

  const [yuklemeYeri, setYuklemeYeri] = useState<string>(
    primaryQuotation?.loadinglocation || primaryQuotation?.loadinglocationshort || searchParams?.yuklemeYeri || ''
  );
  const [yuklemeLimani, setYuklemeLimani] = useState<string>(
    primaryQuotation?.loadingport || searchParams?.yuklemeLimani || ''
  );
  const [tahliyeYeri, setTahliyeYeri] = useState<string>(
    primaryQuotation?.dischargelocation || primaryQuotation?.dischargelocationshort || searchParams?.tahliyeYeri || searchParams?.teslimYeri || ''
  );
  const [tahliyeLimani, setTahliyeLimani] = useState<string>(
    primaryQuotation?.dischargeport || searchParams?.tahliyeLimani || searchParams?.teslimLimani || ''
  );
  const [dolumTipi, setDolumTipi] = useState<string>(
    primaryQuotation?.fillingtype || searchParams?.dolumTipi || 'Fabrika Dolum'
  );

  // RID states for line, ports, and locations (will be updated when detail endpoint completes)
  const [lineRid, setLineRid] = useState<string | undefined>(
    cleanGuidOrUndefined((primaryQuotation as any)?.linerid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.LINERID) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.lineRid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.lineRID) ||
    cleanGuidOrUndefined(searchParams?.lineRID) ||
    cleanGuidOrUndefined(searchParams?.lineRid) ||
    cleanGuidOrUndefined(searchParams?.hatRID) ||
    cleanGuidOrUndefined(searchParams?.hatRid)
  );

  const [loadingPortRid, setLoadingPortRid] = useState<string | undefined>(
    cleanGuidOrUndefined((primaryQuotation as any)?.loadingportrid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.LOADINGPORTRID) ||
    cleanGuidOrUndefined(searchParams?.loadingPortRID) ||
    cleanGuidOrUndefined(searchParams?.loadingPortRid)
  );

  const [dischargePortRid, setDischargePortRid] = useState<string | undefined>(
    cleanGuidOrUndefined((primaryQuotation as any)?.dischargeportrid) ||
    cleanGuidOrUndefined((primaryQuotation as any)?.DISCHARGEPORTRID) ||
    cleanGuidOrUndefined(searchParams?.dischargePortRID) ||
    cleanGuidOrUndefined(searchParams?.dischargePortRid)
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

  const [yanicilik, setYanicilik] = useState<string>('Yanıcısız');
  const [yanicilikAciklama, setYanicilikAciklama] = useState<string>('');
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
          cleanGuidOrUndefined((primaryQuotation as any)?.selectedloadingportrid) ||
          cleanGuidOrUndefined((primaryQuotation as any)?.loadingportrid) ||
          cleanGuidOrUndefined(searchParams?.loadingLocationRID) ||
          cleanGuidOrUndefined(searchParams?.loadingPortRID) ||
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

              const foundLoadingPortRid = cleanGuidOrUndefined(data.loadingportrid || data.loadingportrid || data.loadingportrid);
              if (foundLoadingPortRid) setLoadingPortRid(foundLoadingPortRid);

              const foundDischargePortRid = cleanGuidOrUndefined(data.dischargeportrid || data.dischargeportrid || data.dischargeportrid);
              if (foundDischargePortRid) setDischargePortRid(foundDischargePortRid);

              const foundLoadingLocationRid = cleanGuidOrUndefined(data.loadinglocationrid || data.loadinglocationrid || data.selectedloadinglocationrid);
              if (foundLoadingLocationRid) setLoadingLocationRid(foundLoadingLocationRid);

              const foundDischargeLocationRid = cleanGuidOrUndefined(data.dischargelocationrid || data.dischargelocationrid);
              if (foundDischargeLocationRid) setDischargeLocationRid(foundDischargeLocationRid);

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
              const contInfo = data.containersinfo || data.containers || [];
              if (Array.isArray(contInfo)) {
                contInfo.forEach((c: any) => {
                  const navlunCost = c.containercost ?? c.CONTAINERCOST;
                  if (navlunCost !== undefined && parseFloat(String(navlunCost)) > 0) {
                    const navlunExists = detailExpenses.some(
                      (e: any) =>
                        (e.expensetype || e.optionlabel || '').toUpperCase().includes('NAVLUN') &&
                        (e.containertype || e.CONTAINERTYPE || '').toUpperCase() === (c.containertype || '').toUpperCase()
                    );
                    if (!navlunExists) {
                      detailExpenses.push({
                        expensetype: 'DENİZYOLU NAVLUN ÜCRETİ',
                        buyingcost: navlunCost,
                        buyingcurrency: c.currency || c.doviz || 'EUR',
                        containertype: c.containertype || c.containertypeshort,
                        containerrid: c.containerrid || c.id,
                        beher: 'CNT',
                      });
                    }
                  }
                });
              }

              if (detailExpenses.length > 0) {
                const groupMap = new Map<string, { type: string; expenses: ExpenseItem[] }>();

                // Collect explicit container types
                const containerTypesSet = new Set<string>();
                detailExpenses.forEach((exp: any) => {
                  const rawType = exp.containertype || exp.CONTAINERTYPE || exp.containertypeshort || exp.CONTAINERTYPESHORT;
                  if (rawType && String(rawType).trim() !== '' && String(rawType).toUpperCase() !== 'BL' && String(rawType).toUpperCase() !== 'GENEL') {
                    containerTypesSet.add(String(rawType).trim());
                  }
                });

                if (containerTypesSet.size === 0) {
                  const primaryType = (primaryQuotation as any)?.containertype || '40 High Cube';
                  containerTypesSet.add(primaryType);
                }

                containerTypesSet.forEach((cType) => {
                  groupMap.set(cType.toUpperCase(), { type: cType, expenses: [] });
                });

                const generalList: ExpenseItem[] = [];

                detailExpenses.forEach((exp: any) => {
                  const rawType = exp.containertype || exp.CONTAINERTYPE || exp.containertypeshort || exp.CONTAINERTYPESHORT;
                  const item = parseExpenseItem(exp, lineVal, customerVal);

                  if (rawType && String(rawType).trim() !== '' && String(rawType).toUpperCase() !== 'BL' && String(rawType).toUpperCase() !== 'GENEL') {
                    const groupKey = String(rawType).trim().toUpperCase();
                    if (!groupMap.has(groupKey)) {
                      groupMap.set(groupKey, { type: String(rawType).trim(), expenses: [] });
                    }
                    groupMap.get(groupKey)!.expenses.push(item);
                  } else {
                    generalList.push(item);
                  }
                });

                // Attach general/BL expenses to all container groups
                if (generalList.length > 0) {
                  groupMap.forEach((g) => {
                    generalList.forEach((genExp) => {
                      const exists = g.expenses.some(
                        (e) => e.masrafTipi === genExp.masrafTipi && e.id === genExp.id
                      );
                      if (!exists) {
                        g.expenses.push(genExp);
                      }
                    });
                  });
                }

                const groups: ContainerGroup[] = Array.from(groupMap.values()).map((g, idx) => ({
                  containerRid: `cnt_det_${idx}`,
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
          'd9b3f037-3cc4-4f3a-92f8-ae0d7f62b8fc';

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

      if (selectedContainerList.length > 0) {
        const groups: ContainerGroup[] = selectedContainerList.map((cType, idx) => ({
          containerRid: `cnt_param_${idx}_${Date.now()}`,
          containerType: cType,
          expenses: [],
        }));

        if (isMounted) {
          setContainerGroups(groups);
          setIsLoadingExpenses(false);
          return;
        }
      } else if (isMounted) {
        setContainerGroups([
          {
            containerRid: `cnt_default_${Date.now()}`,
            containerType: '40 High Cube',
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
      alisTarafi: hat || 'ACENTA',
      satisFiyati: '',
      satisDoviz: 'EURO',
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
            satisDoviz: 'EURO',
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

    if (!primaryQuotation && (!selectedQuotations || selectedQuotations.length === 0)) {
      setSwalModal({
        visible: true,
        icon: 'warning',
        title: 'İşlem Tamamlanamadı',
        text: 'Teklif oluşturma işlemine devam edebilmek için lütfen önce bir kotasyon seçiniz.',
      });
      return;
    }

    // Basic validation
    let missingOptions = '';
    if (!teklifGecerlilik) missingOptions += 'Geçerlilik tarihi girmeniz gerekmektedir.\n';
    if (!odemeTipi) missingOptions += 'Ödeme tipini seçmeniz gerekmektedir.\n';
    if (!incoterm || incoterm === 'Seçiniz') missingOptions += 'Incoterm seçmeniz gerekmektedir.\n';

    // Satış fiyatı validasyonu: AllIn değilse her satırın satış fiyatı dolu olmalı
    containerGroups.forEach((group) => {
      if (group.isAllIn) {
        // AllIn modunda sadece allInRow’un satış fiyatı kontrol edilir
        if (!group.allInRow?.satisFiyati || String(group.allInRow.satisFiyati).trim() === '') {
          missingOptions += `"${group.containerType}" konteyneri için AllIn satış fiyatı girilmesi gerekmektedir.\n`;
        }
      } else {
        group.expenses.forEach((exp) => {
          const sellStr = String(exp.satisFiyati ?? '').trim();
          if (sellStr === '' || isNaN(parseFloat(sellStr))) {
            missingOptions += `"${exp.masrafTipi || 'Masraf'}" satırı için satış fiyatı girilmesi gerekmektedir.\n`;
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
        cleanGuidOrUndefined(loadingLocationRid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.loadinglocationrid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.LOADINGLOCATIONRID) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.selectedloadinglocationrid) ||
        cleanGuidOrUndefined(searchParams?.loadingLocationRID) ||
        cleanGuidOrUndefined(searchParams?.loadingLocationRid) ||
        null;

      const resolvedDischargeLocationRID =
        cleanGuidOrUndefined(dischargeLocationRid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.dischargelocationrid) ||
        cleanGuidOrUndefined((primaryQuotation as any)?.DISCHARGELOCATIONRID) ||
        cleanGuidOrUndefined(searchParams?.dischargeLocationRID) ||
        cleanGuidOrUndefined(searchParams?.dischargeLocationRid) ||
        null;

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

      // Build containerRids
      const containerRids = containerGroups
        .map((g) => g.containerRid)
        .filter(isGuid)
        .join(',') || null;

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

      const addOfferModel: Record<string, any> = {
        QUOTATIONRID: quotationRID,
        CUSTOMERRID: customerRID,
        LOADINGLOCATIONRID: resolvedLoadingLocationRID,
        LOADINGPORTRID: resolvedLoadingPortRID,
        DISCHARGEPORTRID: resolvedDischargePortRID,
        DISCHARGELOCATIONRID: resolvedDischargeLocationRID,
        LINERID: resolvedLineRid,
        WHOADDUSERRID: whoAddUserRid,
        OFFERVALIDITYDATE: teklifGecerlilik || null,
        FREETIME: freeTime || null,
        PAYMENT: odemeTipi || null,
        FILLINGTYPE: dolumTipi || null,
        RELATEDCUSTOMERS: relatedCustomers,
        CONTAINERRIDS: containerRids,
        SHIPPINGTYPE: shippingType,
        COMMERCIALTYPE: commercialType,
        LOADINGTYPE: loadingType,
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
      };

      // Boş string → null
      Object.keys(addOfferModel).forEach((k) => {
        if (addOfferModel[k] === '') addOfferModel[k] = null;
      });

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
      let allInCurrency = '';
      for (const group of containerGroups) {
        const containerTypeRid = cleanGuidOrUndefined(group.containerRid) ?? null;

        // AllIn summary row first if AllIn checkbox is checked
        if (group.isAllIn && group.allInRow) {
          const allInBuyTotal = group.expenses.reduce((acc, e) => {
            if (e.allIn === 'Hayır') return acc;
            const qty = parseFloat(String(e.miktar)) || 1;
            const buy = parseFloat(String(e.alisFiyati)) || 0;
            return acc + buy * qty;
          }, 0);

          const allInExpenseModel: Record<string, any> = {
            QUOTATIONRID: addOfferModel.QUOTATIONRID,
            OFFERRID: offerRID,
            EXPENSERID: null,
            CONTAINERTYPERID: containerTypeRid,
            BUYINGCOST: String(allInBuyTotal),
            BUYINGCURRENCY: group.allInRow.alisDoviz || 'EUR',
            SELLINGCOST: String(group.allInRow.satisFiyati ?? '0').replace(/\s/g, '').replace(/,/g, '.') || null,
            SELLINGCURRENCY: group.allInRow.satisDoviz || 'EURO',
            BEHER: 'CNT',
            PIECE: '1',
            KDV: '0',
            ISALLIN: 1,
            ISALLINHIDE: 0,
            BUYINGCUSTOMERRID: null,
            SELLINGCUSTOMERRID: cleanGuidOrUndefined(group.allInRow.satisTarafi) ?? addOfferModel.CUSTOMERRID,
            WHEREISDESCRIPTION: 0,
            WHOADDUSERRID: addOfferModel.WHOADDUSERRID,
            ALLINCURRENCY: group.allInRow.satisDoviz || 'EURO',
            ISADDEDLATER: 0,
            EXPENSEFROMTYPE: 'ALLIN',
            EXPENSEFROMTYPERID: null,
          };
          allInCurrency = group.allInRow.satisDoviz || 'EURO';
          Object.keys(allInExpenseModel).forEach((k) => {
            if (allInExpenseModel[k] === '') allInExpenseModel[k] = null;
          });

          const expRes = await fetch(`${activeBaseUrl}/Offer/AddOfferExpenses`, {
            method: 'POST',
            headers,
            body: JSON.stringify(allInExpenseModel),
          }).catch(() => null);

          if (expRes) {
            const expText = await expRes.text();
            console.log('[AddOfferExpenses ALLIN]', group.containerType, expRes.status, expText);
          }
        }

        // Regular expense rows
        for (const exp of group.expenses) {
          const expenseBody: Record<string, any> = {
            QUOTATIONRID: addOfferModel.QUOTATIONRID,
            OFFERRID: offerRID,
            EXPENSERID: cleanGuidOrUndefined(exp.id) ?? null,
            CONTAINERTYPERID: containerTypeRid,
            BUYINGCOST: String(exp.alisFiyati ?? '0').replace(/\s/g, '').replace(/,/g, '.'),
            BUYINGCURRENCY: exp.alisDoviz || 'EUR',
            SELLINGCOST: String(exp.satisFiyati ?? '0').replace(/\s/g, '').replace(/,/g, '.') || null,
            SELLINGCURRENCY: exp.satisDoviz || 'EURO',
            BEHER: exp.beher || 'CNT',
            PIECE: String(exp.miktar ?? '1'),
            KDV: String(exp.kdv ?? '0'),
            ISALLIN: exp.allIn === 'Evet' ? 1 : 0,
            ISALLINHIDE: 0,
            BUYINGCUSTOMERRID: cleanGuidOrUndefined(exp.alisTarafi) ?? null,
            SELLINGCUSTOMERRID: cleanGuidOrUndefined(exp.satisTarafi) ?? addOfferModel.CUSTOMERRID,
            WHEREISDESCRIPTION: 1,
            WHOADDUSERRID: addOfferModel.WHOADDUSERRID,
            ALLINCURRENCY: null,
            ISADDEDLATER: exp.isCustomAdded ? 1 : 0,
            EXPENSEFROMTYPE: 'QUOTATION',
            EXPENSEFROMTYPERID: addOfferModel.QUOTATIONRID,
          };

          Object.keys(expenseBody).forEach((k) => {
            if (expenseBody[k] === '') expenseBody[k] = null;
          });

          const expRes = await fetch(`${activeBaseUrl}/Offer/AddOfferExpenses`, {
            method: 'POST',
            headers,
            body: JSON.stringify(expenseBody),
          }).catch(() => null);

          if (expRes) {
            const expText = await expRes.text();
            console.log('[AddOfferExpenses]', group.containerType, exp.masrafTipi, expRes.status, expText);
          }
        }
      }

      setIsSubmitting(false);
      setCreatedOfferRid(offerRID);
      setIsOfferCreated(true);
      setOfferRidState(offerRID);
      setIsViewMode(true);

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

                {/* ROW 12: Tehlikelilik | (Boş) */}
                <View style={styles.gridRow}>
                  {renderDesignItem({
                    label: 'Tehlikelilik',
                    value: yanicilik || 'Yanıcısız',
                  })}
                  {renderDesignItem({
                    label: '',
                    value: '',
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
                        onSelect: (opt) => setHat(opt.name),
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
                        onSelect: (opt) => setYuklemeYeri(opt.name),
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
                        onSelect: (opt) => setYuklemeLimani(opt.name),
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
                        onSelect: (opt) => setTahliyeYeri(opt.name),
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
                        onSelect: (opt) => setTahliyeLimani(opt.name),
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
                      onPress={() => handleToggleAllInGroup(group.containerRid, !group.isAllIn)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, cursor: 'pointer' }}
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
                                onSelect: (opt) =>
                                  handleUpdateExpense(group.containerRid, exp.id, 'masrafTipi', opt.name),
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
                                options: ['EUR', 'USD', 'GBP'],
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
                                onSelect: (opt) =>
                                  handleUpdateExpense(group.containerRid, exp.id, 'alisTarafi', opt.name),
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
                                handleUpdateExpense(group.containerRid, exp.id, 'satisDoviz', val),
                            })
                          }
                          style={[styles.cellDropdown, isRowLocked && { opacity: 0.5, backgroundColor: '#f1f5f9' }]}
                        >
                          <ThemedText style={styles.cellDropdownText}>
                            {exp.satisDoviz}
                          </ThemedText>
                          <ThemedText style={styles.dropdownArrowSmall}>▼</ThemedText>
                        </Pressable>
                      </View>

                      {/* Kar */}
                      <View style={[styles.tdCell, { width: 75 }]}>
                        {(() => {
                          if (profitVal === 'NaN') {
                            return <ThemedText style={styles.profitText}>NaN</ThemedText>;
                          }
                          const valNum = parseFloat(profitVal);
                          const isNeg = valNum < 0;
                          const isPos = valNum > 0;
                          const formatted = `${isNeg ? '-' : (isPos ? '+' : '')}${Math.abs(valNum).toFixed(2)} $`;

                          return (
                            <ThemedText
                              style={[
                                styles.profitText,
                                isNeg && styles.profitNegative,
                                isPos && styles.profitPositive,
                              ]}
                            >
                              {formatted}
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
                        onPress={() =>
                          setExpenseSearchModal({
                            visible: true,
                            title: 'Masraf Kalemi / Tipi Seçiniz',
                            onSelect: (opt) =>
                              handleUpdateAllInRow(group.containerRid, 'masrafTipi', opt.name),
                          })
                        }
                        style={styles.cellDropdown}
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
                        onPress={() =>
                          setActivePickerModal({
                            title: 'Alış Döviz Seçimi',
                            options: ['EUR', 'USD', 'GBP'],
                            selected: group.allInRow?.alisDoviz || 'EUR',
                            onSelect: (val) =>
                              handleUpdateAllInRow(group.containerRid, 'alisDoviz', val),
                          })
                        }
                        style={styles.cellDropdown}
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
                        style={styles.cellTextInputRightHighlight}
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
                        onPress={() =>
                          setActivePickerModal({
                            title: 'Satış Döviz Seçimi',
                            options: SATIS_CURRENCY_OPTIONS,
                            selected: group.allInRow?.satisDoviz || 'EURO',
                            onSelect: (val) =>
                              handleUpdateAllInRow(group.containerRid, 'satisDoviz', val),
                          })
                        }
                        style={styles.cellDropdown}
                      >
                        <ThemedText style={styles.cellDropdownText}>
                          {group.allInRow?.satisDoviz || 'Satış Döviz'}
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
