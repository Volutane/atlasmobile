import type { BookingItem } from '@/components/main-dashboard';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_API_URL } from '@/constants/api';
import { useAuth } from '@/context/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SeferDuzenlemeProps {
  booking: BookingItem;
  atdValue?: string;
  onClose: () => void;
  onSave: (updatedBooking: BookingItem, newAtd?: string) => void;
}

const TURKISH_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];
const TURKISH_WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// 30-minute interval time options from 00:00 to 23:30 (24-hour system)
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  const hh = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hh}:00`);
  TIME_OPTIONS.push(`${hh}:30`);
}

// Year options for quick year selection modal/picker (2015..2040)
const YEAR_OPTIONS: number[] = [];
for (let y = 2015; y <= 2040; y++) {
  YEAR_OPTIONS.push(y);
}

type DateFieldKey =
  | 'eta'
  | 'etd'
  | 'atd'
  | 'ata'
  | 'talimatDate'
  | 'beyannameDate'
  | 'vgmDate'
  | 'ardiyesizGiris'
  | 'freeDetention';

type TimeFieldKey = 'talimatTime' | 'beyannameTime' | 'vgmTime';

export function SeferDuzenlemeScreen({
  booking,
  atdValue,
  onClose,
  onSave,
}: SeferDuzenlemeProps) {
  // Main form field states
  const { user, token, apiUrl: contextApiUrl } = useAuth();
  const responsive = useResponsive();
  const isMobile = responsive.isMobile;
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === 'web' ? 0 : Math.max(insets.top, StatusBar.currentHeight || 0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [seferEditEta, setSeferEditEta] = useState<string>('');
  const [seferEditEtd, setSeferEditEtd] = useState<string>('');
  const [seferEditAtd, setSeferEditAtd] = useState<string>('');
  const [seferEditAta, setSeferEditAta] = useState<string>('');
  const [seferEditTalimatDate, setSeferEditTalimatDate] = useState<string>('');
  const [seferEditTalimatTime, setSeferEditTalimatTime] = useState<string>('');
  const [seferEditBeyannameDate, setSeferEditBeyannameDate] = useState<string>('');
  const [seferEditBeyannameTime, setSeferEditBeyannameTime] = useState<string>('');
  const [seferEditVgmDate, setSeferEditVgmDate] = useState<string>('');
  const [seferEditVgmTime, setSeferEditVgmTime] = useState<string>('');
  const [seferEditArdiyesizGiris, setSeferEditArdiyesizGiris] = useState<string>('');
  const [seferEditFreeDetention, setSeferEditFreeDetention] = useState<string>('');

  // DatePicker Modal State
  const [activeDateField, setActiveDateField] = useState<DateFieldKey | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [pickerMode, setPickerMode] = useState<'calendar' | 'month' | 'year'>('calendar');

  // TimePicker Modal State
  const [activeTimeField, setActiveTimeField] = useState<TimeFieldKey | null>(null);

  useEffect(() => {
    if (!booking) return;

    const formatDateOnly = (dateStr?: string) => {
      if (!dateStr || dateStr === '-') return '';
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const day = String(d.getDate()).padStart(2, '0');
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        }
      } catch { }
      return dateStr;
    };

    const parseDateTimeHelper = (rawStr?: string) => {
      if (!rawStr) return { date: '', time: '' };
      const s = String(rawStr).trim();
      if (!s || s === '-') return { date: '', time: '' };
      if (s.includes(' ')) {
        const parts = s.split(' ');
        return { date: parts[0] || '', time: parts[1] ? parts[1].substring(0, 5) : '' };
      }
      if (s.includes('T')) {
        const parts = s.split('T');
        const dParts = parts[0].split('-');
        const formattedDate = dParts.length === 3 ? `${dParts[2]}/${dParts[1]}/${dParts[0]}` : parts[0];
        return { date: formattedDate, time: parts[1] ? parts[1].substring(0, 5) : '' };
      }
      return { date: s, time: '' };
    };

    const etaStr = booking.eta || booking.ETA || '';
    setSeferEditEta(formatDateOnly(etaStr) || etaStr);

    const etdStr = booking.etd || booking.ETD || '';
    setSeferEditEtd(formatDateOnly(etdStr) || etdStr);

    const atdStr = atdValue || booking.ATD || booking.atd || booking.gercek_kalkis || '';
    setSeferEditAtd(formatDateOnly(atdStr) || atdStr);

    const ataStr = booking.ata || booking.ATA || '';
    setSeferEditAta(formatDateOnly(ataStr) || ataStr);

    const talimat = parseDateTimeHelper(booking.talimat_cutoff || booking.instructioncutoff || booking.TALIMAT_CUTOFF);
    setSeferEditTalimatDate(talimat.date);
    setSeferEditTalimatTime(talimat.time || '10:00');

    const beyanname = parseDateTimeHelper(booking.beyanname_cutoff || booking.declarationcutoff || booking.BEYANNAME_CUTOFF);
    setSeferEditBeyannameDate(beyanname.date);
    setSeferEditBeyannameTime(beyanname.time || '16:00');

    const vgm = parseDateTimeHelper(booking.vgm_cutoff || booking.vgmcutoff || booking.VGM_CUTOFF);
    setSeferEditVgmDate(vgm.date);
    setSeferEditVgmTime(vgm.time || '00:00');

    const ardiyesizStr = booking.ardiyesiz_giris || booking.warehousefreeentry || booking.bookingunstoragedentry || booking.ARDIYESIZ_GIRIS || '';
    setSeferEditArdiyesizGiris(formatDateOnly(ardiyesizStr) || ardiyesizStr);

    const freeDetStr = booking.free_detention || booking.freedetentiondate || booking.FREE_DETENTION || '';
    setSeferEditFreeDetention(formatDateOnly(freeDetStr) || freeDetStr);
  }, [booking, atdValue]);

  // Open DatePicker Modal for a field
  const openDatePicker = (field: DateFieldKey, currentValue?: string) => {
    setActiveDateField(field);
    setPickerMode('calendar');
    if (currentValue && currentValue.includes('/')) {
      const parts = currentValue.split('/');
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
          setCalendarDate(new Date(y, m, d));
          return;
        }
      }
    }
    setCalendarDate(new Date());
  };

  // Select Date from Calendar
  const handleSelectDate = (year: number, month: number, day: number) => {
    const formatted = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    switch (activeDateField) {
      case 'eta':
        setSeferEditEta(formatted);
        break;
      case 'etd':
        setSeferEditEtd(formatted);
        break;
      case 'atd':
        setSeferEditAtd(formatted);
        break;
      case 'ata':
        setSeferEditAta(formatted);
        break;
      case 'talimatDate':
        setSeferEditTalimatDate(formatted);
        break;
      case 'beyannameDate':
        setSeferEditBeyannameDate(formatted);
        break;
      case 'vgmDate':
        setSeferEditVgmDate(formatted);
        break;
      case 'ardiyesizGiris':
        setSeferEditArdiyesizGiris(formatted);
        break;
      case 'freeDetention':
        setSeferEditFreeDetention(formatted);
        break;
    }
    setActiveDateField(null);
  };

  // Select Time from Scrollable Picker
  const handleSelectTime = (timeStr: string) => {
    switch (activeTimeField) {
      case 'talimatTime':
        setSeferEditTalimatTime(timeStr);
        break;
      case 'beyannameTime':
        setSeferEditBeyannameTime(timeStr);
        break;
      case 'vgmTime':
        setSeferEditVgmTime(timeStr);
        break;
    }
    setActiveTimeField(null);
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    let whoEditUserRid =
      user?.useraccountrid ||
      user?.USERACCOUNTRID ||
      user?.userrid ||
      user?.USERRID ||
      user?.rid ||
      user?.RID ||
      token ||
      '';

    if (whoEditUserRid && whoEditUserRid.startsWith('ey') && whoEditUserRid.includes('.')) {
      try {
        const parts = whoEditUserRid.split('.');
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
          whoEditUserRid =
            parsed['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
            parsed.sub ||
            parsed.nameidentifier ||
            parsed.userrid ||
            parsed.useraccountrid ||
            whoEditUserRid;
        }
      } catch (e) { }
    }

    const voyageRID =
      booking.voyagerid ||
      booking.VOYAGERID ||
      booking.voyageRID ||
      booking.VoyageRID ||
      booking.getVoyageRID ||
      booking.id ||
      '';

    const isLineFilled =
      booking.linerid ||
      booking.LINERID ||
      booking.line_rid ||
      booking.voyageLine ||
      '';

    const isVoyageNoFilled =
      booking.sefer_no ||
      booking.voyageno ||
      booking.VOYAGENO ||
      booking.shipvoyageno ||
      booking.entryVoyageNo ||
      '';

    const isShipNameFilled =
      booking.shiprid ||
      booking.SHIPRID ||
      booking.vesselrid ||
      booking.chooseShip ||
      booking.gemi_adi ||
      '';

    // 1. Voyage Level Validation
    let missingOptions = '';
    if (!isVoyageNoFilled || String(isVoyageNoFilled).trim() === '') {
      missingOptions += 'Sefer Numarası girilmedi!.\n';
    }
    if (!isShipNameFilled || String(isShipNameFilled).trim() === '') {
      missingOptions += 'Gemi seçimi yapılmadı!.\n';
    }

    if (missingOptions !== '') {
      if (Platform.OS === 'web') {
        window.alert(missingOptions);
      } else {
        Alert.alert('Eksik Bilgi', missingOptions);
      }
      return;
    }

    const isValidGuid = (val?: any): boolean => {
      if (!val || typeof val !== 'string') return false;
      return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val.trim());
    };

    const toGuidOrNull = (val?: any): string | null => {
      if (isValidGuid(val)) {
        return String(val).trim();
      }
      return null;
    };

    const editVoyageModel: Record<string, any> = {
      VOYAGERID: toGuidOrNull(voyageRID),
      VOYAGENO: isVoyageNoFilled ? String(isVoyageNoFilled).trim() : null,
      SHIPRID: toGuidOrNull(isShipNameFilled),
      LINERID: toGuidOrNull(isLineFilled),
      WHOEDITUSERRID: toGuidOrNull(whoEditUserRid),
    };

    console.log('Posting EditVoyageModel:', JSON.stringify(editVoyageModel));

    setIsSubmitting(true);

    try {
      const activeBaseUrl = (contextApiUrl || DEFAULT_API_URL).trim().replace(/\/$/, '');
      const voyageRes = await fetch(`${activeBaseUrl}/Voyage/EditVoyage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json',
          ...(token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editVoyageModel),
      });

      let rawResText = '';
      const voyageData = await voyageRes.text().then(text => {
        rawResText = text;
        try { return JSON.parse(text); } catch { return null; }
      }).catch(() => null);

      if (voyageData?.status === 'DuplicateRecord') {
        setIsSubmitting(false);
        const msg = voyageData?.message || 'Mükerrer kayıt!';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Hata', msg);
        return;
      }

      const isVoyageSuccess =
        voyageRes.ok &&
        (voyageData?.status === 'Success' || voyageData?.status === 'success' || voyageData?.success === true || !voyageData?.status);

      if (!isVoyageSuccess) {
        setIsSubmitting(false);
        const detailMsg = voyageData?.message || voyageData?.Message || voyageData?.error || rawResText || '';
        const msg = detailMsg ? `Sefer güncellenemedi: ${detailMsg}` : `Sefer güncellenirken hata oluştu (HTTP ${voyageRes.status})`;
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Hata', msg);
        return;
      }

      const portGuidCandidate =
        toGuidOrNull(booking.portrid) ||
        toGuidOrNull(booking.PORTRID) ||
        toGuidOrNull(booking.loadingportrid) ||
        toGuidOrNull(booking.LOADINGPORTRID) ||
        toGuidOrNull(booking.voyagePort);

      const portText = booking.yukleme_limani || booking.loadingport || booking.LOADINGPORT || '';

      const ETDFilled = seferEditEtd;
      const ETAFilled = seferEditEta;

      let missingOptions2 = '';
      if (!ETDFilled || String(ETDFilled).trim() === '') {
        missingOptions2 += 'ETD bilgisi gerekmektedir.\n';
      }
      if (!ETAFilled || String(ETAFilled).trim() === '') {
        missingOptions2 += 'ETA bilgisi gerekmektedir.\n';
      }

      if (missingOptions2 !== '') {
        setIsSubmitting(false);
        if (Platform.OS === 'web') {
          window.alert(missingOptions2);
        } else {
          Alert.alert('Eksik Bilgi', missingOptions2);
        }
        return;
      }

      // API field is "voyagecuttoffrid" (double 't') not "voyagecutoffrid"
      const voyageCutOffRID =
        toGuidOrNull(booking.voyagecuttoffrid) ||
        toGuidOrNull(booking.VOYAGECUTTOFFRID) ||
        toGuidOrNull(booking.voyagecutoffrid) ||
        toGuidOrNull(booking.VOYAGECUTOFFRID) ||
        toGuidOrNull(booking.getCutOffVoyageRID);

      const editCutOffModel: Record<string, any> = {
        VOYAGECUTOFFRID: voyageCutOffRID,
        WHOEDITUSERRID: toGuidOrNull(whoEditUserRid),
        ETD: ETDFilled ? String(ETDFilled).trim() : null,
        ETA: ETAFilled ? String(ETAFilled).trim() : null,
        ATA: seferEditAta ? String(seferEditAta).trim() : null,
        ATD: seferEditAtd ? String(seferEditAtd).trim() : null,
        UNSTORAGE: seferEditArdiyesizGiris ? String(seferEditArdiyesizGiris).trim() : null,
        FREEDETENTION: seferEditFreeDetention ? String(seferEditFreeDetention).trim() : null,
        INSTRUCTION: seferEditTalimatDate ? String(seferEditTalimatDate).trim() : null,
        INSTRUCTIONHOUR: seferEditTalimatTime ? String(seferEditTalimatTime).trim() : null,
        DECLARATION: seferEditBeyannameDate ? String(seferEditBeyannameDate).trim() : null,
        DECLARATIONHOUR: seferEditBeyannameTime ? String(seferEditBeyannameTime).trim() : null,
        VGM: seferEditVgmDate ? String(seferEditVgmDate).trim() : null,
        VGMHOUR: seferEditVgmTime ? String(seferEditVgmTime).trim() : null,
      };

      // Only include PORTRID if we actually have a valid GUID
      if (portGuidCandidate) {
        editCutOffModel.PORTRID = portGuidCandidate;
      }

      for (const key in editCutOffModel) {
        if (Object.prototype.hasOwnProperty.call(editCutOffModel, key) && editCutOffModel[key] === '') {
          editCutOffModel[key] = null;
        }
      }

      console.log('Posting EditCutOffModel:', JSON.stringify(editCutOffModel));

      const cutOffRes = await fetch(`${activeBaseUrl}/Voyage/EditVoyageCutOff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json',
          ...(token ? { Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editCutOffModel),
      });

      let rawCutOffText = '';
      const cutOffData = await cutOffRes.text().then(text => {
        rawCutOffText = text;
        try { return JSON.parse(text); } catch { return null; }
      }).catch(() => null);

      setIsSubmitting(false);

      if (cutOffData?.status === 'DuplicateRecord') {
        const msg = cutOffData?.message || 'Mükerrer kayıt!';
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Hata', msg);
        return;
      }

      const isCutOffSuccess =
        cutOffRes.ok &&
        (cutOffData?.status === 'Success' || cutOffData?.status === 'success' || cutOffData?.success === true || !cutOffData?.status);

      if (isCutOffSuccess) {
        const updatedBooking: BookingItem = {
          ...booking,
          eta: seferEditEta,
          ETA: seferEditEta,
          etd: seferEditEtd,
          ETD: seferEditEtd,
          atd: seferEditAtd,
          ATD: seferEditAtd,
          gercek_kalkis: seferEditAtd,
          ata: seferEditAta,
          ATA: seferEditAta,
          talimat_cutoff: `${seferEditTalimatDate} ${seferEditTalimatTime}`.trim(),
          beyanname_cutoff: `${seferEditBeyannameDate} ${seferEditBeyannameTime}`.trim(),
          vgm_cutoff: `${seferEditVgmDate} ${seferEditVgmTime}`.trim(),
          ardiyesiz_giris: seferEditArdiyesizGiris,
          ARDIYESIZ_GIRIS: seferEditArdiyesizGiris,
          free_detention: seferEditFreeDetention,
          FREE_DETENTION: seferEditFreeDetention,
        };

        onSave(updatedBooking, seferEditAtd);
        if (Platform.OS === 'web') {
          window.alert('İşlem başarılı!');
        } else {
          Alert.alert('Başarılı', 'İşlem başarılı!');
        }
      } else {
        const detailMsg = cutOffData?.message || cutOffData?.Message || cutOffData?.error || rawCutOffText || '';
        const msg = detailMsg ? `CutOff güncellenemedi: ${detailMsg}` : `CutOff güncellenirken hata oluştu (HTTP ${cutOffRes.status})`;
        if (Platform.OS === 'web') window.alert(msg);
        else Alert.alert('Hata', msg);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      console.error('API hatası:', err);
      const msg = err?.message ? `Bir hata oluştu: ${err.message}` : 'Bir hata oluştu, tekrar deneyiniz';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Hata', msg);
    }
  };

  const seferNoVal = booking.sefer_no || booking.voyageno || booking.VOYAGENO || booking.shipvoyageno || '0109-406W';
  const hatVal = booking.hat || booking.line || booking.LINENAME || booking.LINE_NAME || 'EVERGREEN LINE';
  const gemiAdiVal = booking.gemi_adi || booking.shipname || booking.SHIPNAME || booking.vesselname || booking.VESSELNAME || 'EVER PRIDE';
  const yuklemeLimaniVal = booking.yukleme_limani || booking.loadingport || booking.LOADINGPORT || 'Evyap Port,Kocaeli,Turkey(TREYP)';

  // Helper for generating calendar grid
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

  // Selected date value for highlighting in active calendar
  const getSelectedValueForActiveField = (): string => {
    switch (activeDateField) {
      case 'eta': return seferEditEta;
      case 'etd': return seferEditEtd;
      case 'atd': return seferEditAtd;
      case 'ata': return seferEditAta;
      case 'talimatDate': return seferEditTalimatDate;
      case 'beyannameDate': return seferEditBeyannameDate;
      case 'vgmDate': return seferEditVgmDate;
      case 'ardiyesizGiris': return seferEditArdiyesizGiris;
      case 'freeDetention': return seferEditFreeDetention;
      default: return '';
    }
  };
  const activeSelectedVal = getSelectedValueForActiveField();

  return (
    <View style={[styles.seferEditContainer, { paddingTop: topPadding }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={true} />
      <ScrollView contentContainerStyle={styles.seferEditContent}>

        {/* Header Action Bar */}
        <View style={styles.seferEditHeaderBar}>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.seferEditBackBtn, pressed && { opacity: 0.7 }, Platform.OS === 'web' && { cursor: 'pointer' }]}>
            <ThemedText style={styles.seferEditBackBtnText}>Geri Dön</ThemedText>
          </Pressable>
          <ThemedText style={styles.seferEditTitle}>Sefer Düzenleme</ThemedText>
          <Pressable
            onPress={handleSave}
            disabled={isSubmitting}
            style={({ pressed }) => [styles.seferEditSaveBtn, (pressed || isSubmitting) && { opacity: 0.85 }, Platform.OS === 'web' && { cursor: 'pointer' }]}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <ThemedText style={styles.seferEditSaveBtnText}>Kaydet</ThemedText>
            )}
          </Pressable>
        </View>

        {/* Table Container */}
        <View style={styles.seferEditCard}>

          {/* 1. SECTION: ORANGE HEADER (READ ONLY / NON-EDITABLE) */}
          <View style={styles.seferOrangeHeaderRow}>
            <View style={styles.seferCol4}>
              <ThemedText style={styles.seferOrangeHeaderText}>Sefer No</ThemedText>
            </View>
            <View style={styles.seferCol4}>
              <ThemedText style={styles.seferOrangeHeaderText}>Hat</ThemedText>
            </View>
            <View style={styles.seferCol4}>
              <ThemedText style={styles.seferOrangeHeaderText}>Gemi Adı</ThemedText>
            </View>

          </View>

          <View style={styles.seferInputRow}>
            <View style={styles.seferCol4}>
              <TextInput
                style={[styles.seferInput, styles.seferInputDisabled]}
                value={seferNoVal}
                editable={false}
              />
            </View>
            <View style={styles.seferCol4}>
              <TextInput
                style={[styles.seferInput, styles.seferInputDisabled]}
                value={hatVal}
                editable={false}
              />
            </View>
            <View style={styles.seferCol4}>
              <View style={styles.seferDropdownWrapper}>
                <TextInput
                  style={[styles.seferInput, styles.seferInputDisabled, { flex: 1, borderRightWidth: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }]}
                  value={gemiAdiVal}
                  editable={false}
                />
              </View>
            </View>

          </View>

          {/* FULL WIDTH YÜKLEME LİMANI HEADER */}
          <View style={styles.seferOrangeHeaderRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.seferOrangeHeaderText}>Yükleme Limanı</ThemedText>
            </View>
          </View>

          <View style={styles.seferInputRow}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={[styles.seferInput, styles.seferInputDisabled]}
                value={yuklemeLimaniVal}
                editable={false}
              />
            </View>
          </View>

          {/* 2. SECTION: YELLOW HEADER (EDITABLE) */}
          {/* ETA | ETD | ATD | ATA */}
          {isMobile ? (
            <>
              {/* ETA | ETD (Row 1) */}
              <View style={styles.seferYellowHeaderRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.seferYellowHeaderText}>ETA</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.seferYellowHeaderText}>ETD</ThemedText>
                </View>
              </View>

              <View style={styles.seferInputRow}>
                <View style={{ flex: 1 }}>
                  <Pressable onPress={() => openDatePicker('eta', seferEditEta)}>
                    <TextInput
                      style={[styles.seferInput, styles.seferInputEditable]}
                      value={seferEditEta}
                      editable={false}
                      pointerEvents="none"
                      placeholder="24/08/2026"
                      placeholderTextColor="#94a3b8"
                    />
                  </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <Pressable onPress={() => openDatePicker('etd', seferEditEtd)}>
                    <TextInput
                      style={[styles.seferInput, styles.seferInputEditable]}
                      value={seferEditEtd}
                      editable={false}
                      pointerEvents="none"
                      placeholder="26/08/2026"
                      placeholderTextColor="#94a3b8"
                    />
                  </Pressable>
                </View>
              </View>

              {/* ATD | ATA (Row 2) */}
              <View style={styles.seferYellowHeaderRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.seferYellowHeaderText}>ATD</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.seferYellowHeaderText}>ATA</ThemedText>
                </View>
              </View>

              <View style={styles.seferInputRow}>
                <View style={{ flex: 1 }}>
                  <Pressable onPress={() => openDatePicker('atd', seferEditAtd)}>
                    <TextInput
                      style={[styles.seferInput, styles.seferInputEditable]}
                      value={seferEditAtd}
                      editable={false}
                      pointerEvents="none"
                      placeholder="26/08/2026"
                      placeholderTextColor="#94a3b8"
                    />
                  </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <Pressable onPress={() => openDatePicker('ata', seferEditAta)}>
                    <TextInput
                      style={[styles.seferInput, styles.seferInputEditable]}
                      value={seferEditAta}
                      editable={false}
                      pointerEvents="none"
                      placeholder="GG/AA/YYYY"
                      placeholderTextColor="#94a3b8"
                    />
                  </Pressable>
                </View>
              </View>
            </>
          ) : (
            <>
              <View style={styles.seferYellowHeaderRow}>
                <View style={styles.seferCol4}>
                  <ThemedText style={styles.seferYellowHeaderText}>ETA</ThemedText>
                </View>
                <View style={styles.seferCol4}>
                  <ThemedText style={styles.seferYellowHeaderText}>ETD</ThemedText>
                </View>
                <View style={styles.seferCol4}>
                  <ThemedText style={styles.seferYellowHeaderText}>ATD</ThemedText>
                </View>
                <View style={styles.seferCol4}>
                  <ThemedText style={styles.seferYellowHeaderText}>ATA</ThemedText>
                </View>
              </View>

              <View style={styles.seferInputRow}>
                <View style={styles.seferCol4}>
                  <Pressable onPress={() => openDatePicker('eta', seferEditEta)}>
                    <TextInput
                      style={[styles.seferInput, styles.seferInputEditable]}
                      value={seferEditEta}
                      editable={false}
                      pointerEvents="none"
                      placeholder="24/08/2026"
                      placeholderTextColor="#94a3b8"
                    />
                  </Pressable>
                </View>
                <View style={styles.seferCol4}>
                  <Pressable onPress={() => openDatePicker('etd', seferEditEtd)}>
                    <TextInput
                      style={[styles.seferInput, styles.seferInputEditable]}
                      value={seferEditEtd}
                      editable={false}
                      pointerEvents="none"
                      placeholder="26/08/2026"
                      placeholderTextColor="#94a3b8"
                    />
                  </Pressable>
                </View>
                <View style={styles.seferCol4}>
                  <Pressable onPress={() => openDatePicker('atd', seferEditAtd)}>
                    <TextInput
                      style={[styles.seferInput, styles.seferInputEditable]}
                      value={seferEditAtd}
                      editable={false}
                      pointerEvents="none"
                      placeholder="26/08/2026"
                      placeholderTextColor="#94a3b8"
                    />
                  </Pressable>
                </View>
                <View style={styles.seferCol4}>
                  <Pressable onPress={() => openDatePicker('ata', seferEditAta)}>
                    <TextInput
                      style={[styles.seferInput, styles.seferInputEditable]}
                      value={seferEditAta}
                      editable={false}
                      pointerEvents="none"
                      placeholder="GG/AA/YYYY"
                      placeholderTextColor="#94a3b8"
                    />
                  </Pressable>
                </View>
              </View>
            </>
          )}

          {/* CUT OFF HEADERS */}
          <View style={styles.seferYellowHeaderRow}>
            <View style={styles.seferCol4}>
              <ThemedText style={styles.seferYellowHeaderText}>Talimat Cut Off</ThemedText>
            </View>
            <View style={styles.seferCol4}>
              <ThemedText style={styles.seferYellowHeaderText}>Beyanname Cut Off</ThemedText>
            </View>
            <View style={styles.seferCol4}>
              <ThemedText style={styles.seferYellowHeaderText}>VGM Cut Off</ThemedText>
            </View>
          </View>

          {/* CUT OFF DATES */}
          <View style={styles.seferInputRow}>
            <View style={styles.seferCol4}>
              <Pressable onPress={() => openDatePicker('talimatDate', seferEditTalimatDate)}>
                <TextInput
                  style={[styles.seferInput, styles.seferInputEditable]}
                  value={seferEditTalimatDate}
                  editable={false}
                  pointerEvents="none"
                  placeholder="20/08/2026"
                  placeholderTextColor="#94a3b8"
                />
              </Pressable>
            </View>
            <View style={styles.seferCol4}>
              <Pressable onPress={() => openDatePicker('beyannameDate', seferEditBeyannameDate)}>
                <TextInput
                  style={[styles.seferInput, styles.seferInputEditable]}
                  value={seferEditBeyannameDate}
                  editable={false}
                  pointerEvents="none"
                  placeholder="20/08/2026"
                  placeholderTextColor="#94a3b8"
                />
              </Pressable>
            </View>
            <View style={styles.seferCol4}>
              <Pressable onPress={() => openDatePicker('vgmDate', seferEditVgmDate)}>
                <TextInput
                  style={[styles.seferInput, styles.seferInputEditable]}
                  value={seferEditVgmDate}
                  editable={false}
                  pointerEvents="none"
                  placeholder="20/08/2026"
                  placeholderTextColor="#94a3b8"
                />
              </Pressable>
            </View>
          </View>

          {/* CUT OFF TIMES (SCROLLABLE TIME PICKER) */}
          <View style={styles.seferInputRow}>
            <View style={styles.seferCol4}>
              <Pressable onPress={() => setActiveTimeField('talimatTime')}>
                <TextInput
                  style={[styles.seferInput, styles.seferInputEditable]}
                  value={seferEditTalimatTime}
                  editable={false}
                  pointerEvents="none"
                  placeholder="10:00"
                  placeholderTextColor="#94a3b8"
                />
              </Pressable>
            </View>
            <View style={styles.seferCol4}>
              <Pressable onPress={() => setActiveTimeField('beyannameTime')}>
                <TextInput
                  style={[styles.seferInput, styles.seferInputEditable]}
                  value={seferEditBeyannameTime}
                  editable={false}
                  pointerEvents="none"
                  placeholder="16:00"
                  placeholderTextColor="#94a3b8"
                />
              </Pressable>
            </View>
            <View style={styles.seferCol4}>
              <Pressable onPress={() => setActiveTimeField('vgmTime')}>
                <TextInput
                  style={[styles.seferInput, styles.seferInputEditable]}
                  value={seferEditVgmTime}
                  editable={false}
                  pointerEvents="none"
                  placeholder="00:00"
                  placeholderTextColor="#94a3b8"
                />
              </Pressable>
            </View>
          </View>

          {/* ARDİYESİZ GİRİŞ & FREE DETENTION TARİH HEADERS */}
          <View style={styles.seferYellowHeaderRow}>
            <View style={{ flex: 2 }}>
              <ThemedText style={styles.seferYellowHeaderText}>Ardiyesiz Giriş</ThemedText>
            </View>
            <View style={{ flex: 2 }}>
              <ThemedText style={styles.seferYellowHeaderText}>Free Detention Tarih</ThemedText>
            </View>
          </View>

          {/* ARDİYESİZ GİRİŞ & FREE DETENTION TARİH DATES */}
          <View style={styles.seferInputRow}>
            <View style={{ flex: 2 }}>
              <Pressable onPress={() => openDatePicker('ardiyesizGiris', seferEditArdiyesizGiris)}>
                <TextInput
                  style={[styles.seferInput, styles.seferInputEditable]}
                  value={seferEditArdiyesizGiris}
                  editable={false}
                  pointerEvents="none"
                  placeholder="17/08/2026"
                  placeholderTextColor="#94a3b8"
                />
              </Pressable>
            </View>
            <View style={{ flex: 2 }}>
              <Pressable onPress={() => openDatePicker('freeDetention', seferEditFreeDetention)}>
                <TextInput
                  style={[styles.seferInput, styles.seferInputEditable]}
                  value={seferEditFreeDetention}
                  editable={false}
                  pointerEvents="none"
                  placeholder="20/02/2026"
                  placeholderTextColor="#94a3b8"
                />
              </Pressable>
            </View>
          </View>

        </View>

        {/* ==================== DATE PICKER CALENDAR MODAL ==================== */}
        <Modal
          visible={activeDateField !== null}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setActiveDateField(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActiveDateField(null)}>
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
                      return (
                        <Pressable
                          key={idx}
                          onPress={() => {
                            setCalendarDate(new Date(currentYear, idx, 1));
                            setPickerMode('calendar');
                          }}
                          style={({ pressed }) => [
                            styles.monthCell,
                            isSelected && styles.monthCellSelected,
                            pressed && { opacity: 0.7 },
                          ]}>
                          <ThemedText style={[styles.monthCellText, isSelected && styles.monthCellTextSelected]}>
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
                        return (
                          <Pressable
                            key={y}
                            onPress={() => {
                              setCalendarDate(new Date(y, currentMonth, 1));
                              setPickerMode('calendar');
                            }}
                            style={({ pressed }) => [
                              styles.yearCell,
                              isSelected && styles.yearCellSelected,
                              pressed && { opacity: 0.7 },
                            ]}>
                            <ThemedText style={[styles.yearCellText, isSelected && styles.yearCellTextSelected]}>
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
                  {/* Calendar Header (Month/Year & Prev/Next buttons) */}
                  <View style={styles.calendarHeader}>
                    <Pressable
                      onPress={() => setCalendarDate(new Date(currentYear, currentMonth - 1, 1))}
                      style={styles.calendarNavBtn}>
                      <ThemedText style={styles.calendarNavText}>‹</ThemedText>
                    </Pressable>

                    {/* Clickable Month & Year for quick Selection */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Pressable
                        onPress={() => setPickerMode('month')}
                        style={({ pressed }) => [styles.calendarTitlePill, pressed && { opacity: 0.8 }]}>
                        <ThemedText style={styles.calendarTitlePillText}>{TURKISH_MONTHS[currentMonth]}</ThemedText>
                      </Pressable>

                      <Pressable
                        onPress={() => setPickerMode('year')}
                        style={({ pressed }) => [styles.calendarTitlePill, pressed && { opacity: 0.8 }]}>
                        <ThemedText style={styles.calendarTitlePillText}>{currentYear}</ThemedText>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => setCalendarDate(new Date(currentYear, currentMonth + 1, 1))}
                      style={styles.calendarNavBtn}>
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
                      const isSelected = activeSelectedVal === formattedDateStr;

                      return (
                        <Pressable
                          key={index}
                          style={styles.dayCell}
                          onPress={() => handleSelectDate(item.year, item.month, item.day)}>
                          <View style={[styles.dayInner, isSelected && styles.dayInnerSelected]}>
                            <ThemedText
                              style={[
                                styles.dayText,
                                !item.isCurrent && styles.dayTextDisabled,
                                isSelected && styles.dayTextSelected,
                              ]}>
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

        {/* ==================== TIME PICKER MODAL (30-MIN INTERVALS, 24-HOUR) ==================== */}
        <Modal
          visible={activeTimeField !== null}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setActiveTimeField(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setActiveTimeField(null)}>
            <Pressable style={styles.timePickerCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.timePickerHeader}>
                <ThemedText style={styles.timePickerTitle}>Saat Seçiniz</ThemedText>
                <Pressable onPress={() => setActiveTimeField(null)} style={styles.timePickerCloseBtn}>
                  <ThemedText style={styles.timePickerCloseText}>✕</ThemedText>
                </Pressable>
              </View>

              <ScrollView style={styles.timeScrollView} showsVerticalScrollIndicator={true}>
                <View style={styles.timeGrid}>
                  {TIME_OPTIONS.map((timeStr) => {
                    const currentSelectedTime =
                      activeTimeField === 'talimatTime'
                        ? seferEditTalimatTime
                        : activeTimeField === 'beyannameTime'
                          ? seferEditBeyannameTime
                          : seferEditVgmTime;
                    const isSelected = currentSelectedTime === timeStr;

                    return (
                      <Pressable
                        key={timeStr}
                        onPress={() => handleSelectTime(timeStr)}
                        style={({ pressed }) => [
                          styles.timeItem,
                          isSelected && styles.timeItemSelected,
                          pressed && { opacity: 0.7 },
                        ]}>
                        <ThemedText style={[styles.timeItemText, isSelected && styles.timeItemTextSelected]}>
                          {timeStr}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  seferEditContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  seferEditContent: {
    padding: 16,
    alignItems: 'center',
  },
  seferEditHeaderBar: {
    width: '100%',
    maxWidth: 1100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  seferEditBackBtn: {
    backgroundColor: '#475569',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  seferEditBackBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  seferEditTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  seferEditSaveBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6,
  },
  seferEditSaveBtnText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '700',
  },
  seferEditCard: {
    width: '100%',
    maxWidth: 1100,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  seferOrangeHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FDB885',
    borderBottomWidth: 1,
    borderColor: '#f97316',
    alignItems: 'center',
  },
  seferOrangeHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  seferYellowHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#FEF08A',
    borderBottomWidth: 1,
    borderColor: '#eab308',
    alignItems: 'center',
  },
  seferYellowHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  seferCol4: {
    flex: 1,
  },
  seferInputRow: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  seferInput: {
    width: '100%',
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    fontSize: 13,
    color: '#0f172a',
    textAlign: 'left',
  },
  seferInputDisabled: {
    backgroundColor: '#f8fafc',
    color: '#334155',
    borderColor: '#cbd5e1',
  },
  seferInputEditable: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    color: '#0f172a',
    fontWeight: '500',
  },
  seferDropdownWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  seferDropdownIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    backgroundColor: '#f8fafc',
  },
  seferIconClose: {
    fontSize: 12,
    color: '#64748b',
  },
  seferIconArrow: {
    fontSize: 12,
    color: '#64748b',
  },
  // Modal & Picker Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  // Time Picker Styles
  timePickerCard: {
    width: 340,
    maxHeight: 460,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  timePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  timePickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  timePickerCloseBtn: {
    padding: 6,
  },
  timePickerCloseText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  timeScrollView: {
    maxHeight: 360,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  timeItem: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeItemSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  timeItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  timeItemTextSelected: {
    color: '#ffffff',
  },
});
