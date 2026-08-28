import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { DEFAULT_API_URL } from '@/constants/api';
import { useAuth } from '@/context/auth-context';

// Models reflecting C# CustomerCardModel & sub-lists
export interface CustomerFileList {
  RID?: string;
  FILENAME?: string;
  FILEPATH?: string;
  [key: string]: any;
}

export interface CustomerAddressModel {
  RID?: string;
  TITLE?: string;
  ADDRESSTYPE?: string;
  ADDRESS?: string;
  CITY?: string;
  DISTRICT?: string;
  COUNTRY?: string;
  PHONE?: string;
  FAX?: string;
  POSTACODE?: string;
  [key: string]: any;
}

export interface CustomerNotesModel {
  RID?: string;
  NOTE?: string;
  CUSTOMERNOTE?: string;
  WHOCREATED?: string;
  CREATEDDATE?: string;
  DEPARTMENT?: string;
  [key: string]: any;
}

export interface CustomerFinanceInfoModel {
  RID?: string;
  PAYMENTTYPE?: string;
  PAYMENTEXPIRE?: string;
  TLCURRENCY?: string;
  ACCOUNTINGNOTE?: string;
  BILLNOTE?: string;
  OFFICIALNAME?: string;
  PHONE?: string;
  EMAIL?: string;
  [key: string]: any;
}

export interface CustomerCustomsModel {
  RID?: string;
  TITLE?: string;
  OFFICIALNAME?: string;
  TYPE?: string;
  PHONE?: string;
  EMAIL?: string;
  [key: string]: any;
}

export interface CustomerOfficialsModel {
  RID?: string;
  NAME?: string;
  SURNAME?: string;
  NAME_SURNAME?: string;
  FULLNAME?: string;
  TITLE?: string;
  PHONE?: string;
  CELLPHONE?: string;
  EMAIL?: string;
  ISTEKLIF?: boolean | number;
  ISBOOKING?: boolean | number;
  ISBILL?: boolean | number;
  ISPREALERT?: boolean | number;
  ISFINANCE?: boolean | number;
  [key: string]: any;
}

export interface CustomerMeetingsModel {
  RID?: string;
  MEETINGDATE?: string;
  TOPIC?: string;
  NOTE?: string;
  WHOCREATED?: string;
  MEETINGTYPE?: string;
  [key: string]: any;
}

export interface PositionModelForSelect {
  RID?: string;
  POSITIONNAME?: string;
  [key: string]: any;
}

export interface UnitModelForSelect {
  RID?: string;
  UNITNAME?: string;
  [key: string]: any;
}

export interface CustomerPositionUsers {
  RID?: string;
  UNITNAME?: string;
  POSITIONNAME?: string;
  USERNAME?: string;
  [key: string]: any;
}

export interface CustomerCountriesModel {
  RID?: string;
  COUNTRYNAME?: string;
  COUNTRYCODE?: string;
  TYPE?: string;
  ISEXPORT?: boolean | number;
  ISIMPORT?: boolean | number;
  [key: string]: any;
}

export interface CustomerCardModel {
  RID?: string;
  TABLENUM?: number;
  ISACTIVE?: boolean;
  ISDELETED?: boolean;
  ISHIDDEN?: boolean;
  ISLOCK?: boolean;
  ISCHANGE?: boolean;
  CREATEDUSER?: string;
  CREATEDDATE?: string;
  MODIFYEDUSER?: string;
  MODIFYEDDATE?: string;
  CUSTOMERNAME?: string;
  WHOCREATED?: string;
  WHOEDITTED?: string;
  CUSTOMERCREATEDDATE?: string;
  CUSTOMEREDITTEDDATE?: string;
  CUSTOMERGROUP?: string;
  CUSTOMERGROUPID?: number;
  SALESPRESENTATIVE?: string;
  CUSTOMERPRESENTATIVE?: string;
  DOCUMENTATIONPRESENTATIVE?: string;
  SALESPRESENTATIVERID?: string;
  CUSTOMERPRESENTATIVERID?: string;
  DOCUMENTATIONPRESENTATIVERID?: string;
  TAXOFFICE?: string;
  TAXOFFICERID?: string;
  TAXNO?: string;
  WEBADDRESS?: string;
  PAYMENTTYPE?: string;
  PAYMENTCURRENCY?: string;
  PAYMENTEXPIRE?: string;
  TLCURRENCY?: string;
  EINVOICE?: number;
  ISBLACKLIST?: number;
  DONTTRACK?: number;
  BLACKLISTREASON?: string;
  ACCOUNTINGNOTE?: string;
  ACCOUNTINGCODE?: string;
  EINVOICEURN?: string;
  BILLNOTE?: string;
  SPECIALNOTE?: string;
  EXPENSECODE?: string;
  SECTORNAME?: string;
  SECTORRID?: string;
  GROUPRID?: string;
  GROUPNAME?: string;

  CUSTOMERFILESMODEL?: CustomerFileList[];
  CustomerAddreses?: CustomerAddressModel[];
  CustomerNotes?: CustomerNotesModel[];
  CustomerFinancialInfos?: CustomerFinanceInfoModel[];
  CustomerCustoms?: CustomerCustomsModel[];
  CustomerOfficials?: CustomerOfficialsModel[];
  CustomerMeetings?: CustomerMeetingsModel[];
  POSITIONLIST?: PositionModelForSelect[];
  UNITLIST?: UnitModelForSelect[];
  POSITIONUSERLIST?: CustomerPositionUsers[];
  CustomerCountries?: CustomerCountriesModel[];
}

export interface MusteriKartiProps {
  customerData?: any;
  onClose: () => void;
  onOpenTeklifCreate: () => void;
}

// Case-insensitive property extractor with semantic fallback
function getProp(obj: any, ...keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;

  // 1. Direct match or exact case-insensitive key match
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
      return obj[k];
    }
    const lowerK = k.toLowerCase();
    for (const actualKey of Object.keys(obj)) {
      if (actualKey.toLowerCase() === lowerK) {
        const val = obj[actualKey];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return val;
        }
      }
    }
  }

  // 2. Fallback semantic match based on key search intent
  const keysStr = keys.join(' ').toLowerCase();
  const allKeys = Object.keys(obj);

  // Intent A: Official / Person Name
  if (keysStr.includes('name') || keysStr.includes('ad') || keysStr.includes('yetkili')) {
    for (const k of allKeys) {
      const lk = k.toLowerCase();
      if (
        lk.includes('fullname') ||
        lk.includes('name') ||
        lk.includes('adsoyad') ||
        lk.includes('yetkili') ||
        lk.includes('ad_soyad') ||
        lk.includes('ad')
      ) {
        const val = obj[k];
        if (val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== '-') {
          return val;
        }
      }
    }
  }

  // Intent B: Title / Duty / Görev / Firma / Ünvan
  if (
    keysStr.includes('title') ||
    keysStr.includes('duty') ||
    keysStr.includes('gorev') ||
    keysStr.includes('position') ||
    keysStr.includes('company') ||
    keysStr.includes('firma')
  ) {
    for (const k of allKeys) {
      const lk = k.toLowerCase();
      if (
        lk.includes('title') ||
        lk.includes('duty') ||
        lk.includes('gorev') ||
        lk.includes('pos') ||
        lk.includes('unvan') ||
        lk.includes('firma') ||
        lk.includes('company') ||
        lk.includes('baslik')
      ) {
        const val = obj[k];
        if (val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== '-') {
          return val;
        }
      }
    }
  }

  // Intent C: Phone / Tel / Cell / GSM
  if (keysStr.includes('phone') || keysStr.includes('tel') || keysStr.includes('cell')) {
    for (const k of allKeys) {
      const lk = k.toLowerCase();
      if (
        lk.includes('phone') ||
        lk.includes('tel') ||
        lk.includes('cell') ||
        lk.includes('gsm') ||
        lk.includes('mobil')
      ) {
        const val = obj[k];
        if (val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== '-') {
          return val;
        }
      }
    }
  }

  // Intent D: Email / E-Posta / Mail
  if (keysStr.includes('email') || keysStr.includes('mail') || keysStr.includes('eposta')) {
    for (const k of allKeys) {
      const lk = k.toLowerCase();
      if (
        lk.includes('email') ||
        lk.includes('mail') ||
        lk.includes('eposta') ||
        lk.includes('posta')
      ) {
        const val = obj[k];
        if (val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== '-') {
          return val;
        }
      }
    }
  }

  // Intent E: Type / Tip
  if (keysStr.includes('type') || keysStr.includes('tip') || keysStr.includes('custom')) {
    for (const k of allKeys) {
      const lk = k.toLowerCase();
      if (lk.includes('type') || lk.includes('tip') || lk.includes('custom')) {
        const val = obj[k];
        if (val !== undefined && val !== null && String(val).trim() !== '' && String(val) !== '-') {
          return val;
        }
      }
    }
  }

  // 3. Last-resort fallback: Return the first non-RID string property of obj
  for (const k of allKeys) {
    const lk = k.toLowerCase();
    if (
      lk.includes('rid') ||
      lk.includes('guid') ||
      lk.includes('id') ||
      lk.includes('date') ||
      lk.includes('user') ||
      lk.includes('contype') ||
      lk.includes('mode') ||
      lk.includes('table') ||
      lk.includes('is')
    ) {
      continue;
    }
    const val = obj[k];
    if (typeof val === 'string' && val.trim() !== '' && val !== '-') {
      return val;
    }
  }

  return undefined;
}

// Case-insensitive array property extractor
function getArrayProp(obj: any, ...keys: string[]): any[] {
  if (!obj || typeof obj !== 'object') return [];

  for (const k of keys) {
    if (Array.isArray(obj[k]) && obj[k].length > 0) {
      return obj[k];
    }
    const lowerK = k.toLowerCase();
    for (const actualKey of Object.keys(obj)) {
      if (actualKey.toLowerCase() === lowerK) {
        const val = obj[actualKey];
        if (Array.isArray(val) && val.length > 0) {
          return val;
        }
      }
    }
  }

  for (const actualKey of Object.keys(obj)) {
    const lowerKey = actualKey.toLowerCase();
    for (const targetKey of keys) {
      if (lowerKey.includes(targetKey.toLowerCase())) {
        const val = obj[actualKey];
        if (Array.isArray(val) && val.length > 0) {
          return val;
        }
      }
    }
  }

  return [];
}

// Extract To, Cc, Bcc flags matching exact API DB schema: 1=To, 2=Cc, 3=Bcc
function checkSubFlag(
  person: any,
  catKey: 'teklif' | 'booking' | 'bill' | 'prealert' | 'talep',
  subType: 'to' | 'cc' | 'bcc'
): boolean {
  if (!person || typeof person !== 'object') return false;

  const targetNum = subType === 'to' ? 1 : subType === 'cc' ? 2 : 3;

  const propKeys: Record<string, string[]> = {
    teklif: ['customerofficialoffer', 'customerofficialteklif', 'offer', 'teklif', 'ISTEKLIF'],
    booking: ['customerofficialbooking', 'booking', 'ISBOOKING'],
    bill: [
      'customerofficialconsigment',
      'customerofficialbill',
      'customerofficialfatura',
      'consigment',
      'bill',
      'fatura',
      'ISBILL',
      'ISFATURA',
    ],
    prealert: ['customerofficialprealert', 'prealert', 'ISPREALERT'],
    talep: ['customerofficialrequest', 'customerofficialtalep', 'request', 'talep', 'ISTALEP'],
  };

  const keysToSearch = propKeys[catKey] || [];

  for (const k of keysToSearch) {
    const val = getProp(person, k);
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const numVal = Number(val);
      if (!isNaN(numVal)) {
        if (numVal === targetNum) return true;
      }
      if (typeof val === 'string') {
        const s = val.toUpperCase();
        if (subType === 'to' && (s.includes('TO') || s === '1')) return true;
        if (subType === 'cc' && (s.includes('CC') || s === '2')) return true;
        if (subType === 'bcc' && (s.includes('BCC') || s === '3')) return true;
      }
      if (val === true && subType === 'to') return true;
    }
  }

  return false;
}

export function MusteriKartiScreen({
  customerData,
  onClose,
  onOpenTeklifCreate,
}: MusteriKartiProps) {
  const insets = useSafeAreaInsets();
  const authContext = useAuth();
  const { user, token, apiUrl: contextApiUrl } = authContext || {};
  const authToken = token || user?.TOKEN || user?.token || '';

  const [isActionMenuOpen, setIsActionMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('Müşteri Kartı');

  const [cardDetails, setCardDetails] = useState<CustomerCardModel | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const rawRid =
    customerData?.RID ||
    customerData?.rid ||
    customerData?.CustomerRID ||
    customerData?.customerRID ||
    customerData?.rawItem?.RID ||
    customerData?.rawItem?.rid ||
    customerData?.rawItem?.CustomerRID ||
    customerData?.id ||
    '';

  const isGuidLike = (str: any) => typeof str === 'string' && str.length > 10;
  const customerRid = isGuidLike(customerData?.RID)
    ? customerData.RID
    : isGuidLike(customerData?.rid)
      ? customerData.rid
      : isGuidLike(customerData?.CustomerRID)
        ? customerData.CustomerRID
        : isGuidLike(customerData?.rawItem?.RID)
          ? customerData.rawItem.RID
          : isGuidLike(customerData?.rawItem?.rid)
            ? customerData.rawItem.rid
            : isGuidLike(customerData?.id)
              ? customerData.id
              : String(rawRid || '');

  const fetchCustomerCard = async () => {
    if (!customerRid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setFetchError(null);

    const activeBaseUrl = (contextApiUrl || DEFAULT_API_URL)
      .trim()
      .replace(/\/$/, '');
    const targetUrl = `${activeBaseUrl}/Customer/GetCustomerWithRid`;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = authToken.startsWith('Bearer ')
          ? authToken
          : `Bearer ${authToken}`;
      }

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          CustomerRID: customerRid,
          MODE: 'view',
          CONTYPE: 'MSSQL',
        }),
      });

      if (response.ok) {
        const rawJson = await response.json();
        console.log('[GetCustomerWithRid Response Keys]:', Object.keys(rawJson || {}));
        const unpackedCard =
          rawJson?.data ||
          rawJson?.result ||
          rawJson?.item ||
          rawJson?.CustomerCardModel ||
          rawJson;

        if (unpackedCard && typeof unpackedCard === 'object') {
          // Helper to fetch sub-endpoint if card array is empty
          const fetchSub = async (ep: string, extraBody = {}) => {
            try {
              const res = await fetch(`${activeBaseUrl}/Customer/${ep}`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  CustomerRID: customerRid,
                  MODE: 'view',
                  CONTYPE: 'MSSQL',
                  ...extraBody,
                }),
              });
              if (res.ok) {
                const json = await res.json();
                return Array.isArray(json)
                  ? json
                  : Array.isArray(json?.data)
                    ? json.data
                    : Array.isArray(json?.result)
                      ? json.result
                      : [];
              }
            } catch (e) { }
            return [];
          };

          const curOfficials = getArrayProp(unpackedCard, 'CustomerOfficials', 'officials');
          const curCustoms = getArrayProp(unpackedCard, 'CustomerCustoms', 'customs');
          const curCountries = getArrayProp(unpackedCard, 'CustomerCountries', 'countries');
          const curAddresses = getArrayProp(unpackedCard, 'CustomerAddreses', 'addresses');
          const curNotes = getArrayProp(unpackedCard, 'CustomerNotes', 'notes');

          const [subOfficials, subCustoms, subCountries, subAddresses, subNotes] =
            await Promise.all([
              curOfficials.length === 0
                ? fetchSub('GetCustomerOfficialsWithRID')
                : Promise.resolve(curOfficials),
              curCustoms.length === 0
                ? fetchSub('GetCustomerCustomsWithRID')
                : Promise.resolve(curCustoms),
              curCountries.length === 0
                ? fetchSub('GetCustomerCountriesWithRID')
                : Promise.resolve(curCountries),
              curAddresses.length === 0
                ? fetchSub('GetCustomerAddressWithRID')
                : Promise.resolve(curAddresses),
              curNotes.length === 0
                ? fetchSub('GetCustomerNotesWithRID')
                : Promise.resolve(curNotes),
            ]);

          setCardDetails({
            ...unpackedCard,
            CustomerOfficials: subOfficials.length > 0 ? subOfficials : curOfficials,
            CustomerCustoms: subCustoms.length > 0 ? subCustoms : curCustoms,
            CustomerCountries: subCountries.length > 0 ? subCountries : curCountries,
            CustomerAddreses: subAddresses.length > 0 ? subAddresses : curAddresses,
            CustomerNotes: subNotes.length > 0 ? subNotes : curNotes,
          });
        } else {
          setFetchError('Müşteri kaydı bulunamadı.');
        }
      } else {
        const errorText = await response.text();
        setFetchError(`Sunucu Hatası (${response.status}): ${errorText}`);
      }
    } catch (err: any) {
      console.log('GetCustomerWithRid fetch error:', err);
      setFetchError(err.message || 'Müşteri kartı çekilirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerCard();
  }, [customerRid]);

  const topPadding = Platform.OS === 'web' ? 16 : Math.max(insets.top, 16);

  const customerName =
    getProp(
      cardDetails,
      'CUSTOMERNAME',
      'customername',
      'customerName',
      'unvan',
      'UNVAN',
      'TITLE',
      'title'
    ) ||
    customerData?.unvan ||
    customerData?.CUSTOMERNAME ||
    'Müşteri Detayı';

  const whoCreated =
    getProp(
      cardDetails,
      'WHOCREATED',
      'whocreated',
      'whoCreated',
      'CREATEDUSER',
      'createduser',
      'createdUser'
    ) ||
    customerData?.whocreated ||
    '-';
  const createdDate =
    getProp(
      cardDetails,
      'CUSTOMERCREATEDDATE',
      'customercreateddate',
      'customerCreatedDate',
      'CREATEDDATE',
      'createddate',
      'createdDate'
    ) ||
    customerData?.createddate ||
    '-';
  const whoEditted =
    getProp(
      cardDetails,
      'WHOEDITTED',
      'whoeditted',
      'whoEditted',
      'MODIFYEDUSER',
      'modifyeduser',
      'modifyedUser',
      'WHOEDIT'
    ) ||
    customerData?.whoeditted ||
    '-';
  const edittedDate =
    getProp(
      cardDetails,
      'CUSTOMEREDITTEDDATE',
      'customereditteddate',
      'customerEdittedDate',
      'MODIFYEDDATE',
      'modifyeddate',
      'modifyedDate'
    ) ||
    customerData?.modifyeddate ||
    '-';

  const taxOffice =
    getProp(
      cardDetails,
      'TAXOFFICE',
      'taxoffice',
      'taxOffice',
      'vergi_dairesi',
      'vergiDairesi'
    ) ||
    customerData?.vergiDairesi ||
    customerData?.vergi_dairesi ||
    '-';

  const customerGroup =
    getProp(
      cardDetails,
      'CUSTOMERGROUP',
      'customergroup',
      'customerGroup',
      'GROUPNAME',
      'groupname',
      'groupName',
      'musteri_grup',
      'grup'
    ) ||
    customerData?.grup ||
    customerData?.musteri_grup ||
    '-';

  const taxNo =
    getProp(
      cardDetails,
      'TAXNO',
      'taxno',
      'taxNo',
      'vergi_no',
      'vergiNo'
    ) ||
    customerData?.vergiNo ||
    customerData?.vergi_no ||
    '-';

  const salesRep =
    getProp(
      cardDetails,
      'SALESPRESENTATIVE',
      'salespresentative',
      'salesRepresentative',
      'satis_temsilcisi',
      'satisTemsilcisi'
    ) ||
    customerData?.satisTemsilcisi ||
    customerData?.satis_temsilcisi ||
    '-';

  const docRep =
    getProp(
      cardDetails,
      'DOCUMENTATIONPRESENTATIVE',
      'documentationpresentative',
      'documentationRepresentative',
      'dokumantasyon_temsilcisi',
      'dokumantasyonTemsilcisi'
    ) ||
    customerData?.dokumantasyonTemsilcisi ||
    customerData?.dokumantasyon_temsilcisi ||
    '-';

  const customerRep =
    getProp(
      cardDetails,
      'CUSTOMERPRESENTATIVE',
      'customerpresentative',
      'customerRepresentative',
      'musteri_temsilcisi',
      'musteriTemsilcisi'
    ) ||
    customerData?.musteriTemsilcisi ||
    customerData?.musteri_temsilcisi ||
    '-';

  const webAddress =
    getProp(
      cardDetails,
      'WEBADDRESS',
      'webaddress',
      'webAddress',
      'web_adresi',
      'webAdresi'
    ) ||
    customerData?.webAdresi ||
    customerData?.web_adresi ||
    '-';

  const positionUserList = getArrayProp(
    cardDetails,
    'POSITIONUSERLIST',
    'positionUserList',
    'positionuserlist',
    'userPositions',
    'POSITIONUSER',
    'positionUsers'
  );

  const addressesList = getArrayProp(
    cardDetails,
    'CustomerAddreses',
    'customerAddreses',
    'customerAddresses',
    'CustomerAddresses',
    'CUSTOMERADDRESSES',
    'addresses',
    'CustomerAddressModel'
  );

  const officialsList = getArrayProp(
    cardDetails,
    'CustomerOfficials',
    'customerOfficials',
    'customerofficials',
    'CUSTOMEROFFICIALS',
    'officials',
    'CustomerOfficialsModel'
  );

  if (officialsList.length > 0) {
    console.log('[DEBUG Official First Item]:', JSON.stringify(officialsList[0]));
  }

  const financeInfosList = getArrayProp(
    cardDetails,
    'CustomerFinancialInfos',
    'customerFinancialInfos',
    'customerfinancialinfos',
    'financialInfos',
    'CustomerFinanceInfoModel'
  );

  const customsList = getArrayProp(
    cardDetails,
    'CustomerCustoms',
    'customerCustoms',
    'customercustoms',
    'customs',
    'CustomerCustomsModel'
  );

  const notesList = getArrayProp(
    cardDetails,
    'CustomerNotes',
    'customerNotes',
    'customernotes',
    'notes',
    'CustomerNotesModel'
  );

  const countriesList = getArrayProp(
    cardDetails,
    'CustomerCountries',
    'customerCountries',
    'customercountries',
    'countries',
    'CustomerCountriesModel'
  );

  const filesList = getArrayProp(
    cardDetails,
    'CUSTOMERFILESMODEL',
    'customerFilesModel',
    'customerfilesmodel',
    'files',
    'CustomerFileList'
  );

  const meetingsList = getArrayProp(
    cardDetails,
    'CustomerMeetings',
    'customerMeetings',
    'customermeetings',
    'meetings',
    'CustomerMeetingsModel'
  );

  const paymentTypeVal =
    getProp(
      cardDetails,
      'PAYMENTTYPE',
      'paymenttype',
      'paymentType',
      'odeme_sekli',
      'odemeSekli'
    ) ||
    customerData?.odemeSekli ||
    '-';

  const paymentExpireVal =
    getProp(
      cardDetails,
      'PAYMENTEXPIRE',
      'paymentexpire',
      'paymentExpire',
      'vade',
      'VADE'
    ) ||
    customerData?.vade ||
    '-';

  const tlCurrencyVal =
    getProp(
      cardDetails,
      'TLCURRENCY',
      'tlcurrency',
      'tlCurrency',
      'tl_kur',
      'tlKuru'
    ) ||
    customerData?.tlKuru ||
    '-';

  const einvoiceVal = getProp(
    cardDetails,
    'EINVOICE',
    'einvoice',
    'eInvoice',
    'efatura',
    'eFatura'
  );
  const einvoiceStr =
    einvoiceVal === 1 || einvoiceVal === true || einvoiceVal === '1' || einvoiceVal === 'true'
      ? 'E-Fatura Müşterisi'
      : customerData?.eFatura || '-';

  const acctNote = getProp(
    cardDetails,
    'ACCOUNTINGNOTE',
    'accountingnote',
    'accountingNote',
    'muhasebe_not',
    'muhasebeNot'
  );

  const billNote = getProp(
    cardDetails,
    'BILLNOTE',
    'billnote',
    'billNote',
    'SPECIALNOTE',
    'specialnote',
    'specialNote',
    'fatura_not'
  );

  const finOfficialsList =
    financeInfosList.length > 0
      ? financeInfosList
      : officialsList.filter(
        (o) =>
          getProp(o, 'ISFINANCE', 'isfinance', 'isFinance') === true ||
          getProp(o, 'ISFINANCE', 'isfinance', 'isFinance') === 1 ||
          getProp(o, 'ISFINANCE', 'isfinance', 'isFinance') === '1'
      );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Pressable onPress={onClose} style={styles.backBtn}>
            <ThemedText style={styles.backBtnText}>Cari Listesine Dön</ThemedText>
          </Pressable>
          <ThemedText style={styles.customerTitleText} numberOfLines={1}>
            {customerName}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => setIsActionMenuOpen(true)}
          style={({ pressed }) => [
            styles.actionMenuBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <ThemedText style={styles.actionMenuBtnText}>İşlem Menüsü</ThemedText>
        </Pressable>
      </View>

      {/* Sub Header Navigation Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabsContainer}
      >
        {[
          'Müşteri Kartı',
          'Ek Evraklar',
          'Teklifleri',
          'Rezervasyon Bilgileri',
          'Konşimentoları',
          'Faturaları',
          'Notlar',
          'Görüşme Bilgileri - Satış',
          'Görüşme Bilgileri - Pazarlama',
          'Muhasebe Bakiyeleri',
        ].map((tabStr) => {
          const isActive = tabStr === activeTab;
          return (
            <Pressable
              key={tabStr}
              onPress={() => setActiveTab(tabStr)}
              style={[styles.tabItem, isActive && styles.tabItemActive]}
            >
              <ThemedText
                style={[styles.tabItemText, isActive && styles.tabItemTextActive]}
              >
                {tabStr}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Loading state indicator */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ea580c" />
          <ThemedText style={styles.loadingText}>
            Müşteri Kartı Bilgileri Yükleniyor...
          </ThemedText>
        </View>
      ) : fetchError ? (
        <View style={styles.errorCard}>
          <ThemedText style={styles.errorText}>{fetchError}</ThemedText>
          <Pressable style={styles.retryBtn} onPress={fetchCustomerCard}>
            <ThemedText style={styles.retryBtnText}>Tekrar Dene</ThemedText>
          </Pressable>
        </View>
      ) : (
        /* Scrollable Content */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'Müşteri Kartı' && (
            <>
              {/* Yellow Metadata Info Card */}
              <View style={styles.yellowMetaCard}>
                <View style={styles.metaRow}>
                  <View style={styles.metaCol}>
                    <ThemedText style={styles.metaLabel}>
                      Müşteri Kartını Oluşturan Kişi:
                    </ThemedText>
                    <ThemedText style={styles.metaValue}>{whoCreated}</ThemedText>
                  </View>

                  <View style={styles.metaCol}>
                    <ThemedText style={styles.metaLabel}>
                      Oluşturma Tarihi:
                    </ThemedText>
                    <ThemedText style={styles.metaValue}>{createdDate}</ThemedText>
                  </View>

                  <View style={styles.metaCol}>
                    <ThemedText style={styles.metaLabel}>
                      Son Düzenleme Yapan Kişi:
                    </ThemedText>
                    <ThemedText style={styles.metaValue}>{whoEditted}</ThemedText>
                  </View>

                  <View style={styles.metaCol}>
                    <ThemedText style={styles.metaLabel}>
                      Düzenleme Tarihi:
                    </ThemedText>
                    <ThemedText style={styles.metaValue}>{edittedDate}</ThemedText>
                  </View>
                </View>
              </View>

              {/* Form Fields Grid */}
              <View style={styles.formGrid}>
                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Ünvan *</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      value={customerName}
                      editable={false}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Vergi Dairesi *</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      value={taxOffice}
                      editable={false}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Müşteri Grubu *</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      value={customerGroup}
                      editable={false}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Vergi No *</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      value={taxNo}
                      editable={false}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Satış Temsilcisi *</ThemedText>
                    <View style={styles.selectInputBox}>
                      <ThemedText style={styles.selectValText}>{salesRep}</ThemedText>
                    </View>
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>
                      Dökümantasyon Temsilcisi *
                    </ThemedText>
                    <View style={styles.selectInputBox}>
                      <ThemedText style={styles.selectValText}>{docRep}</ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Müşteri Temsilcisi *</ThemedText>
                    <View style={styles.selectInputBox}>
                      <ThemedText style={styles.selectValText}>{customerRep}</ThemedText>
                    </View>
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <ThemedText style={styles.formLabel}>Web Adresi *</ThemedText>
                    <TextInput
                      style={styles.formInput}
                      value={webAddress}
                      editable={false}
                    />
                  </View>
                </View>
              </View>

              {/* SECTION 1: Firma Görevlileri */}
              <View style={styles.sectionCard}>
                <View style={styles.peachSectionHeader}>
                  <ThemedText style={styles.peachSectionTitle}>
                    Firma Görevlileri
                  </ThemedText>
                </View>
                <View style={styles.sectionTableHead}>
                  <ThemedText style={[styles.tableTh, { flex: 1 }]}>Birim</ThemedText>
                  <ThemedText style={[styles.tableTh, { flex: 1 }]}>Görev</ThemedText>
                  <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                    Tanımlı Kullanıcı
                  </ThemedText>
                </View>

                {positionUserList.length > 0 ? (
                  positionUserList.map((userPos, idx) => {
                    const birim =
                      getProp(
                        userPos,
                        'UNITNAME',
                        'unitname',
                        'unitName',
                        'BİRİM',
                        'birim',
                        'UNIT',
                        'unit'
                      ) || '-';
                    const gorev =
                      getProp(
                        userPos,
                        'POSITIONNAME',
                        'positionname',
                        'positionName',
                        'GÖREV',
                        'gorev',
                        'POSITION',
                        'position',
                        'TITLE',
                        'title'
                      ) || '-';
                    const kullanici =
                      getProp(
                        userPos,
                        'USERNAME',
                        'username',
                        'userName',
                        'KULLANICI',
                        'kullanici',
                        'FULLNAME',
                        'fullname',
                        'NAME',
                        'name'
                      ) || '-';

                    return (
                      <View
                        key={userPos.RID || idx}
                        style={[
                          styles.sectionTableRow,
                          idx % 2 === 1 && styles.tableRowAlt,
                        ]}
                      >
                        <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                          {birim}
                        </ThemedText>
                        <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                          {gorev}
                        </ThemedText>
                        <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                          {kullanici}
                        </ThemedText>
                      </View>
                    );
                  })
                ) : (
                  <>
                    <View style={styles.sectionTableRow}>
                      <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                        Satış Temsilcisi
                      </ThemedText>
                      <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                        Satış Temsilcisi
                      </ThemedText>
                      <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                        {salesRep}
                      </ThemedText>
                    </View>
                    <View style={[styles.sectionTableRow, styles.tableRowAlt]}>
                      <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                        Müşteri Temsilcisi
                      </ThemedText>
                      <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                        Müşteri Temsilcisi
                      </ThemedText>
                      <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                        {customerRep}
                      </ThemedText>
                    </View>
                    <View style={styles.sectionTableRow}>
                      <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                        Dökümantasyon Temsilcisi
                      </ThemedText>
                      <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                        Dökümantasyon Temsilcisi
                      </ThemedText>
                      <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                        {docRep}
                      </ThemedText>
                    </View>
                  </>
                )}
              </View>

              {/* SECTION 2: Adresler */}
              <View style={styles.sectionCard}>
                <View style={styles.peachSectionHeader}>
                  <ThemedText style={styles.peachSectionTitle}>Adresler</ThemedText>
                </View>

                {addressesList.length > 0 ? (
                  addressesList.map((addr, idx) => {
                    const titleStr =
                      getProp(
                        addr,
                        'TITLE',
                        'title',
                        'ADDRESSTITLE',
                        'addresstitle',
                        'ADDRESSTYPE',
                        'addresstype',
                        'TYPE',
                        'type',
                        'BASLIK',
                        'baslik'
                      ) || `Adres ${idx + 1}`;
                    const addressStr = getProp(
                      addr,
                      'ADDRESS',
                      'address',
                      'FULLADDRESS',
                      'fulladdress',
                      'ADRES',
                      'adres'
                    );
                    const districtStr = getProp(
                      addr,
                      'DISTRICT',
                      'district',
                      'ILCE',
                      'ilce'
                    );
                    const cityStr = getProp(
                      addr,
                      'CITY',
                      'city',
                      'SEHIR',
                      'sehir',
                      'IL',
                      'il'
                    );
                    const countryStr = getProp(
                      addr,
                      'COUNTRY',
                      'country',
                      'ULKE',
                      'ulke'
                    );
                    const fullAddressStr = [
                      addressStr,
                      districtStr,
                      cityStr,
                      countryStr,
                    ]
                      .filter(Boolean)
                      .join(' ');
                    const phoneStr = getProp(
                      addr,
                      'PHONE',
                      'phone',
                      'TELEPHONE',
                      'telephone',
                      'TEL',
                      'tel',
                      'TELEFON',
                      'telefon'
                    );
                    const faxStr = getProp(addr, 'FAX', 'fax');

                    return (
                      <View
                        key={addr.RID || idx}
                        style={idx % 2 === 1 ? styles.addressBoxAlt : styles.addressBox}
                      >
                        <ThemedText style={styles.addressTypeTitle}>
                          {titleStr}
                        </ThemedText>
                        <ThemedText style={styles.addressText}>
                          {fullAddressStr || 'Adres detay bilgisi yok.'}
                        </ThemedText>
                        {phoneStr ? (
                          <ThemedText style={styles.addressMetaText}>
                            Tel: {phoneStr}
                          </ThemedText>
                        ) : null}
                        {faxStr ? (
                          <ThemedText style={styles.addressMetaText}>
                            Fax: {faxStr}
                          </ThemedText>
                        ) : null}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyNotePadding}>
                    <ThemedText style={styles.emptyNoteText}>
                      Bu müşteri için adres girilmemiş.
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* SECTION 3: Yetkililer */}
              <View style={styles.sectionCard}>
                <View style={styles.peachSectionHeader}>
                  <ThemedText style={styles.peachSectionTitle}>Yetkililer</ThemedText>
                </View>

                {officialsList.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                    <View style={{ minWidth: 1350 }}>
                      {/* Category Header Row */}
                      <View style={styles.yetkiliCatHeaderRow}>
                        <View style={{ width: 600 }} />
                        <View style={[styles.catHeaderCell, { width: 150 }]}>
                          <ThemedText style={styles.catHeaderTitle}>Teklif</ThemedText>
                        </View>
                        <View style={[styles.catHeaderCell, { width: 150 }]}>
                          <ThemedText style={styles.catHeaderTitle}>Booking</ThemedText>
                        </View>
                        <View style={[styles.catHeaderCell, { width: 150 }]}>
                          <ThemedText style={styles.catHeaderTitle}>BL / Fatura</ThemedText>
                        </View>
                        <View style={[styles.catHeaderCell, { width: 150 }]}>
                          <ThemedText style={styles.catHeaderTitle}>Pre-Alert</ThemedText>
                        </View>
                        <View style={[styles.catHeaderCell, { width: 150 }]}>
                          <ThemedText style={styles.catHeaderTitle}>Talep</ThemedText>
                        </View>
                      </View>

                      {/* Sub Header Row */}
                      <View style={styles.yetkiliSubHeaderRow}>
                        <ThemedText style={[styles.tableTh, { width: 150 }]}>
                          Ad Soyad
                        </ThemedText>
                        <ThemedText style={[styles.tableTh, { width: 140 }]}>
                          Görev
                        </ThemedText>
                        <ThemedText style={[styles.tableTh, { width: 130 }]}>
                          Telefon (Cep/Ofis)
                        </ThemedText>
                        <ThemedText style={[styles.tableTh, { width: 180 }]}>
                          E-posta
                        </ThemedText>

                        {/* 5 categories x 3 sub-columns (To, Cc, Bcc) */}
                        {['Teklif', 'Booking', 'BL / Fatura', 'Pre-Alert', 'Talep'].map((cat) => (
                          <React.Fragment key={cat}>
                            <ThemedText style={[styles.tableThSub, { width: 50 }]}>To</ThemedText>
                            <ThemedText style={[styles.tableThSub, { width: 50 }]}>Cc</ThemedText>
                            <ThemedText style={[styles.tableThSub, { width: 50 }]}>Bcc</ThemedText>
                          </React.Fragment>
                        ))}
                      </View>

                      {/* Data Rows */}
                      {officialsList.map((person, idx) => {
                        const nameStr =
                          getProp(
                            person,
                            'NAME_SURNAME',
                            'name_surname',
                            'FULLNAME',
                            'fullname',
                            'NAME',
                            'name',
                            'ADSOYAD',
                            'adsoyad',
                            'YETKILI',
                            'yetkili'
                          ) ||
                          [
                            getProp(person, 'NAME', 'name', 'AD'),
                            getProp(person, 'SURNAME', 'surname', 'SOYAD'),
                          ]
                            .filter(Boolean)
                            .join(' ') ||
                          '-';

                        const roleStr =
                          getProp(
                            person,
                            'TITLE',
                            'title',
                            'DUTY',
                            'duty',
                            'POSITION',
                            'position',
                            'GOREV',
                            'gorev',
                            'GÖREV'
                          ) || '-';

                        const phoneStr =
                          getProp(
                            person,
                            'CELLPHONE',
                            'cellphone',
                            'PHONE',
                            'phone',
                            'TEL',
                            'tel',
                            'TELEFON'
                          ) || '-';

                        const emailStr =
                          getProp(
                            person,
                            'EMAIL',
                            'email',
                            'EPOSTA',
                            'eposta',
                            'E_POSTA'
                          ) || '-';

                        const categories: ('teklif' | 'booking' | 'bill' | 'prealert' | 'talep')[] = [
                          'teklif',
                          'booking',
                          'bill',
                          'prealert',
                          'talep',
                        ];
                        const subTypes: ('to' | 'cc' | 'bcc')[] = ['to', 'cc', 'bcc'];

                        return (
                          <View
                            key={person.RID || idx}
                            style={[
                              styles.sectionTableRow,
                              idx % 2 === 1 && styles.tableRowAlt,
                            ]}
                          >
                            <ThemedText style={[styles.tableTd, { width: 150 }]}>
                              {nameStr}
                            </ThemedText>
                            <ThemedText style={[styles.tableTd, { width: 140 }]}>
                              {roleStr}
                            </ThemedText>
                            <ThemedText style={[styles.tableTd, { width: 130 }]}>
                              {phoneStr}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.tableTd,
                                { width: 180, color: '#2563eb' },
                              ]}
                            >
                              {emailStr}
                            </ThemedText>

                            {categories.map((cat) =>
                              subTypes.map((sub) => {
                                const isChecked = checkSubFlag(person, cat, sub);
                                return (
                                  <View
                                    key={`${cat}-${sub}`}
                                    style={[styles.tableTdMatrixCell, { width: 50 }]}
                                  >
                                    {isChecked ? (
                                      <View style={styles.blueCheckIconBox}>
                                        <ThemedText style={styles.blueCheckMarkText}>✓</ThemedText>
                                      </View>
                                    ) : (
                                      <ThemedText style={styles.dashText}>-</ThemedText>
                                    )}
                                  </View>
                                );
                              })
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                ) : (
                  <View style={styles.emptyNotePadding}>
                    <ThemedText style={styles.emptyNoteText}>
                      Bu müşteri için yetkili girilmemiş.
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* SECTION 4: Finans Bilgileri */}
              <View style={styles.sectionCard}>
                <View style={styles.peachSectionHeader}>
                  <ThemedText style={styles.peachSectionTitle}>
                    Finans Bilgileri
                  </ThemedText>
                </View>

                <View style={styles.finansGrid}>
                  <View style={styles.finansHeadRow}>
                    <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                      Ödeme Şekli
                    </ThemedText>
                    <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                      Vade
                    </ThemedText>
                    <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                      TL Kur
                    </ThemedText>
                    <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                      E-Fatura
                    </ThemedText>
                  </View>
                  <View style={styles.finansBodyRow}>
                    <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                      {paymentTypeVal}
                    </ThemedText>
                    <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                      {paymentExpireVal}
                    </ThemedText>
                    <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                      {tlCurrencyVal}
                    </ThemedText>
                    <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                      {einvoiceStr}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.noteBoxContainer}>
                  {acctNote ? (
                    <View style={styles.noteCard}>
                      <ThemedText style={styles.noteCardTitle}>
                        Muhasebe Notu
                      </ThemedText>
                      <ThemedText style={styles.noteCardContent}>
                        {acctNote}
                      </ThemedText>
                    </View>
                  ) : null}

                  {billNote ? (
                    <View style={styles.noteCard}>
                      <ThemedText style={styles.noteCardTitle}>
                        Fatura / Özel Not
                      </ThemedText>
                      <ThemedText style={styles.noteCardContent}>
                        {billNote}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* SECTION 5: Finansal Yetkililer */}
              <View style={styles.sectionCard}>
                <View style={styles.peachSectionHeader}>
                  <ThemedText style={styles.peachSectionTitle}>
                    Finansal Yetkililer
                  </ThemedText>
                </View>

                {finOfficialsList.length > 0 ? (
                  <>
                    <View style={styles.sectionTableHead}>
                      <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                        Yetkili Adı
                      </ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                        Telefon
                      </ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                        E-Posta
                      </ThemedText>
                    </View>
                    {finOfficialsList.map((item, idx) => {
                      const officialVal =
                        getProp(
                          item,
                          'OFFICIALNAME',
                          'officialname',
                          'officialName',
                          'NAME_SURNAME',
                          'name_surname',
                          'FULLNAME',
                          'fullname',
                          'NAME',
                          'name',
                          'YETKILI',
                          'yetkili'
                        ) || '-';

                      const phoneVal =
                        getProp(
                          item,
                          'PHONE',
                          'phone',
                          'TEL',
                          'tel',
                          'CELLPHONE',
                          'cellphone'
                        ) || '-';

                      const emailVal =
                        getProp(item, 'EMAIL', 'email', 'EPOSTA', 'eposta') || '-';

                      return (
                        <View
                          key={item.RID || idx}
                          style={[
                            styles.sectionTableRow,
                            idx % 2 === 1 && styles.tableRowAlt,
                          ]}
                        >
                          <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                            {officialVal}
                          </ThemedText>
                          <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                            {phoneVal}
                          </ThemedText>
                          <ThemedText
                            style={[styles.tableTd, { flex: 1, color: '#2563eb' }]}
                          >
                            {emailVal}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <View style={styles.emptyNotePadding}>
                    <ThemedText style={styles.emptyNoteText}>
                      Bu müşteri için finansal yetkili girilmemiş.
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* SECTION 6: Gümrükçü Bilgileri */}
              <View style={styles.sectionCard}>
                <View style={styles.peachSectionHeader}>
                  <ThemedText style={styles.peachSectionTitle}>
                    Gümrükçü Bilgileri
                  </ThemedText>
                </View>

                {customsList.length > 0 ? (
                  <>
                    <View style={styles.sectionTableHead}>
                      <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                        Firma Adı
                      </ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                        Yetkili
                      </ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1 }]}>Tip</ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                        Telefon
                      </ThemedText>
                      <ThemedText style={[styles.tableTh, { flex: 1 }]}>
                        E-Posta
                      </ThemedText>
                    </View>
                    {customsList.map((item, idx) => {
                      const titleVal =
                        getProp(
                          item,
                          'TITLE',
                          'title',
                          'COMPANYNAME',
                          'companyname',
                          'FIRMA_ADI',
                          'firma_adi',
                          'NAME',
                          'name'
                        ) || '-';

                      const officialVal =
                        getProp(
                          item,
                          'OFFICIALNAME',
                          'officialname',
                          'officialName',
                          'YETKILI',
                          'yetkili'
                        ) || '-';

                      const typeVal =
                        getProp(
                          item,
                          'TYPE',
                          'type',
                          'CUSTOMTYPE',
                          'customtype',
                          'TIP',
                          'tip'
                        ) || '-';

                      const phoneVal =
                        getProp(
                          item,
                          'PHONE',
                          'phone',
                          'TEL',
                          'tel',
                          'TELEFON'
                        ) || '-';

                      const emailVal =
                        getProp(item, 'EMAIL', 'email', 'EPOSTA', 'eposta') || '-';

                      return (
                        <View
                          key={item.RID || idx}
                          style={[
                            styles.sectionTableRow,
                            idx % 2 === 1 && styles.tableRowAlt,
                          ]}
                        >
                          <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                            {titleVal}
                          </ThemedText>
                          <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                            {officialVal}
                          </ThemedText>
                          <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                            {typeVal}
                          </ThemedText>
                          <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                            {phoneVal}
                          </ThemedText>
                          <ThemedText
                            style={[styles.tableTd, { flex: 1, color: '#2563eb' }]}
                          >
                            {emailVal}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </>
                ) : (
                  <View style={styles.emptyNotePadding}>
                    <ThemedText style={styles.emptyNoteText}>
                      Bu müşteri için gümrükçü bilgisi girilmemiş.
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* SECTION 7: Notlar */}
              <View style={styles.sectionCard}>
                <View style={styles.peachSectionHeader}>
                  <ThemedText style={styles.peachSectionTitle}>Notlar</ThemedText>
                </View>
                {notesList.length > 0 ? (
                  notesList.map((item, idx) => {
                    const noteText =
                      getProp(
                        item,
                        'NOTE',
                        'note',
                        'CUSTOMERNOTE',
                        'customernote',
                        'customerNote',
                        'EXPLANATION',
                        'explanation'
                      ) || '-';

                    const creator = getProp(
                      item,
                      'WHOCREATED',
                      'whocreated',
                      'whoCreated',
                      'CREATEDUSER',
                      'createduser'
                    );

                    const dateVal = getProp(
                      item,
                      'CREATEDDATE',
                      'createddate',
                      'createdDate'
                    );

                    return (
                      <View
                        key={item.RID || idx}
                        style={[
                          styles.addressBox,
                          idx % 2 === 1 && styles.addressBoxAlt,
                        ]}
                      >
                        <ThemedText style={styles.addressText}>
                          {noteText}
                        </ThemedText>
                        {creator || dateVal ? (
                          <ThemedText style={styles.addressMetaText}>
                            {creator || ''} {dateVal ? `(${dateVal})` : ''}
                          </ThemedText>
                        ) : null}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyNotePadding}>
                    <ThemedText style={styles.emptyNoteText}>
                      Bu müşteri için not girilmemiş.
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* SECTION 8: Çalıştığı Ülkeler */}
              <View style={styles.sectionCard}>
                <View style={styles.peachSectionHeader}>
                  <ThemedText style={styles.peachSectionTitle}>
                    Çalıştığı Ülkeler
                  </ThemedText>
                </View>

                {countriesList.length > 0 ? (
                  <View style={styles.countryRow}>
                    <View style={styles.countryCol}>
                      <ThemedText style={styles.countryLabel}>İhracat</ThemedText>
                      <View style={styles.countryBadgeList}>
                        {countriesList
                          .filter((c) => {
                            const t = String(
                              getProp(c, 'TYPE', 'type', 'IS_EXPORT') || ''
                            ).toUpperCase();
                            const isExp = getProp(
                              c,
                              'ISEXPORT',
                              'isexport',
                              'isExport'
                            );
                            return (
                              t === 'EXPORT' ||
                              t === 'İHRACAT' ||
                              t === 'IHRACAT' ||
                              isExp === true ||
                              isExp === 1 ||
                              isExp === '1'
                            );
                          })
                          .map((c, idx) => (
                            <View key={c.RID || idx} style={styles.countryBadge}>
                              <ThemedText style={styles.countryBadgeText}>
                                {getProp(
                                  c,
                                  'COUNTRYNAME',
                                  'countryname',
                                  'countryName',
                                  'COUNTRYCODE',
                                  'countrycode',
                                  'ULKE',
                                  'ulke',
                                  'ULKE_ADI',
                                  'ULKEISIM',
                                  'ulkeisim'
                                ) || '-'}
                              </ThemedText>
                            </View>
                          ))}

                        {countriesList.filter((c) => {
                          const t = String(
                            getProp(c, 'TYPE', 'type', 'IS_EXPORT') || ''
                          ).toUpperCase();
                          const isExp = getProp(
                            c,
                            'ISEXPORT',
                            'isexport',
                            'isExport'
                          );
                          return (
                            t === 'EXPORT' ||
                            t === 'İHRACAT' ||
                            t === 'IHRACAT' ||
                            isExp === true ||
                            isExp === 1 ||
                            isExp === '1'
                          );
                        }).length === 0 ? (
                          <ThemedText style={styles.emptyCountryText}>
                            Ülke seçilmemiş
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.countryCol}>
                      <ThemedText style={styles.countryLabel}>İthalat</ThemedText>
                      <View style={styles.countryBadgeList}>
                        {countriesList
                          .filter((c) => {
                            const t = String(
                              getProp(c, 'TYPE', 'type', 'IS_IMPORT') || ''
                            ).toUpperCase();
                            const isImp = getProp(
                              c,
                              'ISIMPORT',
                              'isimport',
                              'isImport'
                            );
                            return (
                              t === 'IMPORT' ||
                              t === 'İTHALAT' ||
                              t === 'ITHALAT' ||
                              isImp === true ||
                              isImp === 1 ||
                              isImp === '1'
                            );
                          })
                          .map((c, idx) => (
                            <View key={c.RID || idx} style={styles.countryBadge}>
                              <ThemedText style={styles.countryBadgeText}>
                                {getProp(
                                  c,
                                  'COUNTRYNAME',
                                  'countryname',
                                  'countryName',
                                  'COUNTRYCODE',
                                  'countrycode',
                                  'ULKE',
                                  'ulke',
                                  'ULKE_ADI',
                                  'ULKEISIM',
                                  'ulkeisim'
                                ) || '-'}
                              </ThemedText>
                            </View>
                          ))}

                        {countriesList.filter((c) => {
                          const t = String(
                            getProp(c, 'TYPE', 'type', 'IS_IMPORT') || ''
                          ).toUpperCase();
                          const isImp = getProp(
                            c,
                            'ISIMPORT',
                            'isimport',
                            'isImport'
                          );
                          return (
                            t === 'IMPORT' ||
                            t === 'İTHALAT' ||
                            t === 'ITHALAT' ||
                            isImp === true ||
                            isImp === 1 ||
                            isImp === '1'
                          );
                        }).length === 0 ? (
                          <ThemedText style={styles.emptyCountryText}>
                            Ülke seçilmemiş
                          </ThemedText>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyNotePadding}>
                    <ThemedText style={styles.emptyCountryText}>
                      Çalışılan ülke bilgisi bulunmuyor.
                    </ThemedText>
                  </View>
                )}
              </View>
            </>
          )}

          {activeTab === 'Ek Evraklar' && (
            <View style={styles.sectionCard}>
              <View style={styles.peachSectionHeader}>
                <ThemedText style={styles.peachSectionTitle}>Ek Evraklar</ThemedText>
              </View>
              {filesList.length > 0 ? (
                filesList.map((file, idx) => (
                  <View key={file.RID || idx} style={styles.sectionTableRow}>
                    <ThemedText style={[styles.tableTd, { flex: 1 }]}>
                      {getProp(file, 'FILENAME', 'filename', 'fileName', 'NAME', 'name') ||
                        `Dosya ${idx + 1}`}
                    </ThemedText>
                  </View>
                ))
              ) : (
                <View style={styles.emptyNotePadding}>
                  <ThemedText style={styles.emptyNoteText}>
                    Ek evrak bulunamadı.
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {activeTab === 'Notlar' && (
            <View style={styles.sectionCard}>
              <View style={styles.peachSectionHeader}>
                <ThemedText style={styles.peachSectionTitle}>Müşteri Notları</ThemedText>
              </View>
              {notesList.length > 0 ? (
                notesList.map((item, idx) => (
                  <View
                    key={item.RID || idx}
                    style={[styles.addressBox, idx % 2 === 1 && styles.addressBoxAlt]}
                  >
                    <ThemedText style={styles.addressText}>
                      {getProp(
                        item,
                        'NOTE',
                        'note',
                        'CUSTOMERNOTE',
                        'customernote',
                        'EXPLANATION',
                        'explanation'
                      ) || '-'}
                    </ThemedText>
                  </View>
                ))
              ) : (
                <View style={styles.emptyNotePadding}>
                  <ThemedText style={styles.emptyNoteText}>
                    Not bulunamadı.
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {(activeTab === 'Görüşme Bilgileri - Satış' ||
            activeTab === 'Görüşme Bilgileri - Pazarlama') && (
              <View style={styles.sectionCard}>
                <View style={styles.peachSectionHeader}>
                  <ThemedText style={styles.peachSectionTitle}>{activeTab}</ThemedText>
                </View>
                {meetingsList.length > 0 ? (
                  meetingsList.map((m, idx) => (
                    <View key={m.RID || idx} style={styles.addressBox}>
                      <ThemedText style={styles.addressTypeTitle}>
                        {getProp(m, 'TOPIC', 'topic', 'MEETINGTYPE', 'meetingtype', 'TITLE', 'title') || 'Görüşme'}
                      </ThemedText>
                      <ThemedText style={styles.addressText}>
                        {getProp(m, 'NOTE', 'note', 'EXPLANATION', 'explanation') || '-'}
                      </ThemedText>
                      <ThemedText style={styles.addressMetaText}>
                        Tarih: {getProp(m, 'MEETINGDATE', 'meetingdate', 'DATE', 'date') || '-'}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyNotePadding}>
                    <ThemedText style={styles.emptyNoteText}>
                      Görüşme bilgisi bulunamadı.
                    </ThemedText>
                  </View>
                )}
              </View>
            )}

          {activeTab === 'Muhasebe Bakiyeleri' && (
            <View style={styles.sectionCard}>
              <View style={styles.peachSectionHeader}>
                <ThemedText style={styles.peachSectionTitle}>
                  Muhasebe Bakiyeleri
                </ThemedText>
              </View>
              <View style={styles.emptyNotePadding}>
                <ThemedText style={styles.emptyNoteText}>
                  Muhasebe bakiyeleri için güncel kayıtlar listede.
                </ThemedText>
              </View>
            </View>
          )}

          {['Teklifleri', 'Rezervasyon Bilgileri', 'Konşimentoları', 'Faturaları'].includes(
            activeTab
          ) && (
              <View style={styles.sectionCard}>
                <View style={styles.peachSectionHeader}>
                  <ThemedText style={styles.peachSectionTitle}>{activeTab}</ThemedText>
                </View>
                <View style={styles.emptyNotePadding}>
                  <ThemedText style={styles.emptyNoteText}>
                    {activeTab} bilgileri yükleniyor veya gösterilecek kayıt bulunmuyor.
                  </ThemedText>
                </View>
              </View>
            )}
        </ScrollView>
      )}

      {/* Action Menu Modal (İşlem Menüsü) */}
      {isActionMenuOpen && (
        <Modal
          transparent
          visible={isActionMenuOpen}
          onRequestClose={() => setIsActionMenuOpen(false)}
          animationType="fade"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsActionMenuOpen(false)}
          >
            <Pressable
              style={styles.actionMenuCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.menuItemsList}>
                <Pressable
                  onPress={() => setIsActionMenuOpen(false)}
                  style={styles.actionTextItem}
                >
                  <ThemedText style={styles.actionTextItemLabel}>Düzenle</ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => setIsActionMenuOpen(false)}
                  style={styles.actionTextItem}
                >
                  <ThemedText style={styles.actionTextItemLabel}>Loglar</ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => setIsActionMenuOpen(false)}
                  style={styles.actionTextItem}
                >
                  <ThemedText style={styles.actionTextItemLabel}>
                    Kara Listeye Al
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => setIsActionMenuOpen(false)}
                  style={styles.actionTextItem}
                >
                  <ThemedText style={styles.actionTextItemLabel}>
                    Değişiklikleri Göster
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => setIsActionMenuOpen(false)}
                  style={styles.actionTextItem}
                >
                  <ThemedText style={styles.actionTextItemLabel}>Sil</ThemedText>
                </Pressable>

                {/* Black Pill Button: Teklif */}
                <Pressable
                  onPress={() => {
                    setIsActionMenuOpen(false);
                    onOpenTeklifCreate();
                  }}
                  style={({ pressed }) => [
                    styles.teklifPillBtn,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <ThemedText style={styles.teklifPillBtnText}>Teklif</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#475569',
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  customerTitleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ea580c',
    flex: 1,
  },
  actionMenuBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionMenuBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* TABS */
  tabsScrollView: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    maxHeight: 44,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tabItemText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  tabItemTextActive: {
    fontWeight: '700',
    color: '#1d4ed8',
  },

  /* LOADING & ERROR */
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  errorCard: {
    margin: 24,
    padding: 20,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  /* SCROLL VIEW */
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    padding: 24,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    gap: 20,
  },

  /* YELLOW METADATA CARD */
  yellowMetaCard: {
    backgroundColor: '#FFFBEB',
    padding: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  metaCol: {
    gap: 2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78350F',
  },
  metaValue: {
    fontSize: 12,
    color: '#92400E',
  },

  /* FORM GRID */
  formGrid: {
    gap: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
  },
  formGroup: {
    gap: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 4,
    fontSize: 13,
    color: '#0f172a',
  },
  selectInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 4,
  },
  selectValText: {
    fontSize: 13,
    color: '#0f172a',
  },

  /* SECTIONS (PEACH HEADERS) */
  sectionCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  peachSectionHeader: {
    backgroundColor: '#F7C096',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  peachSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  sectionTableHead: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableTh: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  sectionTableRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tableTd: {
    fontSize: 12,
    color: '#0f172a',
  },

  /* YETKİLİLER MATRIX STYLES */
  yetkiliCatHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#fef08a',
    paddingVertical: 6,
    alignItems: 'center',
  },
  catHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  catHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  yetkiliSubHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#fde047',
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tableThSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
  },
  tableTdMatrixCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  blueCheckIconBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#93c5fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueCheckMarkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
    lineHeight: 14,
    textAlign: 'center',
  },
  dashText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },

  /* ADDRESSES */
  addressBox: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 2,
  },
  addressBoxAlt: {
    padding: 14,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 2,
  },
  addressTypeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  addressText: {
    fontSize: 12,
    color: '#475569',
  },
  addressMetaText: {
    fontSize: 11,
    color: '#64748b',
  },

  /* FINANS GRID */
  finansGrid: {},
  finansHeadRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  finansBodyRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  noteBoxContainer: {
    padding: 14,
    gap: 10,
  },
  noteCard: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 4,
    gap: 2,
  },
  noteCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#78350F',
  },
  noteCardContent: {
    fontSize: 12,
    color: '#92400E',
  },

  /* EMPTY NOTES */
  emptyNotePadding: {
    padding: 14,
  },
  emptyNoteText: {
    fontSize: 12,
    color: '#ea580c',
  },

  /* COUNTRY SECTION */
  countryRow: {
    padding: 14,
    flexDirection: 'row',
    gap: 40,
  },
  countryCol: {
    gap: 6,
    flex: 1,
  },
  countryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  countryBadgeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  countryBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  countryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  emptyCountryText: {
    fontSize: 12,
    color: '#94a3b8',
  },

  /* ACTION MENU MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 70,
    paddingRight: 30,
  },
  actionMenuCard: {
    width: 220,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItemsList: {
    gap: 6,
  },
  actionTextItem: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  actionTextItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  teklifPillBtn: {
    backgroundColor: '#18181b',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  teklifPillBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  btnPressed: {
    opacity: 0.8,
  },
});
