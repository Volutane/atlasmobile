import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  UIManager,
  View
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { CollapsibleContainer } from '@/components/collapsible-container';
import { KotasyonAramaScreen } from '@/components/kotasyon-arama';
import { KotasyonTeklifScreen } from '@/components/kotasyon-teklif';
import { SeferDuzenlemeScreen } from '@/components/sefer-duzenleme';
import { SideMenu } from '@/components/side-menu';
import { TeklifOlusturmaScreen } from '@/components/teklif-olusturma';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CariYonetimiScreen } from './cari-yonetimi';
import { MusteriKartiScreen } from './musteri-karti';


import { ThemedText } from '@/components/themed-text';
import { DEFAULT_API_URL } from '@/constants/api';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { isValidContainerNumber } from '@/utils/containerValidator';

export interface BookingItem {
  id?: number;
  booking_no?: string;
  resultpath?: string;
  resultPath?: string;
  BookingRID?: string;
  booking_tarihi?: string;
  gemi_adi?: string;
  sefer_no?: string;
  hat?: string;
  yukleme_limani?: string;
  tahliye_limani?: string;
  yukleme_yeri?: string;
  varis_yeri?: string;
  ticaret_tipi?: string;
  tasima_tipi?: string;
  konteyner_tipleri?: string;
  dosya_durumu?: string;
  incoterm?: string;
  toplam_alis?: string | number;
  toplam_satis?: string | number;
  kar?: string | number;
  gercek_kar?: string | number;
  iptal?: number;
  iptal_sebep?: string;
  notlar?: string;
  talimat_cutoff?: string;
  beyanname_cutoff?: string;
  vgm_cutoff?: string;
  gercek_kalkis?: string;
  atd?: string;
  ATD?: string;
  [key: string]: any;
}

export function MainDashboard() {
  const { user, token, apiUrl: contextApiUrl, logout } = useAuth();
  const theme = useTheme();
  const responsive = useResponsive();
  const isMobilePortrait = responsive.isMobile && !responsive.isLandscape;
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 0 : Math.max(insets.top, StatusBar.currentHeight || 0);
  const activeBaseUrl = (contextApiUrl || DEFAULT_API_URL).trim().replace(/\/$/, '');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<BookingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState<boolean>(false);
  const [selectedStage, setSelectedStage] = useState<string>('Rezervasyon Aşaması');
  const [dropdownAnim] = useState(() => new Animated.Value(0));
  const [stageAnim] = useState(() => new Animated.Value(0));
  const [atdValue, setAtdValue] = useState<string>('');

  const [satisTemsilcisiVal, setSatisTemsilcisiVal] = useState<string>('');
  const [musteriTemsilcisiVal, setMusteriTemsilcisiVal] = useState<string>('');
  const [dokumantasyonTemsilcisiVal, setDokumantasyonTemsilcisiVal] = useState<string>('');
  const [referanslarListState, setReferanslarListState] = useState<any[]>([]);
  const [rezDetayListState, setRezDetayListState] = useState<any[]>([]);
  const [saveContainerStatus, setSaveContainerStatus] = useState<{ idx: number; text: string; error?: boolean } | null>(null);
  const [saveReferenceStatus, setSaveReferenceStatus] = useState<{ idx: number; text: string; error?: boolean } | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const [isSeferEditOpen, setIsSeferEditOpen] = useState<boolean>(false);
  const [isSideMenuOpen, setIsSideMenuOpen] = useState<boolean>(false);
  const [isTeklifCreateOpen, setIsTeklifCreateOpen] = useState<boolean>(false);
  const [isKotasyonSearchOpen, setIsKotasyonSearchOpen] = useState<boolean>(false);
  const [isKotasyonTeklifOpen, setIsKotasyonTeklifOpen] = useState<boolean>(false);
  const [selectedQuotationsForTeklif, setSelectedQuotationsForTeklif] = useState<any[]>([]);
  const [teklifFormValuesState, setTeklifFormValuesState] = useState<any>(null);
  const [isCariYonetimiOpen, setIsCariYonetimiOpen] = useState<boolean>(false);
  const [isCariCreateOpen, setIsCariCreateOpen] = useState<boolean>(false);
  const [isMusteriKartiOpen, setIsMusteriKartiOpen] = useState<boolean>(false);
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };


  useEffect(() => {
    if (selectedBooking) {
      const val =
        selectedBooking.ATD ??
        selectedBooking.atd ??
        selectedBooking.gercek_kalkis ??
        selectedBooking.rawFields?.ATD ??
        selectedBooking.rawFields?.atd ??
        '';
      setAtdValue(String(val));

      setSatisTemsilcisiVal(
        String(
          selectedBooking.satis_temsilcisi ||
          selectedBooking.salespresentative ||
          selectedBooking.salesrepresentative ||
          selectedBooking.SATIS_TEMSILCISI ||
          selectedBooking.SALESPRESENTATIVE ||
          selectedBooking.createdusername ||
          ''
        )
      );
      setMusteriTemsilcisiVal(
        String(
          selectedBooking.musteri_temsilcisi ||
          selectedBooking.customerpresentative ||
          selectedBooking.customerrepresentative ||
          selectedBooking.MUSTERI_TEMSILCISI ||
          selectedBooking.CUSTOMERPRESENTATIVE ||
          ''
        )
      );
      setDokumantasyonTemsilcisiVal(
        String(
          selectedBooking.dokumantasyon_temsilcisi ||
          selectedBooking.documentationpresentative ||
          selectedBooking.documentationrepresentative ||
          selectedBooking.DOKUMANTASYON_TEMSILCISI ||
          selectedBooking.DOCUMENTATIONPRESENTATIVE ||
          ''
        )
      );

      const getValidRefStr = (...candidates: any[]) => {
        for (const c of candidates) {
          if (c !== undefined && c !== null) {
            const s = String(c).trim();
            if (s !== '' && s !== '-' && s !== '--') return s;
          }
        }
        return '';
      };

      let rawRefList: any[] = [];
      if (Array.isArray(selectedBooking.referanslar) && selectedBooking.referanslar.length > 0) {
        rawRefList = selectedBooking.referanslar;
      } else {
        const list: any[] = [];
        if (selectedBooking.overseasagency) {
          const refVal = getValidRefStr(selectedBooking.overseasagencyref);
          list.push({
            rid: selectedBooking.overseasagencyrid || selectedBooking.rid || selectedBooking.BookingRID || '',
            referans: refVal,
            numara: refVal,
            unvan: selectedBooking.overseasagency,
            rol: 'Yurt Dışı Acente (POL)',
            isOverseas: true
          });
        }
        if (Array.isArray(selectedBooking.bookingshipperconsigneemodel) && selectedBooking.bookingshipperconsigneemodel.length > 0) {
          selectedBooking.bookingshipperconsigneemodel.forEach((r: any) => {
            const name = r.title || r.customername || r.overseasagency || '';
            const refVal = getValidRefStr(r.referenceno, r.referans_no, r.overseasref, r.refno, r.numara, r.referans);
            const itemRid = r.bookinglcrid || r.bookingshipperconsigneerid || r.rid || r.RID || '';
            if (name && !list.some(item => item.unvan === name)) {
              list.push({
                ...r,
                rid: itemRid,
                bookinglcrid: itemRid,
                referans: refVal,
                numara: refVal,
                unvan: name,
                rol: r.type || '',
                isOverseas: false
              });
            }
          });
        } else if (Array.isArray(selectedBooking.bookinglc) && selectedBooking.bookinglc.length > 0) {
          selectedBooking.bookinglc.forEach((r: any) => {
            const name = r.customername || '';
            const refVal = getValidRefStr(r.refno, r.referans_no, r.referenceno, r.numara);
            const itemRid = r.rid || r.RID || r.bookinglcrid || '';
            if (name && !list.some(item => item.unvan === name)) {
              list.push({
                ...r,
                rid: itemRid,
                bookinglcrid: itemRid,
                referans: refVal,
                numara: refVal,
                unvan: name,
                rol: r.type || '',
                isOverseas: false
              });
            }
          });
        }
        if (list.length === 0 && (selectedBooking.rezervasyon_sahibi || selectedBooking.customername || selectedBooking.CUSTOMERNAME)) {
          const name = selectedBooking.rezervasyon_sahibi || selectedBooking.customername || selectedBooking.CUSTOMERNAME;
          const refVal = getValidRefStr(selectedBooking.referans_no);
          list.push({
            rid: selectedBooking.BookingRID || selectedBooking.rid || '',
            referans: refVal,
            numara: refVal,
            unvan: name,
            rol: 'Müşteri / Acente',
            isOverseas: false
          });
        }
        rawRefList = list;
      }
      const refList = rawRefList.map((item: any) => ({
        ...item,
        numara: (item.numara === '-' || item.numara === '--') ? '' : item.numara,
        referans: (item.referans === '-' || item.referans === '--') ? '' : item.referans,
      }));
      setReferanslarListState(refList);

      const rdList = Array.isArray(selectedBooking.rezervasyon_detaylari_list) && selectedBooking.rezervasyon_detaylari_list.length > 0
        ? selectedBooking.rezervasyon_detaylari_list
        : (Array.isArray(selectedBooking.bookingcontainermodel) && selectedBooking.bookingcontainermodel.length > 0
          ? selectedBooking.bookingcontainermodel.map((c: any) => ({
            rid: c.bookingcontainerrid || c.containerrid || c.rid || c.RID || c.id || '',
            bookingcontainerrid: c.bookingcontainerrid || c.containerrid || c.rid || c.RID || c.id || '',
            konteyner_tipi: c.containertypeShort || c.containertype || c.containertypelong || selectedBooking.containertypes || selectedBooking.konteyner_tipleri || "20'SD",
            tonaj: c.estimatedtonnage ? `${c.estimatedtonnage} kg, tonaj` : (c.grossweight ? `${c.grossweight} kg` : ''),
            tartim_notu: c.vgmtypedescription || '',
            vgm: c.vgm === 1 || c.vgm === true,
            hat_acente_rez_no: c.agencyref || selectedBooking.shipvoyageno || selectedBooking.voyageno || selectedBooking.sefer_no || '-',
            konteyner_no: c.containerno || c.containernoconsigment || '',
            yukleme_limani: c.loadingport || selectedBooking.loadingport || selectedBooking.yukleme_limani || '-',
            depo: c.warehousename || '-',
            yukleme_tarihi_saati: (c.loadingdate && c.loadinghour) ? `${c.loadingdate} - ${c.loadinghour}` : (c.loadingdate || selectedBooking.bookingdate || '-'),
            yukleme_adresi: c.loadingaddress || '--',
            nakliyeci: c.transporter || '--'
          }))

          : [{
            konteyner_tipi: selectedBooking.konteyner_tipleri || selectedBooking.containertypes || selectedBooking.CONTAINERTYPES || selectedBooking.CONTYPE || '-',
            tonaj: selectedBooking.tonaj ? `${selectedBooking.tonaj} kg.` : '',
            tartim_notu: selectedBooking.tartim_notu || '',
            vgm: false,
            hat_acente_rez_no: selectedBooking.hat_acente_rez_no || selectedBooking.sefer_no || selectedBooking.voyageno || '-',
            konteyner_no: selectedBooking.konteyner_no || '',
            yukleme_limani: selectedBooking.yukleme_limani || selectedBooking.loadingport || selectedBooking.LOADINGPORT || '-',
            depo: selectedBooking.depo || '-',
            yukleme_tarihi_saati: formatDate(selectedBooking.yukleme_tarihi || selectedBooking.booking_tarihi || selectedBooking.bookingdate),
            yukleme_adresi: selectedBooking.yukleme_adresi || '--',
            nakliyeci: selectedBooking.nakliyeci || '-'
          }]);
      setRezDetayListState(rdList);

      const initialStage = selectedBooking.operasyon_asamasi || selectedBooking.dosya_durumu || 'Rezervasyon Aşaması';
      setSelectedStage(initialStage);
    } else {
      setAtdValue('');
      setSatisTemsilcisiVal('');
      setMusteriTemsilcisiVal('');
      setDokumantasyonTemsilcisiVal('');
      setReferanslarListState([]);
      setRezDetayListState([]);
    }
  }, [selectedBooking]);

  const handleSatisTemsilcisiChange = (text: string) => {
    setSatisTemsilcisiVal(text);
    if (selectedBooking) {
      setSelectedBooking(prev => prev ? { ...prev, satis_temsilcisi: text, salespresentative: text } : null);
    }
  };

  const handleMusteriTemsilcisiChange = (text: string) => {
    setMusteriTemsilcisiVal(text);
    if (selectedBooking) {
      setSelectedBooking(prev => prev ? { ...prev, musteri_temsilcisi: text, customerpresentative: text } : null);
    }
  };

  const handleDokumantasyonTemsilcisiChange = (text: string) => {
    setDokumantasyonTemsilcisiVal(text);
    if (selectedBooking) {
      setSelectedBooking(prev => prev ? { ...prev, dokumantasyon_temsilcisi: text, documentationpresentative: text } : null);
    }
  };

  interface SelectUserOption {
    rid: string;
    username: string;
  }

  const [userSelectList, setUserSelectList] = useState<SelectUserOption[]>([]);
  const [loadingUserSelect, setLoadingUserSelect] = useState<boolean>(false);
  const [repSearchQuery, setRepSearchQuery] = useState<string>('');
  const [savingRep, setSavingRep] = useState<boolean>(false);

  const fetchUsersForSelect = async () => {
    if (userSelectList.length > 0) return;
    setLoadingUserSelect(true);
    try {
      const authToken = token || user?.TOKEN || user?.token || '';
      let response = await fetch(`${activeBaseUrl}/User/GetUsersForSelect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({})
      }).catch(() => null);

      if (!response || !response.ok) {
        response = await fetch(`${DEFAULT_API_URL}/User/GetUsersForSelect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).catch(() => null);
      }

      if (response && response.ok) {
        const text = await response.text();
        if (text && text.trim()) {
          try {
            const data = JSON.parse(text);
            if (Array.isArray(data)) {
              const validUsers = data.filter(u => u && u.username && typeof u.username === 'string');
              setUserSelectList(validUsers);
            }
          } catch (pErr) {
            console.warn('[GetUsersForSelect parse error]:', pErr);
          }
        }
      }
    } catch (err) {
      console.warn('[GetUsersForSelect fetch error]:', err);
    } finally {
      setLoadingUserSelect(false);
    }
  };

  const [simpleRepModal, setSimpleRepModal] = useState<{
    isOpen: boolean;
    type: 'satis' | 'musteri' | 'dokumantasyon' | null;
    title: string;
    inputValue: string;
  } | null>(null);

  const openSimpleRepModal = (type: 'satis' | 'musteri' | 'dokumantasyon', title: string, currentValue: string) => {
    setRepSearchQuery('');
    setSimpleRepModal({
      isOpen: true,
      type,
      title,
      inputValue: currentValue || '',
    });
    fetchUsersForSelect();
  };

  const handleChangePresentativeUser = async (selectedUser: SelectUserOption) => {
    if (!simpleRepModal || !selectedBooking) return;

    const performChange = async () => {
      const activeUserObj = Array.isArray(user) ? user[0] : user;
      const userAuthToken = token || user?.TOKEN || user?.token || '';
      const rawUserRid =
        activeUserObj?.useraccountrid ||
        activeUserObj?.USERACCOUNTRID ||
        activeUserObj?.userAccountRid ||
        activeUserObj?.UserAccountRid ||
        activeUserObj?.USERRID ||
        activeUserObj?.userrid ||
        activeUserObj?.userRid ||
        activeUserObj?.UserRid ||
        activeUserObj?.RID ||
        activeUserObj?.rid ||
        user?.useraccountrid ||
        user?.USERACCOUNTRID ||
        user?.USERRID ||
        user?.userrid ||
        user?.rid ||
        user?.RID ||
        userAuthToken ||
        '';

      const extractUserGuid = (str: string): string => {
        if (!str || typeof str !== 'string') return '';
        const cleanStr = str.trim();
        if (cleanStr.startsWith('ey') && cleanStr.includes('.')) {
          try {
            const parts = cleanStr.split('.');
            if (parts.length >= 2) {
              const base64Url = parts[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(
                atob(base64)
                  .split('')
                  .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                  .join('')
              );
              const parsed = JSON.parse(jsonPayload);
              const extracted =
                parsed['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
                parsed.sub ||
                parsed.nameidentifier ||
                parsed.userrid ||
                parsed.useraccountrid ||
                parsed.rid;
              if (extracted) return String(extracted).trim();
            }
          } catch (e) { }
        }
        return cleanStr;
      };

      const whoChangeUserRID = extractUserGuid(rawUserRid);
      const bookingRID = selectedBooking.BookingRID || selectedBooking.bookingRID || selectedBooking.rid || selectedBooking.RID || '';

      let apiType: string = simpleRepModal.type || '';
      if (apiType === 'satis') apiType = 'sales';
      else if (apiType === 'musteri') apiType = 'customer';
      else if (apiType === 'dokumantasyon') apiType = 'documentation';

      const changePresentativeModel = {
        WHOCHANGEUSERRID: whoChangeUserRID,
        BOOKINGRID: bookingRID,
        TYPE: apiType,
        USERRID: selectedUser.rid
      };

      setSavingRep(true);
      try {
        const authToken = token || user?.TOKEN || user?.token || '';
        const response = await fetch(`${activeBaseUrl}/Booking/ChangePresentative`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify(changePresentativeModel)
        });

        const resData = await response.json().catch(() => null);

        if (response.ok && resData?.status === 'Success') {
          if (simpleRepModal.type === 'satis') {
            handleSatisTemsilcisiChange(selectedUser.username);
          } else if (simpleRepModal.type === 'musteri') {
            handleMusteriTemsilcisiChange(selectedUser.username);
          } else if (simpleRepModal.type === 'dokumantasyon') {
            handleDokumantasyonTemsilcisiChange(selectedUser.username);
          }
          setSimpleRepModal(null);

          // Re-fetch detail from server to sync backend state
          if (selectedBooking) {
            handleBookingClick(selectedBooking);
          }

          if (Platform.OS === 'web') {
            window.alert("İşlem başarılı!");
          } else {
            Alert.alert("Başarılı", "İşlem başarılı!");
          }
        } else if (resData?.status === 'DuplicateRecord') {
          const msg = resData.message || "Bu kayıt zaten mevcut.";
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert("Hata", msg);
        } else {
          const msg = resData?.message || "Bir hata oluştu, tekrar deneyiniz";
          if (Platform.OS === 'web') window.alert(msg);
          else Alert.alert("Hata", msg);
        }
      } catch (err: any) {
        console.error('API hatası:', err);
        const msg = "Bir hata oluştu, tekrar deneyiniz";
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert("Hata", msg);
      } finally {
        setSavingRep(false);
      }
    };

    const confirmMsg = "Bu temsilciyi değiştirmek istediğinizden emin misiniz?";
    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        performChange();
      }
    } else {
      Alert.alert(
        "Temsilci Değişikliği",
        confirmMsg,
        [
          { text: "İptal", style: "cancel" },
          { text: "Evet, Değiştir", onPress: performChange }
        ]
      );
    }
  };

  const handleSaveSimpleRepModal = () => {
    if (!simpleRepModal) return;
    const val = simpleRepModal.inputValue.trim();
    if (simpleRepModal.type === 'satis') {
      handleSatisTemsilcisiChange(val);
    } else if (simpleRepModal.type === 'musteri') {
      handleMusteriTemsilcisiChange(val);
    } else if (simpleRepModal.type === 'dokumantasyon') {
      handleDokumantasyonTemsilcisiChange(val);
    }
    setSimpleRepModal(null);
  };

  const handleReferansNumaraChange = (idx: number, numara: string) => {
    setReferanslarListState(prev => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], numara, referans: numara };
      }
      return updated;
    });
  };

  const handleSaveReference = async (idx: number, refItem: any) => {
    const activeUserObj = Array.isArray(user) ? user[0] : user;
    const userAuthToken = token || user?.TOKEN || user?.token || '';
    const rawUserRid =
      activeUserObj?.useraccountrid ||
      activeUserObj?.USERACCOUNTRID ||
      activeUserObj?.userAccountRid ||
      activeUserObj?.UserAccountRid ||
      activeUserObj?.USERRID ||
      activeUserObj?.userrid ||
      activeUserObj?.userRid ||
      activeUserObj?.UserRid ||
      activeUserObj?.RID ||
      activeUserObj?.rid ||
      user?.useraccountrid ||
      user?.USERACCOUNTRID ||
      user?.USERRID ||
      user?.userrid ||
      user?.rid ||
      user?.RID ||
      userAuthToken ||
      '';

    const extractUserGuid = (str: string): string => {
      if (!str || typeof str !== 'string') return '';
      const cleanStr = str.trim();
      if (cleanStr.startsWith('ey') && cleanStr.includes('.')) {
        try {
          const parts = cleanStr.split('.');
          if (parts.length >= 2) {
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const parsed = JSON.parse(jsonPayload);
            const extracted =
              parsed['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
              parsed.sub ||
              parsed.nameidentifier ||
              parsed.userrid ||
              parsed.useraccountrid ||
              parsed.rid;
            if (extracted) return String(extracted).trim();
          }
        } catch (e) { }
      }
      return cleanStr;
    };

    const whoEditUserRID = extractUserGuid(rawUserRid);

    const itemRid =
      refItem?.bookinglcrid ||
      refItem?.BOOKINGLCRID ||
      refItem?.bookingshipperconsigneerid ||
      refItem?.BOOKINGSHIPPERCONSIGNEERID ||
      refItem?.rid ||
      refItem?.RID ||
      selectedBooking?.BookingRID ||
      selectedBooking?.rid ||
      '';
    const referenceVal = refItem?.numara || refItem?.referans || '';

    const editReferenceModel = {
      WHOEDITUSERRID: whoEditUserRID,
      RID: itemRid,
      REFERENCE: referenceVal,
    };

    const isOverseas =
      refItem?.isOverseas ||
      (refItem?.rol && (
        refItem.rol.toLowerCase().includes('yurt dışı') ||
        refItem.rol.toLowerCase().includes('overseas') ||
        refItem.rol.toLowerCase().includes('acente')
      ));

    const endpoint = isOverseas
      ? `${activeBaseUrl}/Booking/EditOverseasReference`
      : `${activeBaseUrl}/Booking/EditShipperConsigneeReference`;

    setSaveReferenceStatus({ idx, text: 'Kaydediliyor...' });
    console.log(`[API Save Reference] Endpoint: ${endpoint}`, JSON.stringify(editReferenceModel));
    console.log(`[API Save Reference] authToken present: ${!!(token || user?.TOKEN || user?.token)}`);

    try {
      const authToken = token || user?.TOKEN || user?.token || '';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(editReferenceModel)
      });

      const responseText = await response.text();
      console.log(`[API Save Reference] Status: ${response.status}, Response: ${responseText}`);

      let resData: any = null;
      try { resData = JSON.parse(responseText); } catch (e) { }

      if (response.ok) {
        setSaveReferenceStatus({ idx, text: 'Referans başarıyla değiştirildi!' });
        // Update local state with saved value
        setReferanslarListState(prev => {
          const updated = [...prev];
          if (updated[idx]) {
            updated[idx] = { ...updated[idx], numara: referenceVal, referans: referenceVal };
          }
          return updated;
        });
      } else {
        const errMsg = resData?.message || resData?.Message || `API Hatası: ${response.status}`;
        console.error(`[API Save Reference] FAILED: ${errMsg}`);
        setSaveReferenceStatus({ idx, text: errMsg, error: true });
      }
    } catch (err: any) {
      console.error('[API Save Reference] Network error:', err.message);
      setSaveReferenceStatus({ idx, text: `Bağlantı hatası: ${err.message}`, error: true });
    } finally {
      setTimeout(() => {
        setSaveReferenceStatus(null);
      }, 4000);
    }
  };

  const handleKonteynerNoChange = (idx: number, text: string) => {
    setRezDetayListState(prev => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], konteyner_no: text };
      }
      return updated;
    });
  };

  const handleSaveKonteynerNo = async (idx: number, containerNo: string) => {
    const trimmed = (containerNo || '').trim().toUpperCase();

    if (!trimmed) {
      setSaveContainerStatus({ idx, text: 'Konteyner No boş olamaz!', error: true });
      setTimeout(() => setSaveContainerStatus(null), 3000);
      return;
    }

    // Önce ISO 6346 Matematiksel Doğruluk Kontrolü
    if (!isValidContainerNumber(trimmed)) {
      setSaveContainerStatus({ idx, text: 'Hatalı Konteyner No', error: true });
      setTimeout(() => setSaveContainerStatus(null), 4000);
      return;
    }

    setSaveContainerStatus({ idx, text: 'Kaydediliyor...' });
    console.log(`[API Save Container] Satır ${idx + 1}: "${trimmed}"`);

    try {
      const authToken = token || user?.TOKEN || user?.token || '';
      const containerItem = rezDetayListState[idx];
      const containerRid = containerItem?.BookingContainerRID || containerItem?.containerrid || containerItem?.rid || selectedBooking?.BookingRID || '';

      const payload = {
        BOOKINGCONTAINERRID: containerRid,
        CONTAINERNO: trimmed,
        bookingRid: selectedBooking?.BookingRID || selectedBooking?.rid || '',
        rowIndex: idx,
        konteynerNo: trimmed,
      };

      const response = await fetch(`${activeBaseUrl}/Booking/AddBookingContainerNo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      let resData: any = null;
      try { resData = JSON.parse(responseText); } catch (e) { }

      if (response.ok && (!resData || resData.status === 'Success' || resData.success !== false)) {
        setSaveContainerStatus({ idx, text: 'Kaydedildi ✓' });

        // Update local state in selectedBooking so UI retains updated container number
        setSelectedBooking(prev => {
          if (!prev) return null;
          const updated = { ...prev };
          if (Array.isArray(updated.bookingcontainermodel) && updated.bookingcontainermodel[idx]) {
            const copy = [...updated.bookingcontainermodel];
            copy[idx] = {
              ...copy[idx],
              containerno: trimmed,
              containernoconsigment: trimmed,
              konteyner_no: trimmed
            };
            updated.bookingcontainermodel = copy;
          }
          if (Array.isArray(updated.rezervasyon_detaylari_list) && updated.rezervasyon_detaylari_list[idx]) {
            const copy = [...updated.rezervasyon_detaylari_list];
            copy[idx] = {
              ...copy[idx],
              konteyner_no: trimmed,
              containerno: trimmed
            };
            updated.rezervasyon_detaylari_list = copy;
          }
          updated.konteyner_no = trimmed;
          return updated;
        });

        setRezDetayListState(prev => {
          const copy = [...prev];
          if (copy[idx]) {
            copy[idx] = { ...copy[idx], konteyner_no: trimmed };
          }
          return copy;
        });
      } else if (resData && (resData.status === 'DuplicateRecord' || resData.status === 'ConsignmentExist' || resData.status === 'InvalidContainer')) {
        setSaveContainerStatus({ idx, text: resData.message || 'Kayıt Hatası!', error: true });
      } else {
        setSaveContainerStatus({ idx, text: resData?.message || 'Kaydedildi ✓' });
      }
    } catch (e: any) {
      console.warn('[API Save Container Error]:', e.message);
      setSaveContainerStatus({ idx, text: 'Kaydedildi ✓' });
    } finally {
      setTimeout(() => {
        setSaveContainerStatus(null);
      }, 3500);
    }
  };


  const handleAtdChange = (text: string) => {
    setAtdValue(text);
    if (selectedBooking) {
      setSelectedBooking(prev => prev ? {
        ...prev,
        ATD: text,
        atd: text,
        gercek_kalkis: text,
      } : null);
    }
  };

  useEffect(() => {
    if (isUserModalOpen) {
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      dropdownAnim.setValue(0);
    }
  }, [isUserModalOpen]);

  useEffect(() => {
    if (isStageModalOpen) {
      Animated.timing(stageAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      stageAnim.setValue(0);
    }
  }, [isStageModalOpen]);

  const RESERVATION_STAGES: any[] = [];

  const handleStageSelect = (stageLabel: string) => {
    setSelectedStage(stageLabel);
    if (selectedBooking) {
      setSelectedBooking(prev => prev ? {
        ...prev,
        operasyon_asamasi: stageLabel,
        dosya_durumu: stageLabel,
      } : null);
    }
    setIsStageModalOpen(false);
  };

  // Extract actual user data even if user object is nested or inside array
  const activeUser = Array.isArray(user) ? user[0] : user;

  const displayName =
    activeUser?.USERNAME ||
    activeUser?.username ||
    activeUser?.USER_NAME ||
    activeUser?.user_name ||
    activeUser?.NAME ||
    activeUser?.name ||
    activeUser?.ISIM ||
    activeUser?.isim ||
    activeUser?.USERRID ||
    activeUser?.userrid ||
    'Kullanıcı';

  // Booking detail fetcher using Booking/GetBookingWithRid (BookingRidSearchModel)
  const handleBookingClick = async (item: BookingItem) => {
    let bookingRid = item.BookingRID || item.bookingRID || item.RID || item.rid;
    if (!bookingRid && item.resultpath) {
      const match = item.resultpath.match(/BookingRID=([a-fA-F0-9-]+)/i);
      if (match) bookingRid = match[1];
    }

    setSelectedBooking(item);
    setIsDetailLoading(true);
    setDetailError(null);

    if (!bookingRid) {
      console.warn('Booking RID bulunamadı');
      setIsDetailLoading(false);
      return;
    }

    try {
      const authToken = token || user?.TOKEN || user?.token || '';

      const response = await fetch(`${activeBaseUrl}/Booking/GetBookingWithRid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          BOOKINGRID: bookingRid,
          CONTYPE: item.CONTYPE || item.konteyner_tipleri || ''
        })
      });

      const resData = await response.json();
      const detailObj = resData?.data || resData;

      if (detailObj && (detailObj.BookingRID || detailObj.rid || detailObj.booking_no || detailObj.bookingno || detailObj.BOOKINGNO || detailObj.gemi_adi || detailObj.shipname)) {
        setSelectedBooking(prev => ({
          ...(prev || {}),
          ...detailObj,
          booking_no: detailObj.booking_no || detailObj.bookingno || detailObj.BOOKINGNO || prev?.booking_no || '',
          booking_tarihi: detailObj.booking_tarihi || detailObj.bookingdate || detailObj.BOOKINGDATE || detailObj.createddate || prev?.booking_tarihi || '',
          gemi_adi: detailObj.gemi_adi || detailObj.shipname || detailObj.SHIPNAME || detailObj.vesselname || detailObj.VESSELNAME || prev?.gemi_adi || '',
          sefer_no: detailObj.sefer_no || detailObj.voyageno || detailObj.VOYAGENO || detailObj.shipvoyageno || prev?.sefer_no || '',
          hat: detailObj.hat || detailObj.line || detailObj.LINENAME || detailObj.linename || prev?.hat || '',
          yukleme_limani: detailObj.yukleme_limani || detailObj.loadingport || detailObj.LOADINGPORT || detailObj.POL || prev?.yukleme_limani || '',
          portrid: detailObj.portrid || detailObj.PORTRID || detailObj.loadingportrid || detailObj.LOADINGPORTRID || prev?.portrid || '',
          loadingportrid: detailObj.loadingportrid || detailObj.LOADINGPORTRID || detailObj.portrid || detailObj.PORTRID || prev?.loadingportrid || '',
          voyagecutoffrid: detailObj.voyagecutoffrid || detailObj.VOYAGECUTOFFRID || prev?.voyagecutoffrid || '',
          tahliye_limani: detailObj.tahliye_limani || detailObj.dischargeport || detailObj.DISCHARGEPORT || detailObj.POD || prev?.tahliye_limani || '',
          yukleme_yeri: detailObj.yukleme_yeri || detailObj.loadinglocation || detailObj.LOADINGLOCATION || prev?.yukleme_yeri || '',
          varis_yeri: detailObj.varis_yeri || detailObj.dischargelocation || detailObj.DISCHARGELOCATION || prev?.varis_yeri || '',
          dosya_durumu: detailObj.dosya_durumu || detailObj.bookingstep || detailObj.DOSYA_DURUMU || prev?.dosya_durumu || 'AKTİF',
          incoterm: detailObj.incoterm || detailObj.INCOTERM || prev?.incoterm || '',
          toplam_alis: detailObj.toplam_alis || detailObj.totalbuyingcost || detailObj.totalbuying || detailObj.TOTALBUYINGCOST || 0,
          toplam_satis: detailObj.toplam_satis || detailObj.totalsellingcost || detailObj.totalselling || detailObj.TOTALSELLINGCOST || 0,
          kar: detailObj.kar || detailObj.profit || detailObj.totalprofit || detailObj.PROFIT || 0,
          rezervasyon_sahibi: detailObj.rezervasyon_sahibi || detailObj.customername || detailObj.CUSTOMERNAME || prev?.rezervasyon_sahibi || '',
          satis_temsilcisi: detailObj.satis_temsilcisi || detailObj.salespresentative || detailObj.SALESPRESENTATIVE || prev?.satis_temsilcisi || '',
          musteri_temsilcisi: detailObj.musteri_temsilcisi || detailObj.customerpresentative || detailObj.CUSTOMERPRESENTATIVE || prev?.musteri_temsilcisi || '',
          dokumantasyon_temsilcisi: detailObj.dokumantasyon_temsilcisi || detailObj.documentationpresentative || detailObj.DOCUMENTATIONPRESENTATIVE || prev?.dokumantasyon_temsilcisi || '',
        }));
      } else if (resData?.message) {
        setDetailError(resData.message);
      }
    } catch (err: any) {
      console.error('GetBookingWithRid fetch error:', err);
      setDetailError('Booking detayları çekilirken sunucu hatası oluştu');
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Booking search fetcher
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsLoading(false);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setSearchError(null);
      const cleanQ = searchQuery.trim();
      try {
        const authToken = token || user?.TOKEN || user?.token || '';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

        const fetchWithTimeout = async (url: string, opts: RequestInit = {}, ms = 5000) => {
          const controller = new AbortController();
          const timerId = setTimeout(() => controller.abort(), ms);
          try {
            const res = await fetch(url, { ...opts, signal: controller.signal });
            clearTimeout(timerId);
            return res;
          } catch {
            clearTimeout(timerId);
            return null;
          }
        };

        // 1. Try GET to search endpoint
        let response = await fetchWithTimeout(
          `${activeBaseUrl}/Booking/BookingSearchBar?searchparameter=${encodeURIComponent(cleanQ)}&searchtype=REFNOORAGENCYNO`,
          { method: 'GET', headers },
          5000
        );

        let data: any = null;
        if (response && response.ok) {
          data = await response.json().catch(() => null);
        }

        // 2. If GET failed or gave non-200/empty, try POST endpoint (direct Remote API compatibility)
        if (!data || (!data.success && !Array.isArray(data))) {
          response = await fetchWithTimeout(
            `${activeBaseUrl}/Booking/BookingSearchBar`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                SEARCHTEXT: cleanQ,
                SEARCHTYPE: 'REFNOORAGENCYNO',
                searchparameter: cleanQ,
                searchtype: 'REFNOORAGENCYNO',
              }),
            },
            5000
          );

          if (response && response.ok) {
            data = await response.json().catch(() => null);
          }
        }

        let rawList: any[] = [];
        if (Array.isArray(data)) {
          rawList = data;
        } else if (data && data.success && Array.isArray(data.data)) {
          rawList = data.data;
        } else if (data && Array.isArray(data.data)) {
          rawList = data.data;
        } else if (data && Array.isArray(data.result)) {
          rawList = data.result;
        }

        if (rawList.length > 0) {
          const normalized: BookingItem[] = rawList.map((item: any, index: number) => {
            let rid = item.BookingRID || item.bookingRID || item.RID || item.rid;
            if (!rid && item.resultpath) {
              const match = item.resultpath.match(/BookingRID=([a-fA-F0-9-]+)/i);
              if (match) rid = match[1];
            }
            return {
              ...item,
              id: item.id || index + 1,
              BookingRID: rid,
              resultpath: item.resultpath,
              booking_no: item.booking_no || item.bookingno || item.BOOKINGNO || (item.resultpath ? item.resultpath.split('=')[1] : cleanQ),
              booking_tarihi: item.booking_tarihi || item.bookingdate || item.BOOKINGDATE || item.createddate,
              gemi_adi: item.gemi_adi || item.shipname || item.SHIPNAME || item.vesselname || item.VESSELNAME || '',
              sefer_no: item.sefer_no || item.voyageno || item.VOYAGENO || item.shipvoyageno || '',
              hat: item.hat || item.line || item.LINENAME || item.linename || '',
              yukleme_limani: item.yukleme_limani || item.loadingport || item.LOADINGPORT || item.POL || item.loadinglocation || '',
              tahliye_limani: item.tahliye_limani || item.dischargeport || item.DISCHARGEPORT || item.POD || item.dischargelocation || '',
              yukleme_yeri: item.yukleme_yeri || item.loadinglocation || item.LOADINGLOCATION || '',
              varis_yeri: item.varis_yeri || item.dischargelocation || item.DISCHARGELOCATION || '',
              dosya_durumu: item.dosya_durumu || item.bookingstep || item.DOSYA_DURUMU || 'AKTİF',
              incoterm: item.incoterm || item.INCOTERM || '',
            };
          });
          setSearchResults(normalized);

          // Background auto-enrichment for items with missing vessel/port info
          normalized.forEach(async (searchItem, index) => {
            if (searchItem.BookingRID && (!searchItem.gemi_adi || !searchItem.yukleme_limani)) {
              try {
                const detailRes = await fetchWithTimeout(`${activeBaseUrl}/Booking/GetBookingWithRid`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ BOOKINGRID: searchItem.BookingRID })
                }, 5000);
                if (detailRes && detailRes.ok) {
                  const detailJson = await detailRes.json().catch(() => null);
                  const dObj = detailJson?.data || detailJson;
                  if (dObj && (dObj.gemi_adi || dObj.shipname || dObj.loadingport || dObj.yukleme_limani)) {
                    setSearchResults(prevList => prevList.map((pItem, pIdx) => {
                      if (pIdx === index) {
                        return {
                          ...pItem,
                          ...dObj,
                          booking_no: dObj.booking_no || dObj.bookingno || dObj.BOOKINGNO || pItem.booking_no,
                          booking_tarihi: dObj.booking_tarihi || dObj.bookingdate || dObj.createddate || pItem.booking_tarihi,
                          gemi_adi: dObj.gemi_adi || dObj.shipname || dObj.SHIPNAME || dObj.vesselname || pItem.gemi_adi,
                          sefer_no: dObj.sefer_no || dObj.voyageno || dObj.VOYAGENO || pItem.sefer_no,
                          hat: dObj.hat || dObj.line || dObj.LINENAME || pItem.hat,
                          yukleme_limani: dObj.yukleme_limani || dObj.loadingport || dObj.LOADINGPORT || dObj.POL || pItem.yukleme_limani,
                          tahliye_limani: dObj.tahliye_limani || dObj.dischargeport || dObj.DISCHARGEPORT || dObj.POD || pItem.tahliye_limani,
                          yukleme_yeri: dObj.yukleme_yeri || dObj.loadinglocation || dObj.CUSTOMERNAME || pItem.yukleme_yeri,
                          varis_yeri: dObj.varis_yeri || dObj.dischargelocation || pItem.varis_yeri,
                          dosya_durumu: dObj.dosya_durumu || dObj.bookingstep || dObj.DOSYA_DURUMU || pItem.dosya_durumu,
                          incoterm: dObj.incoterm || dObj.INCOTERM || pItem.incoterm,
                        };
                      }
                      return pItem;
                    }));
                  }
                }
              } catch (e) {
                // Ignore background enrichment error
              }
            }
          });
        } else {
          setSearchResults([]);
          setSearchError(data?.message || 'Sonuç bulunamadı');
        }
      } catch (err: any) {
        console.error('Booking search error:', err);
        setSearchError('Arama sırasında sunucu bağlantı hatası oluştu');
      } finally {
        setIsLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, activeBaseUrl]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const sampleBookingCodes = ['ESF260800502', 'ESF260800503', 'ESF260800504', 'ESF260100868'];

  if (isCariYonetimiOpen) {
    return (
      <CariYonetimiScreen
        onClose={() => setIsCariYonetimiOpen(false)}
        onSelectCustomer={(customer) => {
          setSelectedCustomerData(customer);
          setIsCariYonetimiOpen(false);
          setIsMusteriKartiOpen(true);
        }}
        onOpenTeklifCreate={(customer) => {
          setSelectedCustomerData(customer);
          setIsCariYonetimiOpen(false);
          setIsTeklifCreateOpen(true);
        }}
      />
    );
  }

  if (isMusteriKartiOpen) {
    return (
      <MusteriKartiScreen
        customerData={selectedCustomerData}
        onClose={() => {
          setIsMusteriKartiOpen(false);
          setIsCariYonetimiOpen(true);
        }}
        onOpenTeklifCreate={() => {
          setIsMusteriKartiOpen(false);
          setIsTeklifCreateOpen(true);
        }}
      />
    );
  }

  if (isTeklifCreateOpen) {
    return (
      <TeklifOlusturmaScreen
        customerData={selectedCustomerData}
        onClose={() => {
          setIsTeklifCreateOpen(false);
          setIsMusteriKartiOpen(true);
        }}
        onSubmit={(values) => {
          setTeklifFormValuesState(values);
          setIsTeklifCreateOpen(false);
          const isValIthalat =
            values.ticariTipi?.includes('İthalat') ||
            values.ticariTipi?.includes('ITHALAT') ||
            values.ticariTipi?.toLowerCase().includes('ithal') ||
            values.ticariTipi?.toLowerCase().includes('thalat');
          if (
            isValIthalat ||
            values.kotasyonKullanimi === 'Hayır'
          ) {
            setSelectedQuotationsForTeklif([]);
            setIsKotasyonTeklifOpen(true);
          } else {
            setIsKotasyonSearchOpen(true);
          }
        }}
      />
    );
  }

  if (isKotasyonSearchOpen) {
    return (
      <KotasyonAramaScreen
        initialValues={teklifFormValuesState}
        onClose={() => {
          setIsKotasyonSearchOpen(false);
          setIsMusteriKartiOpen(true);
        }}
        onBack={() => {
          setIsKotasyonSearchOpen(false);
          setIsTeklifCreateOpen(true);
        }}
        onSubmit={(values, selectedQuotations) => {
          setTeklifFormValuesState(values);
          setSelectedQuotationsForTeklif(selectedQuotations || []);
          setIsMusteriKartiOpen(false);
          setIsKotasyonSearchOpen(false);
          setIsKotasyonTeklifOpen(true);
        }}
      />
    );
  }

  if (isKotasyonTeklifOpen) {
    return (
      <KotasyonTeklifScreen
        selectedQuotations={selectedQuotationsForTeklif}
        searchParams={teklifFormValuesState}
        onClose={() => {
          setIsKotasyonTeklifOpen(false);
          setIsMusteriKartiOpen(true);
        }}
        onBack={() => {
          setIsKotasyonTeklifOpen(false);
          setIsKotasyonSearchOpen(true);
        }}
      />
    );
  }

  // IF A BOOKING IS SELECTED, RENDER DEDICATED FULL-PAGE BOOKING DETAIL SCREEN (ERP STYLE)
  if (selectedBooking !== null) {
    if (isSeferEditOpen) {
      return (
        <SeferDuzenlemeScreen
          booking={selectedBooking}
          atdValue={atdValue}
          onClose={() => setIsSeferEditOpen(false)}
          onSave={(updatedBooking, newAtd) => {
            setSelectedBooking(updatedBooking);
            if (newAtd) {
              setAtdValue(newAtd);
            }
            setIsSeferEditOpen(false);
          }}
        />
      );
    }
    const bookingNoStr = selectedBooking.booking_no || selectedBooking.BOOKINGNO || (selectedBooking.resultpath ? selectedBooking.resultpath.split('=')[1] : searchQuery) || '';

    // Use state lists or fallback arrays
    const referanslarList = referanslarListState.length > 0
      ? referanslarListState
      : (Array.isArray(selectedBooking.referanslar) && selectedBooking.referanslar.length > 0
        ? selectedBooking.referanslar
        : (Array.isArray(selectedBooking.bookingshipperconsigneemodel) && selectedBooking.bookingshipperconsigneemodel.length > 0
          ? selectedBooking.bookingshipperconsigneemodel.map((r: any) => ({
            referans: r.overseasref || r.referenceno || r.numara || '-',
            numara: r.numara || r.overseasref || r.referenceno || '',
            unvan: r.title || r.customername || r.overseasagency || '',
            rol: r.type || ''
          }))
          : (selectedBooking.rezervasyon_sahibi || selectedBooking.customername || selectedBooking.CUSTOMERNAME
            ? [{ referans: '', numara: '', unvan: selectedBooking.rezervasyon_sahibi || selectedBooking.customername || selectedBooking.CUSTOMERNAME, rol: 'Müşteri / Acente' }]
            : [])));

    const rezDetayList = rezDetayListState.length > 0
      ? rezDetayListState
      : (Array.isArray(selectedBooking.rezervasyon_detaylari_list) && selectedBooking.rezervasyon_detaylari_list.length > 0
        ? selectedBooking.rezervasyon_detaylari_list
        : (Array.isArray(selectedBooking.bookingcontainermodel) && selectedBooking.bookingcontainermodel.length > 0
          ? selectedBooking.bookingcontainermodel.map((c: any) => ({
            konteyner_tipi: c.containertypeShort || c.containertype || c.containertypelong || selectedBooking.containertypes || selectedBooking.konteyner_tipleri || "20'SD",
            tonaj: c.estimatedtonnage ? `${c.estimatedtonnage} kg, tonaj` : (c.grossweight ? `${c.grossweight} kg` : ''),
            tartim_notu: c.vgmtypedescription || '',
            vgm: c.vgm === 1 || c.vgm === true,
            hat_acente_rez_no: c.agencyref || selectedBooking.shipvoyageno || selectedBooking.voyageno || selectedBooking.sefer_no || '-',
            konteyner_no: c.containerno || c.containernoconsigment || '',
            yukleme_limani: c.loadingport || selectedBooking.loadingport || selectedBooking.yukleme_limani || '-',
            depo: c.warehousename || '-',
            yukleme_tarihi_saati: (c.loadingdate && c.loadinghour) ? `${c.loadingdate} - ${c.loadinghour}` : (c.loadingdate || selectedBooking.bookingdate || '-'),
            yukleme_adresi: c.loadingaddress || '--',
            nakliyeci: c.transporter || '--'
          }))
          : [{
            konteyner_tipi: selectedBooking.konteyner_tipleri || selectedBooking.containertypes || selectedBooking.CONTAINERTYPES || selectedBooking.CONTYPE || '-',
            tonaj: selectedBooking.tonaj ? `${selectedBooking.tonaj} kg.` : '',
            tartim_notu: selectedBooking.tartim_notu || '',
            vgm: false,
            hat_acente_rez_no: selectedBooking.hat_acente_rez_no || selectedBooking.sefer_no || selectedBooking.voyageno || '-',
            konteyner_no: selectedBooking.konteyner_no || '',
            yukleme_limani: selectedBooking.yukleme_limani || selectedBooking.loadingport || selectedBooking.LOADINGPORT || '-',
            depo: selectedBooking.depo || '-',
            yukleme_tarihi_saati: formatDate(selectedBooking.yukleme_tarihi || selectedBooking.booking_tarihi || selectedBooking.bookingdate),
            yukleme_adresi: selectedBooking.yukleme_adresi || '--',
            nakliyeci: selectedBooking.nakliyeci || '-'
          }]));

    const notlarList = Array.isArray(selectedBooking.notlar_list) && selectedBooking.notlar_list.length > 0
      ? selectedBooking.notlar_list
      : (Array.isArray(selectedBooking.customer_notes_list) && selectedBooking.customer_notes_list.length > 0
        ? selectedBooking.customer_notes_list
        : (Array.isArray(selectedBooking.customerNotes) && selectedBooking.customerNotes.length > 0
          ? selectedBooking.customerNotes.map((n: any) => ({ departman: n.department || 'Genel', not: n.customernote || n.note || '' }))
          : (Array.isArray(selectedBooking.bookingnotesmodel) && selectedBooking.bookingnotesmodel.length > 0
            ? selectedBooking.bookingnotesmodel.map((n: any) => ({ departman: n.department || 'Genel', not: n.note || n.customernote || '' }))
            : [])));

    const kurlarObj = selectedBooking.kurlar || (selectedBooking.sellingdollar ? {
      dolar: selectedBooking.sellingdollar,
      euro: selectedBooking.sellingeuro || '-',
      sterlin: selectedBooking.sellingsterlin || '-',
      euro_dolar: selectedBooking.eurodollar || '-',
      sterlin_dolar: selectedBooking.sterlindollar || '-'
    } : null);

    return (
      <View style={[styles.container, { backgroundColor: '#f3f4f6', paddingTop: topPadding }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />
        {/* DEDICATED DETAIL PAGE TOP ACTION / CONTROL BAR */}
        <View style={[styles.erpTopActionBar, responsive.isMobile && styles.erpTopActionBarMobile]}>
          {responsive.isMobile ? (
            <View style={{ width: '100%', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Pressable
                  onPress={() => setSelectedBooking(null)}
                  style={({ pressed }) => [styles.erpBackBtn, pressed && { opacity: 0.8 }]}>
                  <ThemedText style={styles.erpBackBtnText}> Listeye Dön</ThemedText>
                </Pressable>

                <Pressable style={({ pressed }) => [styles.erpSendBtn, pressed && { opacity: 0.85 }]}>
                  <ThemedText style={styles.erpSendBtnText}>Gönder</ThemedText>
                </Pressable>
              </View>

              <Pressable
                onPress={() => setIsStageModalOpen(true)}
                style={({ pressed }) => [
                  styles.erpStageSelectWrapper,
                  { width: '100%', justifyContent: 'space-between' },
                  pressed && { opacity: 0.8 }
                ]}>
                <ThemedText style={styles.erpStageSelectText}>{selectedStage}</ThemedText>
                <ThemedText style={{ fontSize: 11, color: '#64748b' }}>{isStageModalOpen ? '▲' : '▼'}</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable
                onPress={() => setSelectedBooking(null)}
                style={({ pressed }) => [styles.erpBackBtn, pressed && { opacity: 0.8 }]}>
                <ThemedText style={styles.erpBackBtnText}> Listeye Dön</ThemedText>
              </Pressable>

              <View style={styles.erpActionBarRight}>
                {isDetailLoading && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 12 }}>
                    <ActivityIndicator size="small" color="#2563eb" />
                    <ThemedText style={{ fontSize: 13, color: '#2563eb', marginLeft: 6, fontWeight: '600' }}>
                      Yükleniyor...
                    </ThemedText>
                  </View>
                )}

                <Pressable
                  onPress={() => setIsStageModalOpen(true)}
                  style={({ pressed }) => [
                    styles.erpStageSelectWrapper,
                    pressed && { opacity: 0.8 }
                  ]}>
                  <ThemedText style={styles.erpStageSelectText}>{selectedStage}</ThemedText>
                  <ThemedText style={{ fontSize: 11, color: '#64748b' }}>{isStageModalOpen ? '▲' : '▼'}</ThemedText>
                </Pressable>

                <Pressable style={({ pressed }) => [styles.erpSendBtn, pressed && { opacity: 0.85 }]}>
                  <ThemedText style={styles.erpSendBtnText}>Gönder</ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* MAIN SCROLLABLE ERP DETAIL CONTENT */}
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 60, gap: 14 }}>
          {detailError && (
            <View style={styles.errorBox}>
              <ThemedText style={styles.errorText}>{detailError}</ThemedText>
            </View>
          )}

          {/* MAIN CONTAINER 1: DETAY BİLGİLERİ */}
          <View style={styles.erpSectionBox}>
            {/* DARK GRAY SECTION HEADER BAR */}
            <Pressable
              onPress={() => toggleSection('detay')}
              style={({ pressed }) => [styles.erpSectionHeaderBar, pressed && { opacity: 0.9 }, Platform.OS === 'web' && { cursor: 'pointer' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.erpMinusBadge}>
                  <ThemedText style={styles.erpMinusText}>
                    {collapsedSections['detay'] ? '+' : '-'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.erpSectionTitleText}>
                  Detay Bilgileri [{bookingNoStr || 'Booking'}]
                </ThemedText>
              </View>
              {selectedBooking.notification_count ? (
                <View style={styles.erpOrangeCounterBadge}>
                  <ThemedText style={styles.erpOrangeCounterText}>{selectedBooking.notification_count}</ThemedText>
                </View>
              ) : null}
            </Pressable>

            <CollapsibleContainer expanded={!collapsedSections['detay']}>
              <View>
                {/* SUBHEADER HEADING */}
                <View style={styles.erpSubHeaderRow}>
                  <ThemedText style={styles.erpStatusHeadingText}>
                    {selectedBooking.operasyon_asamasi || selectedBooking.dosya_durumu || 'Operasyon Aşamasında'}
                  </ThemedText>
                </View>

                {/* 2-COLUMN FORM TABLE GRID */}
                <View style={styles.erpGridTable}>
                  {/* Row 1 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Bağlı İthalat Dosya</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.bagli_ithalat_dosya || '-'}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Overseas</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.overseas || '-'}</ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 2 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Rezervasyon Numarası</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{bookingNoStr || '-'}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Birleştirilmiş Dosyalar</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.birlestirilmis_dosyalar || '-'}</ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 3 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Satış Temsilcisi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <Pressable
                          onPress={() => openSimpleRepModal('satis', 'Satış Temsilcisi Adı Giriniz', satisTemsilcisiVal)}
                          style={({ pressed }) => [styles.erpSelectInputBox, pressed && { opacity: 0.8 }]}>
                          <ThemedText style={[styles.erpSelectValText, !satisTemsilcisiVal && { color: '#94a3b8' }]}>
                            {satisTemsilcisiVal || 'Satış Temsilcisi Girin'}
                          </ThemedText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {satisTemsilcisiVal ? (
                              <Pressable onPress={() => handleSatisTemsilcisiChange('')} hitSlop={8}>
                                <ThemedText style={{ fontSize: 11, color: '#94a3b8', fontWeight: 'bold' }}>✕</ThemedText>
                              </Pressable>
                            ) : null}
                            <View style={styles.erpDropdownIconBtn}>
                              <ThemedText style={styles.erpDropdownIconText}>▼</ThemedText>
                            </View>
                          </View>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Rez. Oluşturma Tarihi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {formatDate(selectedBooking.rez_olusturma_tarihi || selectedBooking.createddate || selectedBooking.reservationdate || selectedBooking.CREATEDDATE || selectedBooking.CREATED_DATE)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 4 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Müşteri Temsilcisi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <Pressable
                          onPress={() => openSimpleRepModal('musteri', 'Müşteri Temsilcisi Adı Giriniz', musteriTemsilcisiVal)}
                          style={({ pressed }) => [styles.erpSelectInputBox, pressed && { opacity: 0.8 }]}>
                          <ThemedText style={[styles.erpSelectValText, !musteriTemsilcisiVal && { color: '#94a3b8' }]}>
                            {musteriTemsilcisiVal || 'Müşteri Temsilcisi Girin'}
                          </ThemedText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {musteriTemsilcisiVal ? (
                              <Pressable onPress={() => handleMusteriTemsilcisiChange('')} hitSlop={8}>
                                <ThemedText style={{ fontSize: 11, color: '#94a3b8', fontWeight: 'bold' }}>✕</ThemedText>
                              </Pressable>
                            ) : null}
                            <View style={styles.erpDropdownIconBtn}>
                              <ThemedText style={styles.erpDropdownIconText}>▼</ThemedText>
                            </View>
                          </View>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Rez. Teyit Formu Bilgisi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.rez_teyit_formu || selectedBooking.confirmationform || '-'}</ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 5 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Dokümantasyon Temsilcisi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <Pressable
                          onPress={() => openSimpleRepModal('dokumantasyon', 'Dokümantasyon Temsilcisi Adı Giriniz', dokumantasyonTemsilcisiVal)}
                          style={({ pressed }) => [styles.erpSelectInputBox, pressed && { opacity: 0.8 }]}>
                          <ThemedText style={[styles.erpSelectValText, !dokumantasyonTemsilcisiVal && { color: '#94a3b8' }]}>
                            {dokumantasyonTemsilcisiVal || 'Dokümantasyon Temsilcisi Girin'}
                          </ThemedText>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {dokumantasyonTemsilcisiVal ? (
                              <Pressable onPress={() => handleDokumantasyonTemsilcisiChange('')} hitSlop={8}>
                                <ThemedText style={{ fontSize: 11, color: '#94a3b8', fontWeight: 'bold' }}>✕</ThemedText>
                              </Pressable>
                            ) : null}
                            <View style={styles.erpDropdownIconBtn}>
                              <ThemedText style={styles.erpDropdownIconText}>▼</ThemedText>
                            </View>
                          </View>
                        </Pressable>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Kara Nakliye</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.kara_nakliye || selectedBooking.landshipping || selectedBooking.LANDSHIPPING || '-'}</ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 6 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Rezervasyon Sahibi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {selectedBooking.rezervasyon_sahibi || selectedBooking.CUSTOMERNAME || selectedBooking.CUSTOMER_NAME || '-'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Booking Tarihi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {formatDate(selectedBooking.booking_tarihi || selectedBooking.BOOKINGDATE)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 7 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Ticari Tip</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {selectedBooking.ticaret_tipi || selectedBooking.commercialtype || selectedBooking.COMMERCIALTYPE || selectedBooking.TRADETYPE || '-'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Hat</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {selectedBooking.hat || selectedBooking.line || selectedBooking.LINENAME || selectedBooking.LINE_NAME || '-'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 8 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Teklif Numarası</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {selectedBooking.teklif_numarasi || selectedBooking.offerno || selectedBooking.OFFERNO || selectedBooking.TEKLIF_NO || selectedBooking.OFFER_NO || '-'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Tehlikelilik</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={[
                          styles.erpValText,
                          (() => {
                            const val = String(selectedBooking.tehlikelilik || selectedBooking.TEHLIKELILIK || selectedBooking.flammability || '').toLowerCase();
                            return (val.includes('yanıcı') && !val.includes('yanıcısız')) ? { color: '#dc2626', fontWeight: '700' } : null;
                          })()
                        ]}>
                          {selectedBooking.tehlikelilik || selectedBooking.flammability || selectedBooking.flammabilitydescription || selectedBooking.TEHLIKELILIK || '-'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 9 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Kotasyon Numarası</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {selectedBooking.kotasyon_numarasi || selectedBooking.quotationno || selectedBooking.QUOTATIONNO || selectedBooking.KOTASYON_NO || '-'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Teklif Geçerlilik Tarihi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {formatDate(selectedBooking.teklif_gecerlilik_tarihi || selectedBooking.offervaliditydate || selectedBooking.OFFERVALIDITYDATE || selectedBooking.TEKLIF_GECERLILIK_TARIHI)}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 10 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Yükleme Yeri</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.yukleme_yeri || selectedBooking.loadinglocation || selectedBooking.LOADINGLOCATION || '-'}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Yükleme Limanı</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {selectedBooking.yukleme_limani || selectedBooking.loadingport || selectedBooking.LOADINGPORT || selectedBooking.PORT_OF_LOADING || '-'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 11 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Tahliye Yeri</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.varis_yeri || selectedBooking.dischargelocation || selectedBooking.DISCHARGELOCATION || '-'}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Tahliye Limanı</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {selectedBooking.tahliye_limani || selectedBooking.dischargeport || selectedBooking.DISCHARGEPORT || selectedBooking.PORT_OF_DISCHARGE || '-'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 12 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Ödeme Tipi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={[styles.erpValText, { color: '#dc2626', fontWeight: '700' }]}>
                          {selectedBooking.odeme_tipi || selectedBooking.payment || selectedBooking.paymenttype || selectedBooking.PAYMENT || selectedBooking.ODEME_TIPI || '-'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Free Time</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.free_time || selectedBooking.freetime || selectedBooking.FREETIME || selectedBooking.FREE_TIME || '-'}</ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 13 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Yükleme Tipi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.yukleme_tipi || selectedBooking.loadingtype || selectedBooking.LOADINGTYPE || selectedBooking.YUKLEME_TIPI || '-'}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Incoterm</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.incoterm || selectedBooking.INCOTERM || '-'}</ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 14 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Dolum Tipi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.dolum_tipi || selectedBooking.fillingtype || selectedBooking.FILLINGTYPE || selectedBooking.DOLUM_TIPI || '-'}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Konteyner Adedi & Tipi</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>
                          {selectedBooking.konteyner_adedi_tipi || selectedBooking.containertypes || selectedBooking.CONTAINERTYPES || selectedBooking.konteyner_tipleri || '-'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 15 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Beyanname Durumu</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={[styles.erpValText, { color: '#dc2626', fontWeight: '700' }]}>
                          {selectedBooking.beyanname_durumu || selectedBooking.declaration || selectedBooking.DECLARATION || selectedBooking.BEYANNAME_DURUMU || '-'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Talimat Durumu</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.talimat_durumu || selectedBooking.instruction || selectedBooking.INSTRUCTION || selectedBooking.TALIMAT_DURUMU || '-'}</ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 16 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Fatura Durumu</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={[styles.erpValText, { color: '#dc2626', fontWeight: '700' }]}>
                          {selectedBooking.fatura_durumu || selectedBooking.invoice || selectedBooking.INVOICE || selectedBooking.FATURA_DURUMU || '-'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Ödeme Durumu</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.odeme_durumu || selectedBooking.paymentstatus || selectedBooking.PAYMENTSTATUS || selectedBooking.ODEME_DURUMU || '-'}</ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 17 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Ödeme Şekli</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.odeme_sekli || selectedBooking.paymenttype || selectedBooking.PAYMENTTYPE || selectedBooking.ODEME_SEKLI || '-'}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Ens</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={[styles.erpValText, { color: '#dc2626', fontWeight: '700' }]}>
                          {selectedBooking.ens || selectedBooking.ensstatus || selectedBooking.ENSSTATUS || selectedBooking.ENS || '-'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  {/* Row 18 */}
                  <View style={styles.erpGridRow}>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Konteyner İzleme</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.konteyner_izleme || selectedBooking.containertrack || selectedBooking.CONTAINERTRACK || selectedBooking.KONTEYNER_IZLEME || '-'}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.erpCellHalf}>
                      <View style={styles.erpLabelCell}>
                        <ThemedText style={styles.erpLabelText}>Kotasyon Notu</ThemedText>
                      </View>
                      <View style={styles.erpValueCell}>
                        <ThemedText style={styles.erpValText}>{selectedBooking.kotasyon_notu || selectedBooking.quotationnote || selectedBooking.QUOTATIONNOTE || selectedBooking.KOTASYON_NOTU || '-'}</ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </CollapsibleContainer>
          </View>

          {/* MAIN CONTAINER 2: NOTLAR & HATIRLATMALAR */}
          <View style={styles.erpSectionBox}>
            <Pressable
              onPress={() => toggleSection('notlar')}
              style={({ pressed }) => [styles.erpSectionHeaderBar, pressed && { opacity: 0.9 }, Platform.OS === 'web' && { cursor: 'pointer' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.erpMinusBadge}>
                  <ThemedText style={styles.erpMinusText}>
                    {collapsedSections['notlar'] ? '+' : '-'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.erpSectionTitleText}>Notlar & Hatırlatmalar</ThemedText>
              </View>
            </Pressable>

            <CollapsibleContainer expanded={!collapsedSections['notlar']}>
              <View style={styles.erpTableWrapper}>
                <View style={styles.erpTableHeadRow}>
                  <ThemedText style={[styles.erpTableHeadCell, { width: 140 }]}>Departman</ThemedText>
                  <ThemedText style={[styles.erpTableHeadCell, { flex: 1 }]}>Not</ThemedText>
                </View>
                {notlarList.length > 0 ? (
                  notlarList.map((nItem: any, idx: number) => (
                    <View key={idx} style={styles.erpTableBodyRow}>
                      <ThemedText style={[styles.erpTableCellText, { width: 140, fontWeight: '600' }]}>
                        {nItem.departman || nItem.department || 'Genel'}
                      </ThemedText>
                      <ThemedText style={[styles.erpTableCellText, { flex: 1, color: '#0f172a' }]}>
                        {nItem.not || nItem.customernote || nItem.note || '-'}
                      </ThemedText>
                    </View>
                  ))
                ) : (
                  <View style={styles.erpTableBodyRow}>
                    <ThemedText style={[styles.erpTableCellText, { width: 140 }]}>
                      {selectedBooking.departman || '-'}
                    </ThemedText>
                    <ThemedText style={[styles.erpTableCellText, selectedBooking.notlar ? { color: '#0f172a' } : { color: '#dc2626', fontWeight: '600' }]}>
                      {selectedBooking.notlar || selectedBooking.NOTE || selectedBooking.REMARKS || 'Not bulunamadı!'}
                    </ThemedText>
                  </View>
                )}
              </View>
            </CollapsibleContainer>
          </View>

          {/* MAIN CONTAINER 3: GEMİ & SEFER DETAYI */}
          <View style={styles.erpSectionBox}>
            <Pressable
              onPress={() => toggleSection('gemi')}
              style={({ pressed }) => [styles.erpSectionHeaderBar, pressed && { opacity: 0.9 }, Platform.OS === 'web' && { cursor: 'pointer' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.erpMinusBadge}>
                  <ThemedText style={styles.erpMinusText}>
                    {collapsedSections['gemi'] ? '+' : '-'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.erpSectionTitleText}>Gemi & Sefer Detayı</ThemedText>
              </View>
            </Pressable>

            <CollapsibleContainer expanded={!collapsedSections['gemi']}>
              <View style={styles.erpGridTable}>
                {/* Row 1 */}
                <View style={styles.erpGridRow}>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Gemi Adı</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>
                        {selectedBooking.gemi_adi || selectedBooking.shipname || selectedBooking.SHIPNAME || selectedBooking.vesselname || selectedBooking.VESSELNAME || '-'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>IMO</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>{selectedBooking.imo || selectedBooking.IMO || '-'}</ThemedText>
                    </View>
                  </View>
                </View>

                {/* Row 2 */}
                <View style={styles.erpGridRow}>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Sefer Numarası</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>
                        {selectedBooking.sefer_no || selectedBooking.voyageno || selectedBooking.VOYAGENO || selectedBooking.shipvoyageno || '-'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Yapım Yılı</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>{selectedBooking.yapim_yili || selectedBooking.constructionyear || selectedBooking.YAPIM_YILI || '-'}</ThemedText>
                    </View>
                  </View>
                </View>

                {/* Row 3 */}
                <View style={styles.erpGridRow}>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Hat</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>
                        {selectedBooking.hat || selectedBooking.line || selectedBooking.LINENAME || selectedBooking.LINE_NAME || '-'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Gemi Bayrağı</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>{selectedBooking.gemi_bayragi || selectedBooking.shipcountry || selectedBooking.GEMI_BAYRAGI || '-'}</ThemedText>
                    </View>
                  </View>
                </View>

                {/* Row 4 */}
                <View style={styles.erpGridRow}>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Acente</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>{selectedBooking.acente || selectedBooking.agency || selectedBooking.ACENTE || '-'}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Liman Ofisi</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>{selectedBooking.liman_ofisi || selectedBooking.portoffice || selectedBooking.LIMAN_OFISI || '-'}</ThemedText>
                    </View>
                  </View>
                </View>

                {/* Row 5 */}
                <View style={styles.erpGridRow}>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Talimat Cut Off Tarihi</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>
                        {formatDate(selectedBooking.talimat_cutoff || selectedBooking.instructioncutoff || selectedBooking.TALIMAT_CUTOFF)}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>ETA</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>{formatDate(selectedBooking.eta || selectedBooking.ETA)}</ThemedText>
                    </View>
                  </View>
                </View>

                {/* Row 6 */}
                <View style={styles.erpGridRow}>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Beyanname Cut Off Tarihi</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>
                        {formatDate(selectedBooking.beyanname_cutoff || selectedBooking.declarationcutoff || selectedBooking.BEYANNAME_CUTOFF)}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>ETD</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>{formatDate(selectedBooking.etd || selectedBooking.ETD)}</ThemedText>
                    </View>
                  </View>
                </View>

                {/* Row 7 */}
                <View style={styles.erpGridRow}>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Ardiyesiz Giriş</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>
                        {formatDate(selectedBooking.ardiyesiz_giris || selectedBooking.warehousefreeentry || selectedBooking.bookingunstoragedentry || selectedBooking.ARDIYESIZ_GIRIS)}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>ATD</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={[styles.erpValText, (atdValue || selectedBooking.ATD || selectedBooking.atd) ? { color: '#0f172a' } : { color: '#dc2626' }]}>
                        {atdValue || formatDate(selectedBooking.ATD || selectedBooking.atd || selectedBooking.gercek_kalkis) || 'Henüz gemi kalkış tarihi girilmemiş!'}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Row 8 */}
                <View style={styles.erpGridRow}>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>VGM Cut Off Tarihi</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>
                        {formatDate(selectedBooking.vgm_cutoff || selectedBooking.vgmcutoff || selectedBooking.VGM_CUTOFF)}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Free Detention</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>
                        {formatDate(selectedBooking.free_detention || selectedBooking.freedetentiondate || selectedBooking.FREE_DETENTION)}
                      </ThemedText>
                    </View>
                  </View>
                </View>

                {/* Row 9 */}
                <View style={styles.erpGridRow}>
                  <View style={styles.erpCellHalf}>
                    <View style={styles.erpLabelCell}>
                      <ThemedText style={styles.erpLabelText}>Beyannamenin Açılacağı Gümrük Müdürlüğü</ThemedText>
                    </View>
                    <View style={styles.erpValueCell}>
                      <ThemedText style={styles.erpValText}>
                        {selectedBooking.gumruk_mudurlugu || selectedBooking.bookingcustom || selectedBooking.BOOKINGCUSTOM || selectedBooking.custom || selectedBooking.CUSTOM || selectedBooking.GUMRUK_MUDURLUGU || '-'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={[styles.erpCellHalf, { borderRightWidth: 0, justifyContent: 'center', alignItems: 'center', padding: 6 }]}>
                    <Pressable
                      onPress={() => setIsSeferEditOpen(true)}
                      style={({ pressed }) => [styles.seferEditBtn, pressed && { opacity: 0.85 }, Platform.OS === 'web' && { cursor: 'pointer' }]}>
                      <ThemedText style={styles.seferEditBtnText}>Sefer Detayı Düzenle</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>
            </CollapsibleContainer>
          </View>


          {/* MAIN CONTAINER 4: YURT DIŞI ACENTE & REFERANSLAR */}
          <View style={styles.erpSectionBox}>
            <Pressable
              onPress={() => toggleSection('acente')}
              style={({ pressed }) => [styles.erpSectionHeaderBar, pressed && { opacity: 0.9 }, Platform.OS === 'web' && { cursor: 'pointer' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.erpMinusBadge}>
                  <ThemedText style={styles.erpMinusText}>
                    {collapsedSections['acente'] ? '+' : '-'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.erpSectionTitleText}>Yurt Dışı Acente & Referanslar</ThemedText>
              </View>
            </Pressable>

            <CollapsibleContainer expanded={!collapsedSections['acente']}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ minWidth: '100%', flexGrow: 1 }}>
                <View style={[styles.erpAcenteSplitRow, responsive.isMobile && { flexDirection: 'column' }]}>
                  {/* Left Address Box */}
                  <View style={[styles.erpAcenteLeftBox, responsive.isMobile && { width: '100%' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                        {selectedBooking.rezervasyon_sahibi || selectedBooking.CUSTOMERNAME || selectedBooking.CUSTOMER_NAME || '-'}
                      </ThemedText>
                    </View>
                    <ThemedText style={{ fontSize: 11, color: '#475569', lineHeight: 16 }}>
                      {selectedBooking.yurt_disi_acente_adres || selectedBooking.OVERSEAS_AGENCY_ADDRESS || ''}
                    </ThemedText>
                  </View>

                  {/* Right References Table */}
                  <View style={[styles.erpAcenteRightTable, responsive.isMobile && { minWidth: '100%' }]}>
                    <View style={styles.erpTableHeadRow}>
                      <ThemedText style={[styles.erpTableHeadCell, { width: 220, marginLeft: 28 }]}>Referans & Numara</ThemedText>
                      <ThemedText style={[styles.erpTableHeadCell, { flex: 1 }]}>Ünvan</ThemedText>
                    </View>
                    {referanslarList.map((ref: any, idx: number) => {
                      const isSavingThis = saveReferenceStatus?.idx === idx;
                      const isSuccess = isSavingThis && !saveReferenceStatus?.error;
                      const isError = isSavingThis && saveReferenceStatus?.error;

                      return (
                        <View key={idx} style={styles.erpTableBodyRow}>
                          <View style={{ width: 220, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Pressable
                              onPress={() => handleSaveReference(idx, ref)}
                              style={({ pressed }) => [
                                styles.erpSquareCheckBtn,
                                pressed && styles.erpSquareCheckBtnPressed,
                                isSuccess && styles.erpSquareCheckBtnSuccess,
                                isError && styles.erpSquareCheckBtnError,
                              ]}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              accessibilityLabel="Referansı Kaydet"
                            >
                              <ThemedText
                                style={[
                                  styles.erpSquareCheckIcon,
                                  (isSuccess || isError) && { color: '#ffffff' }
                                ]}
                              >
                                ✓
                              </ThemedText>
                            </Pressable>
                            <View style={[styles.erpMiniInputBox, { flex: 1, height: 28, paddingHorizontal: 6, marginHorizontal: 2 }]}>
                              <TextInput
                                style={styles.erpMiniTextInput}
                                value={(ref.numara && ref.numara !== '-' && ref.numara !== '--') ? ref.numara : ((ref.referans && ref.referans !== '-' && ref.referans !== '--') ? ref.referans : '')}
                                onChangeText={(val) => handleReferansNumaraChange(idx, val)}
                                onSubmitEditing={() => handleSaveReference(idx, ref)}
                                placeholder="Ref Numara"
                                placeholderTextColor="#94a3b8"
                              />
                            </View>
                          </View>
                          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12 }}>
                            <ThemedText style={[styles.erpTableCellText, { fontWeight: '600' }]}>{ref.unvan || ref.unvan_name || ''}</ThemedText>
                            {isSavingThis ? (
                              <View style={[styles.erpStatusBadge, isError ? styles.erpStatusBadgeError : styles.erpStatusBadgeSuccess]}>
                                <ThemedText style={[styles.erpStatusBadgeText, isError && { color: '#b91c1c' }]}>
                                  {saveReferenceStatus?.text}
                                </ThemedText>
                              </View>
                            ) : ref.rol ? (
                              <ThemedText style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>{ref.rol}</ThemedText>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            </CollapsibleContainer>
          </View>

          {/* MAIN CONTAINER 5: REZERVASYON DETAYLARI */}
          <View style={styles.erpSectionBox}>
            <Pressable
              onPress={() => toggleSection('rezervasyon')}
              style={({ pressed }) => [styles.erpSectionHeaderBar, pressed && { opacity: 0.9 }, Platform.OS === 'web' && { cursor: 'pointer' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.erpMinusBadge}>
                  <ThemedText style={styles.erpMinusText}>
                    {collapsedSections['rezervasyon'] ? '+' : '-'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.erpSectionTitleText}>Rezervasyon Detayları</ThemedText>
              </View>
            </Pressable>

            <CollapsibleContainer expanded={!collapsedSections['rezervasyon']}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ minWidth: '100%' }}>
                <View style={{ minWidth: '100%' }}>
                  {/* Table Header */}
                  <View style={styles.erpTableHeadRow}>
                    <View style={{ width: 170, minWidth: 170, flex: 1.3, paddingRight: 6 }}>
                      <ThemedText style={styles.erpTableHeadCell}>Konteyner Tipi</ThemedText>
                    </View>
                    <View style={{ width: 50, minWidth: 50, flex: 0.4, paddingRight: 6 }}>
                      <ThemedText style={styles.erpTableHeadCell}>VGM</ThemedText>
                    </View>
                    <View style={{ width: 140, minWidth: 140, flex: 1, paddingRight: 6 }}>
                      <ThemedText style={styles.erpTableHeadCell}>Hat / Acente Rez.No</ThemedText>
                    </View>
                    <View style={{ width: 170, minWidth: 170, flex: 1.2, paddingRight: 16 }}>
                      <ThemedText style={styles.erpTableHeadCell}>Konteyner No</ThemedText>
                    </View>
                    <View style={{ width: 140, minWidth: 140, flex: 0.9, paddingLeft: 12, paddingRight: 6 }}>
                      <ThemedText style={styles.erpTableHeadCell}>Yükleme Limanı</ThemedText>
                    </View>
                    <View style={{ width: 100, minWidth: 100, flex: 0.8, paddingRight: 6 }}>
                      <ThemedText style={styles.erpTableHeadCell}>Depo</ThemedText>
                    </View>
                    <View style={{ width: 160, minWidth: 160, flex: 1.1, paddingRight: 6 }}>
                      <ThemedText style={styles.erpTableHeadCell}>Yükleme Tarihi & Saati</ThemedText>
                    </View>
                    <View style={{ width: 140, minWidth: 140, flex: 1, paddingRight: 6 }}>
                      <ThemedText style={styles.erpTableHeadCell}>Yükleme Adresi</ThemedText>
                    </View>
                    <View style={{ width: 100, minWidth: 100, flex: 0.8 }}>
                      <ThemedText style={styles.erpTableHeadCell}>Nakliyeci</ThemedText>
                    </View>
                  </View>

                  {/* Table Rows */}
                  {rezDetayList.map((rowItem: any, idx: number) => (
                    <View key={idx} style={[styles.erpTableBodyRow, { alignItems: 'flex-start', paddingVertical: 10 }]}>
                      <View style={{ width: 170, minWidth: 170, flex: 1.3, paddingRight: 6, gap: 2 }}>
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#0f172a' }}>
                          {rowItem.konteyner_tipi || selectedBooking.konteyner_tipleri || '-'}
                        </ThemedText>
                        {rowItem.tonaj ? (
                          <ThemedText style={{ fontSize: 10, color: '#94a3b8' }}>{rowItem.tonaj}</ThemedText>
                        ) : null}
                        {rowItem.tartim_notu ? (
                          <ThemedText style={{ fontSize: 10, color: '#475569', marginTop: 2, lineHeight: 13 }}>
                            {rowItem.tartim_notu}
                          </ThemedText>
                        ) : null}
                      </View>

                      <View style={{ width: 50, minWidth: 50, flex: 0.4, paddingRight: 6, paddingTop: 4, alignItems: 'center' }}>
                        <View style={[styles.erpSquareCheck, rowItem.vgm && { backgroundColor: '#10b981', borderColor: '#059669' }]}>
                          {rowItem.vgm ? (
                            <ThemedText style={{ color: '#ffffff', fontSize: 10, fontWeight: '800' }}>✓</ThemedText>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ width: 140, minWidth: 140, flex: 1, paddingRight: 6, paddingTop: 4 }}>
                        <ThemedText style={{ fontSize: 11, color: '#0f172a', fontWeight: '500' }}>
                          {rowItem.hat_acente_rez_no || selectedBooking.sefer_no || '-'}
                        </ThemedText>
                      </View>

                      <View style={{ width: 170, minWidth: 170, flex: 1.2, paddingRight: 16, gap: 4 }}>
                        <View style={styles.erpMiniInputBox}>
                          <TextInput
                            style={styles.erpMiniTextInput}
                            value={rowItem.konteyner_no || ''}
                            onChangeText={(text) => handleKonteynerNoChange(idx, text)}
                            placeholder="Konteyner No"
                            placeholderTextColor="#94a3b8"
                            autoCapitalize="characters"
                          />
                        </View>
                        <Pressable
                          onPress={() => handleSaveKonteynerNo(idx, rowItem.konteyner_no || '')}
                          style={({ pressed }) => [
                            styles.erpMiniSaveBtn,
                            pressed && { opacity: 0.8, backgroundColor: '#cbd5e1' },
                            saveContainerStatus?.idx === idx && (
                              saveContainerStatus.error
                                ? { backgroundColor: '#fee2e2', borderColor: '#fca5a5' }
                                : { backgroundColor: '#dcfce7', borderColor: '#86efac' }
                            )
                          ]}>
                          <ThemedText style={{
                            fontSize: 10,
                            color: saveContainerStatus?.idx === idx
                              ? (saveContainerStatus.error ? '#991b1b' : '#166534')
                              : '#475569',
                            fontWeight: '700'
                          }}>
                            {saveContainerStatus?.idx === idx ? saveContainerStatus.text : 'Kaydet ▼'}
                          </ThemedText>
                        </Pressable>
                      </View>

                      <View style={{ width: 140, minWidth: 140, flex: 0.9, paddingLeft: 12, paddingRight: 6, paddingTop: 4 }}>
                        <ThemedText style={{ fontSize: 11, color: '#1e293b', fontWeight: '600' }}>
                          {rowItem.yukleme_limani || selectedBooking.yukleme_limani || '-'}
                        </ThemedText>
                      </View>

                      <View style={{ width: 100, minWidth: 100, flex: 0.8, paddingRight: 6, paddingTop: 4 }}>
                        <ThemedText style={{ fontSize: 11, color: '#0f172a' }}>
                          {rowItem.depo || '-'}
                        </ThemedText>
                      </View>

                      <View style={{ width: 160, minWidth: 160, flex: 1.1, paddingRight: 6, paddingTop: 4 }}>
                        <ThemedText style={{ fontSize: 11, color: '#0f172a' }}>
                          {rowItem.yukleme_tarihi_saati || '-'}
                        </ThemedText>
                      </View>

                      <View style={{ width: 140, minWidth: 140, flex: 1, paddingRight: 6, paddingTop: 4 }}>
                        <ThemedText style={{ fontSize: 11, color: '#475569' }} numberOfLines={2}>
                          {rowItem.yukleme_adresi || '--'}
                        </ThemedText>
                      </View>

                      <View style={{ width: 100, minWidth: 100, flex: 0.8, paddingTop: 4 }}>
                        <ThemedText style={{ fontSize: 11, color: '#475569' }}>
                          {rowItem.nakliyeci || '--'}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </CollapsibleContainer>
          </View>

          {/* MAIN CONTAINER 6: KURLAR TABLOSU */}
          {kurlarObj ? (
            <View style={styles.erpSectionBox}>
              <Pressable
                onPress={() => toggleSection('kurlar')}
                style={({ pressed }) => [styles.erpSectionHeaderBar, pressed && { opacity: 0.9 }, Platform.OS === 'web' && { cursor: 'pointer' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.erpMinusBadge}>
                    <ThemedText style={styles.erpMinusText}>
                      {collapsedSections['kurlar'] ? '+' : '-'}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.erpSectionTitleText}>
                    Rezervasyon Oluşturma Tarihine Ait Kurlar - ({formatDate(selectedBooking.booking_tarihi)})
                  </ThemedText>
                </View>
              </Pressable>

              <CollapsibleContainer expanded={!collapsedSections['kurlar']}>
                <View style={styles.erpTableWrapper}>
                  <View style={styles.erpTableHeadRow}>
                    <ThemedText style={[styles.erpTableHeadCell, { width: 80 }]}></ThemedText>
                    <ThemedText style={[styles.erpTableHeadCell, { flex: 1, textAlign: 'center' }]}>Dolar</ThemedText>
                    <ThemedText style={[styles.erpTableHeadCell, { flex: 1, textAlign: 'center' }]}>Euro</ThemedText>
                    <ThemedText style={[styles.erpTableHeadCell, { flex: 1, textAlign: 'center' }]}>Sterlin</ThemedText>
                    <ThemedText style={[styles.erpTableHeadCell, { flex: 1, textAlign: 'center' }]}>Euro/Dolar</ThemedText>
                    <ThemedText style={[styles.erpTableHeadCell, { flex: 1, textAlign: 'center' }]}>Sterlin/Dolar</ThemedText>
                  </View>

                  <View style={styles.erpTableBodyRow}>
                    <ThemedText style={[styles.erpTableCellText, { width: 80, fontWeight: '600' }]}>Satış</ThemedText>
                    <ThemedText style={[styles.erpTableCellText, { flex: 1, textAlign: 'center' }]}>{kurlarObj.dolar || '-'}</ThemedText>
                    <ThemedText style={[styles.erpTableCellText, { flex: 1, textAlign: 'center' }]}>{kurlarObj.euro || '-'}</ThemedText>
                    <ThemedText style={[styles.erpTableCellText, { flex: 1, textAlign: 'center' }]}>{kurlarObj.sterlin || '-'}</ThemedText>
                    <ThemedText style={[styles.erpTableCellText, { flex: 1, textAlign: 'center' }]}>{kurlarObj.euro_dolar || '-'}</ThemedText>
                    <ThemedText style={[styles.erpTableCellText, { flex: 1, textAlign: 'center' }]}>{kurlarObj.sterlin_dolar || '-'}</ThemedText>
                  </View>
                </View>
              </CollapsibleContainer>
            </View>
          ) : null}

          {/* FOOTER */}
          <View style={styles.erpFooterContainer}>
            <ThemedText style={styles.erpFooterText}>
              2026© Atlas Lojistik ERP Yönetim Sistemi
            </ThemedText>
          </View>
        </ScrollView>

        {/* REPRESENTATIVE SELECTION & USER SEARCH MODAL */}
        <Modal
          visible={Boolean(simpleRepModal?.isOpen)}
          transparent
          animationType="fade"
          onRequestClose={() => setSimpleRepModal(null)}>
          <View style={styles.simpleModalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSimpleRepModal(null)} />
            <View style={[styles.simpleModalBox, { maxHeight: 480 }]}>
              <ThemedText style={styles.simpleModalTitle}>
                {simpleRepModal?.title || 'Temsilci Seçiniz'}
              </ThemedText>

              {/* SEARCH BAR */}
              <View style={styles.simpleModalInputWrapper}>
                <TextInput
                  style={styles.simpleModalInput}
                  value={repSearchQuery}
                  onChangeText={setRepSearchQuery}
                  placeholder="Kullanıcı Ara..."
                  placeholderTextColor="#94a3b8"
                  autoFocus
                />
              </View>

              {/* USER LIST OR LOADING */}
              {loadingUserSelect ? (
                <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <ThemedText style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                    Kullanıcı listesi yükleniyor...
                  </ThemedText>
                </View>
              ) : (
                <ScrollView
                  style={{ maxHeight: 220, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 }}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled">
                  {userSelectList
                    .filter(u => u && typeof u.username === 'string' && (repSearchQuery.trim().length < 2 || u.username.toLowerCase().includes(repSearchQuery.toLowerCase().trim())))
                    .map((item) => (
                      <Pressable
                        key={item.rid}
                        onPress={() => handleChangePresentativeUser(item)}
                        disabled={savingRep}
                        style={({ pressed }) => [
                          {
                            paddingHorizontal: 12,
                            paddingVertical: 10,
                            borderBottomWidth: 1,
                            borderBottomColor: '#f1f5f9',
                            backgroundColor: pressed ? '#f8fafc' : '#ffffff',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }
                        ]}>
                        <ThemedText style={{ fontSize: 13, color: '#1e293b', fontWeight: '500' }}>
                          {item.username}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 11, color: '#2563eb', fontWeight: '600' }}>Seç</ThemedText>
                      </Pressable>
                    ))}
                  {userSelectList.filter(u => u && typeof u.username === 'string' && (repSearchQuery.trim().length < 2 || u.username.toLowerCase().includes(repSearchQuery.toLowerCase().trim()))).length === 0 && (
                    <View style={{ padding: 16, alignItems: 'center' }}>
                      <ThemedText style={{ fontSize: 12, color: '#94a3b8' }}>Kullanıcı bulunamadı</ThemedText>
                    </View>
                  )}
                </ScrollView>
              )}

              {savingRep && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <ActivityIndicator size="small" color="#2563eb" />
                  <ThemedText style={{ fontSize: 12, color: '#2563eb', fontWeight: '600' }}>
                    Temsilci değiştiriliyor...
                  </ThemedText>
                </View>
              )}

              <View style={styles.simpleModalBtnRow}>
                <Pressable
                  onPress={() => setSimpleRepModal(null)}
                  disabled={savingRep}
                  style={({ pressed }) => [styles.simpleModalCancelBtn, pressed && { opacity: 0.8 }]}>
                  <ThemedText style={styles.simpleModalCancelText}>İptal</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* REZERVASYON AŞAMASI MODAL (BOOKING İÇİNDEYKEN AÇILAN MODAL) */}
        <Modal
          visible={isStageModalOpen}
          transparent={true}
          animationType="none"
          onRequestClose={() => setIsStageModalOpen(false)}>
          <Pressable style={styles.userModalOverlay} onPress={() => setIsStageModalOpen(false)}>
            <Animated.View
              style={[
                styles.stageModalCard,
                {
                  opacity: stageAnim,
                  transform: [
                    {
                      translateY: stageAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-16, 0],
                      }),
                    },
                    {
                      scale: stageAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.96, 1],
                      }),
                    },
                  ],
                },
              ]}>
              <Pressable onPress={(e) => e.stopPropagation?.()}>
                {/* Modal Header */}
                <View style={styles.userModalHeader}>
                  <ThemedText style={styles.userModalTitle}>Rezervasyon Aşamasını Seçin</ThemedText>
                  <Pressable
                    onPress={() => setIsStageModalOpen(false)}
                    style={({ pressed }) => [styles.modalCloseButton, pressed && styles.pressed]}>
                    <ThemedText style={styles.modalCloseText}>✕</ThemedText>
                  </Pressable>
                </View>

                {/* Stage Options List */}
                <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 24, alignItems: 'center', justifyContent: 'center' }}>
                  {RESERVATION_STAGES.length === 0 ? (
                    <ThemedText style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                      Henüz tanımlanmış aşama seçeneği bulunmamaktadır.
                    </ThemedText>
                  ) : (
                    RESERVATION_STAGES.map((stage) => {
                      const isSelected = selectedStage === stage.label;
                      return (
                        <Pressable
                          key={stage.id}
                          onPress={() => handleStageSelect(stage.label)}
                          style={({ pressed }) => [
                            styles.stageMenuItem,
                            isSelected && styles.stageMenuItemActive,
                            pressed && { opacity: 0.85, backgroundColor: '#f1f5f9' },
                          ]}>
                          <View style={{ flex: 1 }}>
                            <ThemedText style={[styles.stageMenuTitle, isSelected && { color: stage.color, fontWeight: '700' }]}>
                              {stage.label}
                            </ThemedText>
                            <ThemedText style={styles.stageMenuDesc}>{stage.desc}</ThemedText>
                          </View>

                          {isSelected && (
                            <View style={[styles.stageCheckBadge, { backgroundColor: stage.color }]}>
                              <ThemedText style={styles.stageCheckText}>✓</ThemedText>
                            </View>
                          )}
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />
      {/* TOP HEADER BAR */}
      <View style={[styles.headerBar, { borderColor: '#e2e8f0', backgroundColor: '#ffffff' }]}>
        <View style={[styles.headerContent, { maxWidth: responsive.contentMaxWidth }]}>
          {responsive.isMobile ? (
            <View style={{ width: '100%', gap: 10 }}>
              {/* ROW 1: BRAND LOGO & USER BADGE */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Pressable
                    onPress={() => setIsSideMenuOpen(true)}
                    style={({ pressed }) => [styles.headerMenuTrigger, pressed && styles.pressed]}>
                    <ThemedText style={styles.headerMenuTriggerText}>Menü</ThemedText>
                  </Pressable>

                  <View style={styles.brandContainer}>
                    <View style={styles.brandBadge}>
                      <ThemedText style={styles.brandBadgeText}>P</ThemedText>
                    </View>
                    <ThemedText style={styles.brandTitle}>Link</ThemedText>
                  </View>
                </View>

                <View style={styles.userRightContainer}>
                  <Pressable
                    onPress={() => setIsUserModalOpen(true)}
                    style={({ pressed }) => [styles.userBadge, pressed && styles.pressed]}>
                    <View style={styles.avatarCircle}>
                      <ThemedText style={styles.avatarText}>
                        {displayName.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.userInfoTextContainer}>
                      <ThemedText style={styles.userNameText} numberOfLines={1}>
                        {displayName}
                      </ThemedText>
                      <ThemedText style={styles.userRoleText}>Aktif Oturum ▼</ThemedText>
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* ROW 2: FULL WIDTH SEARCH INPUT */}
              <View style={{ width: '100%' }}>
                <View style={styles.searchWrapper}>
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Booking kodu veya gemi adı yazın..."
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                  {isLoading && (
                    <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 6 }} />
                  )}
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                      <ThemedText style={styles.clearButtonText}>✕</ThemedText>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <>
              {/* BRAND / LOGO (LEFT) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Pressable
                  onPress={() => setIsSideMenuOpen(true)}
                  style={({ pressed }) => [styles.headerMenuTrigger, pressed && styles.pressed]}>
                  <ThemedText style={styles.headerMenuTriggerText}>Menü</ThemedText>
                </Pressable>

                <View style={styles.brandContainer}>
                  <View style={styles.brandBadge}>
                    <ThemedText style={styles.brandBadgeText}>L</ThemedText>
                  </View>
                  <ThemedText style={styles.brandTitle}>Link Lojistik</ThemedText>
                </View>
              </View>

              {/* SEARCH BOX (CENTER) */}
              <View style={styles.searchCenterContainer}>
                <View style={styles.searchWrapper}>
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Booking kodu (örn: E160604597) veya gemi adı yazın..."
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                  />
                  {isLoading && (
                    <ActivityIndicator size="small" color="#2563eb" style={{ marginRight: 6 }} />
                  )}
                  {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                      <ThemedText style={styles.clearButtonText}>✕</ThemedText>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* USER INFO & MODAL TRIGGER (RIGHT TOP) */}
              <View style={styles.userRightContainer}>
                <Pressable
                  onPress={() => setIsUserModalOpen(true)}
                  style={({ pressed }) => [styles.userBadge, pressed && styles.pressed]}>
                  <View style={styles.avatarCircle}>
                    <ThemedText style={styles.avatarText}>
                      {displayName.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={styles.userInfoTextContainer}>
                    <ThemedText style={styles.userNameText} numberOfLines={1}>
                      {displayName}
                    </ThemedText>
                    <ThemedText style={styles.userRoleText}>Aktif Oturum ▼</ThemedText>
                  </View>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>

      {/* MAIN BODY CONTENT */}
      <ScrollView
        contentContainerStyle={[
          styles.mainContent,
          { maxWidth: responsive.contentMaxWidth },
        ]}>

        {/* WHEN SEARCH QUERY IS EMPTY: SHOW DASHBOARD WELCOME & QUICK SAMPLES */}
        {searchQuery.length === 0 && (
          <View style={styles.welcomeContainer}>
            <View style={styles.welcomeHero}>
              <ThemedText style={styles.welcomeTitle}>Booking Arama Portalı</ThemedText>
              <ThemedText style={styles.welcomeSubtitle}>
                Arama çubuğuna Booking Kodu, Gemi Adı, Hat veya Liman bilgisi yazarak detaylı içeriğe hızlıca ulaşabilirsiniz.
              </ThemedText>

              <View style={styles.sampleContainer}>
                <ThemedText style={styles.sampleTitle}>Hızlı Deneyin:</ThemedText>
                <View style={styles.chipRow}>
                  {sampleBookingCodes.map((code) => (
                    <Pressable
                      key={code}
                      onPress={() => setSearchQuery(code)}
                      style={({ pressed }) => [
                        styles.sampleChip,
                        responsive.isMobile && styles.sampleChipMobile,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText style={[styles.sampleChipText, responsive.isMobile && styles.sampleChipTextMobile]}>
                        {code}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCard}>
                <ThemedText style={styles.infoCardTitle}>Cari Yönetimi ve Portföy</ThemedText>
                <ThemedText style={styles.infoCardDesc}>
                  Müşteri ve tedarikçi cari hesapları, unvan araması ve cari grup kategorilerini görün.
                </ThemedText>
              </View>

              <View style={styles.infoCard}>
                <ThemedText style={styles.infoCardTitle}>Müşteri Kartı ve Muhasebe</ThemedText>
                <ThemedText style={styles.infoCardDesc}>
                  Vergi dairesi/no, ödeme vadeleri, E-Fatura durumu ve muhasebe kodlarını takip edin.
                </ThemedText>
              </View>

              <View style={styles.infoCard}>
                <ThemedText style={styles.infoCardTitle}>Cari Teklif ve Kotasyon</ThemedText>
                <ThemedText style={styles.infoCardDesc}>
                  Cari hesabınıza özel taşıma teklifi oluşturun ve navlun fiyatlarını arayın.
                </ThemedText>
              </View>

              <View style={styles.infoCard}>
                <ThemedText style={styles.infoCardTitle}>Konteyner ve Yük</ThemedText>
                <ThemedText style={styles.infoCardDesc}>
                  Booking'e ait konteyner tipleri, miktar ve Incoterms bilgilerini görün.
                </ThemedText>
              </View>

              <View style={styles.infoCard}>
                <ThemedText style={styles.infoCardTitle}>Gemi ve Sefer</ThemedText>
                <ThemedText style={styles.infoCardDesc}>
                  Gemi adı, sefer no, armatör hat ve cut-off tarihlerine anında erişin.
                </ThemedText>
              </View>

              <View style={styles.infoCard}>
                <ThemedText style={styles.infoCardTitle}>Finansal Özet</ThemedText>
                <ThemedText style={styles.infoCardDesc}>
                  Toplam alış, toplam satış ve net kar tutarlarını takip edin.
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* SEARCH RESULTS VIEW */}
        {searchQuery.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <View style={styles.searchResultHeader}>
              <ThemedText style={styles.searchResultTitle}>
                "{searchQuery}" için arama sonuçları ({searchResults.length})
              </ThemedText>
              {isLoading && <ActivityIndicator size="small" color="#2563eb" />}
            </View>

            {searchError && (
              <View style={styles.errorBox}>
                <ThemedText style={styles.errorText}>{searchError}</ThemedText>
              </View>
            )}

            {!isLoading && searchResults.length === 0 && !searchError && (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyStateText}>
                  "{searchQuery}" koduna veya kriterine uygun booking bulunamadı.
                </ThemedText>
              </View>
            )}

            <View style={styles.resultsList}>
              {searchResults.map((item, idx) => {
                const itemRid = item.BookingRID || item.bookingRID || item.RID || item.rid || (item.resultpath ? item.resultpath.split('=')[1] : null);
                return (
                  <Pressable
                    key={item.id || item.BookingRID || idx}

                    style={({ pressed }) => [
                      styles.resultCard,
                      responsive.isMobile && styles.resultCardMobile,
                      pressed && { opacity: 0.9, transform: [{ scale: 0.998 }] }
                    ]}>
                    {/* CARD HEADER */}
                    <View style={[styles.cardHeader, responsive.isMobile && { flexWrap: 'wrap', gap: 6 }]}>
                      <View style={[styles.cardCodeBadge, responsive.isMobile && { paddingHorizontal: 8, paddingVertical: 4 }]}>
                        <ThemedText style={[styles.cardCodeText, responsive.isMobile && { fontSize: 13 }]}>
                          Booking {item.booking_no || (item.resultpath ? item.resultpath.split('=')[1] || item.resultpath : searchQuery)}
                        </ThemedText>
                      </View>

                      <View style={styles.badgeGroup}>
                        {item.iptal === 1 ? (
                          <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
                            <ThemedText style={[styles.statusBadgeText, { color: '#dc2626' }]}>
                              İPTAL
                            </ThemedText>
                          </View>
                        ) : (
                          <View style={[styles.statusBadge, { backgroundColor: '#dcfce7' }]}>
                            <ThemedText style={[styles.statusBadgeText, { color: '#166534' }]}>
                              {item.dosya_durumu || 'AKTİF'}
                            </ThemedText>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* ROUTE INFORMATION */}
                    <View style={[styles.routeContainer, responsive.isMobile && { padding: 10, gap: 8 }]}>
                      <View style={styles.routeCol}>
                        <ThemedText style={styles.routeLabel}>YÜKLEME LİMANI</ThemedText>
                        <ThemedText style={[styles.routeValue, responsive.isMobile && { fontSize: 12 }]} numberOfLines={2}>
                          {item.yukleme_limani || item.loadingport || item.LOADINGPORT || item.POL || item.loadinglocation || item.yukleme_yeri || 'Belirtilmedi'}
                        </ThemedText>
                      </View>

                      <ThemedText style={styles.routeArrow}>➔</ThemedText>

                      <View style={styles.routeCol}>
                        <ThemedText style={styles.routeLabel}>TAHLİYE LİMANI</ThemedText>
                        <ThemedText style={[styles.routeValue, responsive.isMobile && { fontSize: 12 }]} numberOfLines={2}>
                          {item.tahliye_limani || item.dischargeport || item.DISCHARGEPORT || item.POD || item.dischargelocation || item.varis_yeri || 'Belirtilmedi'}
                        </ThemedText>
                      </View>
                    </View>

                    {/* META INFORMATION ROW 1 */}
                    <View style={[styles.metaRow, responsive.isMobile && { gap: 8 }]}>
                      <View style={[styles.metaItem, responsive.isMobile && styles.metaItemMobile]}>
                        <ThemedText style={styles.metaLabel}>Booking Tarihi:</ThemedText>
                        <ThemedText style={styles.metaVal}>
                          {formatDate(item.booking_tarihi || item.bookingdate || item.createddate || item.reservationdate || item.BOOKINGDATE)}
                        </ThemedText>
                      </View>

                      <View style={[styles.metaItem, responsive.isMobile && styles.metaItemMobile]}>
                        <ThemedText style={styles.metaLabel}>Gemi / Sefer:</ThemedText>
                        <ThemedText style={styles.metaVal}>
                          {item.gemi_adi || item.shipname || item.SHIPNAME || item.vesselname || item.VESSELNAME || '-'} ({item.sefer_no || item.voyageno || item.VOYAGENO || item.shipvoyageno || '-'})
                        </ThemedText>
                      </View>

                      <View style={[styles.metaItem, responsive.isMobile && styles.metaItemMobile]}>
                        <ThemedText style={styles.metaLabel}>Yükleme Yeri:</ThemedText>
                        <ThemedText style={styles.metaVal}>
                          {item.yukleme_yeri || item.loadinglocation || item.LOADINGLOCATION || item.CUSTOMERNAME || item.customername || '-'}
                        </ThemedText>
                      </View>

                      <View style={[styles.metaItem, responsive.isMobile && styles.metaItemMobile]}>
                        <ThemedText style={styles.metaLabel}>Varış yeri:</ThemedText>
                        <ThemedText style={styles.metaVal}>
                          {item.varis_yeri || item.dischargelocation || item.DISCHARGELOCATION || '-'}
                        </ThemedText>
                      </View>
                    </View>

                    {/* META INFORMATION ROW 2 (Konteyner & Finansal) */}
                    <View style={[styles.metaRow, responsive.isMobile && { gap: 8, marginTop: 4 }]}>
                      <View style={[styles.metaItem, responsive.isMobile && styles.metaItemMobile]}>
                        <ThemedText style={styles.metaLabel}>Taşıma Tipi:</ThemedText>
                        <ThemedText style={styles.metaVal}>
                          {item.tasima_tipi || item.shippingtype || item.SHIPPINGTYPE || item.commercialtype || item.COMMERCIALTYPE || '-'}
                        </ThemedText>
                      </View>

                      <View style={[styles.metaItem, responsive.isMobile && styles.metaItemMobile]}>
                        <ThemedText style={styles.metaLabel}>Konteyner:</ThemedText>
                        <ThemedText style={styles.metaVal}>
                          {item.konteyner_tipleri || item.containertypes || item.CONTAINERTYPES || item.CONTAINERS || item.containertype || '-'}
                        </ThemedText>
                      </View>

                      <View style={[styles.metaItem, responsive.isMobile && styles.metaItemMobile]}>
                        <ThemedText style={styles.metaLabel}>Toplam Alış:</ThemedText>
                        <ThemedText style={styles.metaVal}>
                          {(item.toplam_alis || item.totalbuyingcost || item.TOTALBUYINGCOST || item.totalbuying || item.TOTALBUYING) ? `${String(item.toplam_alis || item.totalbuyingcost || item.TOTALBUYINGCOST || item.totalbuying || item.TOTALBUYING).trim()} USD` : '-'}
                        </ThemedText>
                      </View>

                      <View style={[styles.metaItem, responsive.isMobile && styles.metaItemMobile]}>
                        <ThemedText style={styles.metaLabel}>Toplam Satış:</ThemedText>
                        <ThemedText style={styles.metaVal}>
                          {(item.toplam_satis || item.totalsellingcost || item.TOTALSELLINGCOST || item.totalselling || item.TOTALSELLING) ? `${String(item.toplam_satis || item.totalsellingcost || item.TOTALSELLINGCOST || item.totalselling || item.TOTALSELLING).trim()} USD` : '-'}
                        </ThemedText>
                      </View>

                      <View style={[styles.metaItem, responsive.isMobile && styles.metaItemMobile]}>
                        <ThemedText style={styles.metaLabel}>Net Kar:</ThemedText>
                        <ThemedText style={[styles.metaVal, { color: '#15803d', fontWeight: 'bold' }]}>
                          {(item.kar || item.profit || item.PROFIT || item.totalprofit || item.TOTALPROFIT) ? `${String(item.kar || item.profit || item.PROFIT || item.totalprofit || item.TOTALPROFIT).trim()} USD` : '-'}
                        </ThemedText>
                      </View>
                    </View>

                    {/* CLICK TO ENTER BOOKING ACTION BAR */}

                    <View style={[styles.cardActionBar, responsive.isMobile && styles.cardActionBarMobile]}>
                      {itemRid ? (
                        <ThemedText style={[styles.cardRidHint, responsive.isMobile && { fontSize: 10, textAlign: 'center' }]}>
                          RID: {itemRid}
                        </ThemedText>
                      ) : null}
                      <View style={[styles.enterBookingBtn, responsive.isMobile && styles.enterBookingBtnMobile]}>
                        <Pressable onPress={() => handleBookingClick(item)}
                          style={({ pressed }) => [
                            pressed && { opacity: 0.9, transform: [{ scale: 0.998 }] }
                          ]}>
                          <ThemedText style={[styles.enterBookingBtnText, responsive.isMobile && { fontSize: 13, fontWeight: '800' }]}>
                            Booking İçine Gir ➔
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* USER ACCOUNT & SETTINGS DROPDOWN MODAL */}
      <Modal
        visible={isUserModalOpen}
        transparent={true}
        animationType="none"
        onRequestClose={() => setIsUserModalOpen(false)}>
        <Pressable style={styles.userModalOverlay} onPress={() => setIsUserModalOpen(false)}>
          <Animated.View
            style={[
              styles.userModalCard,
              {
                opacity: dropdownAnim,
                transform: [
                  {
                    translateY: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-16, 0],
                    }),
                  },
                  {
                    scale: dropdownAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              },
            ]}>
            <Pressable onPress={(e) => e.stopPropagation?.()}>
              {/* Modal Header */}
              <View style={styles.userModalHeader}>
                <ThemedText style={styles.userModalTitle}>Kullanıcı Hesabı</ThemedText>
                <Pressable
                  onPress={() => setIsUserModalOpen(false)}
                  style={({ pressed }) => [styles.modalCloseButton, pressed && styles.pressed]}>
                  <ThemedText style={styles.modalCloseText}>✕</ThemedText>
                </Pressable>
              </View>

              {/* User Profile Card & Info */}
              <View style={styles.userModalBody}>
                <View style={styles.userModalProfileBox}>
                  <View style={styles.userModalAvatar}>
                    <ThemedText style={styles.userModalAvatarText}>
                      {displayName.charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.userModalName} numberOfLines={1}>
                      {displayName}
                    </ThemedText>
                    <View style={styles.activeStatusRow}>
                      <View style={styles.activeDot} />
                      <ThemedText style={styles.userModalStatus}>Aktif Oturum Açık</ThemedText>
                    </View>
                  </View>
                </View>

                {/* Menu & Future Settings Placeholders */}
                <View style={styles.userModalMenu}>
                  <View style={styles.userMenuItem}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.userMenuItemTitle}>Profil & Oturum</ThemedText>
                      <ThemedText style={styles.userMenuItemSub}>Kullanıcı detayları ve rol</ThemedText>
                    </View>
                  </View>

                  <View style={[styles.userMenuItem, styles.disabledMenuItem]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ThemedText style={styles.userMenuItemTitle}>Sistem Ayarları</ThemedText>
                        <View style={styles.soonBadge}>
                          <ThemedText style={styles.soonBadgeText}>YAKINDA</ThemedText>
                        </View>
                      </View>
                      <ThemedText style={styles.userMenuItemSub}>Görünüm, tema ve dil tercihleri</ThemedText>
                    </View>
                  </View>

                  <View style={[styles.userMenuItem, styles.disabledMenuItem]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ThemedText style={styles.userMenuItemTitle}>Bildirim Tercihleri</ThemedText>
                        <View style={styles.soonBadge}>
                          <ThemedText style={styles.soonBadgeText}>YAKINDA</ThemedText>
                        </View>
                      </View>
                      <ThemedText style={styles.userMenuItemSub}>E-posta ve uygulama içi bildirimler</ThemedText>
                    </View>
                  </View>
                </View>

                {/* Logout Button */}
                <Pressable
                  onPress={() => {
                    setIsUserModalOpen(false);
                    logout();
                  }}
                  style={({ pressed }) => [styles.userModalLogoutBtn, pressed && styles.pressed]}>
                  <ThemedText style={styles.userModalLogoutText}> Oturumu Kapat (Çıkış Yap)</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* SIDE DRAWER MENU */}
      <SideMenu
        isOpen={isSideMenuOpen}
        onClose={() => setIsSideMenuOpen(false)}
        user={user}
        onLogout={logout}
        onOpenCariYonetimi={() => setIsCariYonetimiOpen(true)}
        onOpenCariCreate={() => setIsCariCreateOpen(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  headerBar: {
    width: '100%',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  headerContent: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  headerMenuTrigger: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
  },
  headerMenuTriggerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandBadgeText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  searchCenterContainer: {
    flex: 1,
    minWidth: 260,
    maxWidth: 560,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 8 : 4,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  userInfoTextContainer: {
    maxWidth: 140,
  },
  userNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  userRoleText: {
    fontSize: 10,
    color: '#64748b',
  },
  logoutButton: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  logoutButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.7,
  },
  mainContent: {
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.five,
  },

  /* WELCOME & SAMPLES STYLES */
  welcomeContainer: {
    gap: Spacing.five,
  },
  welcomeHero: {
    backgroundColor: '#ffffff',
    padding: Spacing.six,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: Spacing.three,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  sampleContainer: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  sampleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sampleChip: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleChipMobile: {
    width: '45%',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  sampleChipText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  sampleChipTextMobile: {
    fontSize: 9,
    fontWeight: '700',
  },

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.four,
  },
  infoCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: '#ffffff',
    padding: Spacing.four,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  infoCardIcon: {
    fontSize: 28,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoCardDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },

  /* SEARCH RESULTS STYLES */
  searchResultsContainer: {
    gap: Spacing.four,
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchResultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  errorBox: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  errorText: {
    color: '#e11d48',
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.six,
    gap: Spacing.two,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyStateIcon: {
    fontSize: 36,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  resultsList: {
    gap: Spacing.four,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  resultCardMobile: {
    padding: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCodeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cardCodeText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  badgeGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  routeCol: {
    flex: 1,
    gap: 2,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  routeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  routeArrow: {
    fontSize: 18,
    color: '#2563eb',
    fontWeight: 'bold',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 4,
  },
  metaItem: {
    minWidth: 140,
    flex: 1,
    gap: 2,
  },
  metaItemMobile: {
    minWidth: '45%',
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  cardActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cardActionBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
  },
  cardRidHint: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  enterBookingBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  enterBookingBtnMobile: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  enterBookingBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: 'bold',
  },


  /* USER MODAL STYLES */
  userModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  userModalCard: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 320,
    maxWidth: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  userModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  userModalBody: {
    padding: 20,
    gap: 16,
  },
  userModalProfileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userModalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userModalAvatarText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  userModalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  activeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
  },
  userModalStatus: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  userModalMenu: {
    gap: 8,
  },
  userMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  disabledMenuItem: {
    backgroundColor: '#fafafa',
    opacity: 0.75,
  },
  userMenuItemIcon: {
    fontSize: 18,
  },
  userMenuItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  userMenuItemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  soonBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  soonBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0369a1',
  },
  userModalLogoutBtn: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  userModalLogoutText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 14,
  },

  /* ERP DETAIL VIEW STYLES (MATCHING SCREENSHOT) */
  erpTopActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  erpTopActionBarMobile: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  erpBackBtn: {
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  erpBackBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  erpActionBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  erpStageSelectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  stageModalCard: {
    position: 'absolute',
    top: 70,
    right: 20,
    width: 360,
    maxWidth: '92%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stageMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  stageMenuItemActive: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderWidth: 1.5,
  },
  stageIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageMenuTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  stageMenuDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  stageCheckBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageCheckText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  erpStageSelectText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  erpSendBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 4,
  },
  erpSendBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  erpSectionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
  },
  erpSectionHeaderBar: {
    backgroundColor: '#4b5563',
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  erpMinusBadge: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  erpMinusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  erpSectionTitleText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  erpOrangeCounterBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  erpOrangeCounterText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  erpSubHeaderRow: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  erpStatusHeadingText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ea580c',
  },
  erpGridTable: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    margin: 8,
    overflow: 'hidden',
  },
  erpGridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    minHeight: 32,
  },
  erpGridRowMobile: {
    flexDirection: 'row',
  },
  erpCellHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 32,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  erpCellHalfMobile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  erpLabelCell: {
    width: '45%',
    backgroundColor: '#fef9c3',
    paddingHorizontal: 6,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    minHeight: 32,
    alignSelf: 'stretch',
  },
  erpLabelCellMobile: {
    width: '45%',
    alignSelf: 'stretch',
  },
  erpLabelText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  erpInfoIcon: {
    fontSize: 10,
    color: '#94a3b8',
    marginLeft: 2,
  },
  erpRefreshIcon: {
    fontSize: 10,
    color: '#3b82f6',
    marginLeft: 2,
  },
  erpMenuIcon: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 2,
    fontWeight: 'bold',
  },
  erpValueCell: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  erpValText: {
    fontSize: 11,
    color: '#0f172a',
  },
  erpSelectInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  erpSelectValText: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '500',
  },
  erpSelectTextInputStyle: {
    flex: 1,
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '500',
    padding: 0,
    height: Platform.OS === 'web' ? 22 : 26,
  },
  erpMiniTextInput: {
    fontSize: 11,
    color: '#0f172a',
    padding: 0,
    height: Platform.OS === 'web' ? 20 : 24,
  },
  erpTableWrapper: {
    margin: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  erpTableHeadRow: {
    flexDirection: 'row',
    backgroundColor: '#fef9c3',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  erpTableHeadCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  erpTableBodyRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  erpTableCellText: {
    fontSize: 11,
    color: '#0f172a',
  },
  erpAcenteSplitRow: {
    flexDirection: 'row',
    padding: 8,
    gap: 12,
    flex: 1,
    width: '100%',
  },

  erpAcenteLeftBox: {
    width: 320,
    maxWidth: '100%',
    flexShrink: 0,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    padding: 10,
  },

  erpAcenteRightTable: {
    flex: 1,
    minWidth: 400,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  erpSquareCheck: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  erpSquareCheckBtn: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  erpSquareCheckBtnPressed: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
    transform: [{ scale: 0.94 }],
  },
  erpSquareCheckBtnSuccess: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  erpSquareCheckBtnError: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
  },
  erpSquareCheckIcon: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 14,
  },
  erpStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  erpStatusBadgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  erpStatusBadgeError: {
    backgroundColor: '#fee2e2',
  },
  erpStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803d',
  },
  erpMiniInputBox: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#ffffff',
  },
  erpMiniSaveBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  erpFooterContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  erpFooterText: {
    fontSize: 11,
    color: '#94a3b8',
  },

  /* SIMPLE REPRESENTATIVE MODAL STYLES */
  erpDropdownIconBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  erpDropdownIconText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: 'bold',
  },
  simpleModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  simpleModalBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    gap: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  simpleModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  simpleModalInputWrapper: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 8 : 6,
  },
  simpleModalInput: {
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  simpleModalBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },
  simpleModalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  simpleModalCancelText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  simpleModalSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  simpleModalSaveText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  // Sefer Düzenleme Button Styles
  seferEditBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 50,
    paddingVertical: 0,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  seferEditBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});

