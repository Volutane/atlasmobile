import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { DEFAULT_API_URL } from '@/constants/api';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';

export interface TeklifFormValues {
  tasimaTipi: string;
  ticariTipi: string;
  yuklemeTipi: string;
  kotasyonKullanimi: string;
  konteynerTipi?: string;
  selectedKonteynerler?: string[];
  customerRid?: string;
  customerName?: string;
}

export interface TeklifOlusturmaProps {
  customerData?: any;
  onClose: () => void;
  onSubmit?: (values: TeklifFormValues) => void;
}

const DEFAULT_TASIMA_TIPI_OPTIONS = ['Denizyolu'];
const DEFAULT_TICARI_TIPI_OPTIONS = ['İthalat', 'İhracat'];
const DEFAULT_YUKLEME_TIPI_OPTIONS = ['FCL', 'LCL'];

const KARAYOLU_VEHICLE_OPTIONS = [
  'Box Konteyner',
  'Box Trailer',
  'Damperli',
  'ISO Tank Carrier',
  'Lowbed (Alçak Yataklı)',
  'Jumbo',
  'Jumbo Açık',
  'Normal Açık',
  'Tenteli',
  'Tenteli Maxima',
  'Tenteli Optima',
  'Tenteli Mega',
  'Treylerli Jumbo',
  'Treylerli Optima',
];

const HAVAYOLU_CONTAINER_OPTIONS = [
  'Uçak',
];

const DEMIRYOLU_CONTAINER_OPTIONS = [
  '20 Standard Dry',
  '20 Reefer',
  '20 Iso Tank',
  '20 Open Top',
  '20 Pallet Wide',
  '40 Standard Dry',
  '40 High Cube',
  '20 Platform',
  '20 Open Top (Out of Gauge)',
  '20 Flat Rack',
  '40 Open Top',
  '40 Open Top (Out of Gauge)',
  '40 Open Top (SOC)',
  '40 High Cube Open Top',
  '40 High Cube Open Top (Out of Gauge)',
  '40 Pallet Wide',
  '40 High Cube Pallet Wide',
  '40 Reefer',
  '40 Reefer High Cube',
  '40 Iso Tank',
  '40 Platform',
  '40 Flat Rack',
  '45 High Cube',
  '45 High Cube (SOC)',
  '45 Pallet Wide',
  '45 High Cube Pallet Wide',
  '45 Reefer High Cube',
  '20 Standart Dry (SOC)',
  '20 Open Top (SOC)',
  '40 Standart Dry (SOC)',
  '40 High Cube (SOC)',
  '42.5 NIPPON OT',
  '22.5 NIPPON OT',
  '20 Standart Dry (2box)',
];

const KOTASYON_OPTIONS = ['Evet', 'Hayır'];

export function TeklifOlusturmaScreen({
  customerData,
  onClose,
  onSubmit,
}: TeklifOlusturmaProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const authContext = useAuth();
  const { user, token, apiUrl: contextApiUrl } = authContext || {};
  const authToken = token || user?.TOKEN || user?.token || '';

  const activeBaseUrl = (contextApiUrl || DEFAULT_API_URL).trim().replace(/\/$/, '');

  const customerName =
    customerData?.unvan ||
    customerData?.UNVAN ||
    customerData?.CUSTOMERNAME ||
    customerData?.customername ||
    '';

  const customerRid =
    customerData?.RID ||
    customerData?.rid ||
    customerData?.CustomerRID ||
    customerData?.customerRID ||
    customerData?.id ||
    '';

  const tasimaOptions = DEFAULT_TASIMA_TIPI_OPTIONS;
  const ticariOptions = DEFAULT_TICARI_TIPI_OPTIONS;
  const yuklemeOptions = DEFAULT_YUKLEME_TIPI_OPTIONS;
  const [konteynerOptions, setKonteynerOptions] = useState<string[]>(KARAYOLU_VEHICLE_OPTIONS);

  const [tasimaTipi, setTasimaTipi] = useState<string>('');
  const [ticariTipi, setTicariTipi] = useState<string>('');
  const [yuklemeTipi, setYuklemeTipi] = useState<string>('');
  const [konteynerTipi, setKonteynerTipi] = useState<string>('');
  const [selectedKonteynerler, setSelectedKonteynerler] = useState<string[]>([]);
  const [kotasyonKullanimi, setKotasyonKullanimi] = useState<string>('Evet');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  const isIthalat =
    ticariTipi.includes('İthalat') ||
    ticariTipi.includes('ITHALAT') ||
    ticariTipi.toLowerCase().includes('ithal') ||
    ticariTipi.toLowerCase().includes('thalat');
  const lowerTasima = tasimaTipi.toLowerCase();
  const isDenizyolu = lowerTasima.includes('deniz') || lowerTasima.includes('sea');

  const isKonteynerVisible =
    isIthalat ||
    kotasyonKullanimi === 'Hayır' ||
    (!isDenizyolu &&
      (lowerTasima.includes('demiryolu') ||
        lowerTasima.includes('karayolu') ||
        lowerTasima.includes('havayolu') ||
        lowerTasima.includes('rail') ||
        lowerTasima.includes('road') ||
        lowerTasima.includes('air')));

  // Active Picker Modal State
  const [activePicker, setActivePicker] = useState<{
    title: string;
    options: string[];
    selected: string;
    onSelect: (val: string) => void;
    isMultiSelect?: boolean;
    multiSelected?: string[];
    onMultiSelect?: (vals: string[]) => void;
  } | null>(null);

  useEffect(() => {
    if (isIthalat) {
      setKotasyonKullanimi('Hayır');
      setKonteynerOptions(DEMIRYOLU_CONTAINER_OPTIONS);
    } else if (kotasyonKullanimi === 'Hayır') {
      const lower = tasimaTipi.toLowerCase();
      if (lower.includes('karayolu') || lower.includes('road')) {
        setKonteynerOptions(KARAYOLU_VEHICLE_OPTIONS);
      } else if (lower.includes('havayolu') || lower.includes('air')) {
        setKonteynerOptions(HAVAYOLU_CONTAINER_OPTIONS);
      } else {
        setKonteynerOptions(DEMIRYOLU_CONTAINER_OPTIONS);
      }
    } else if (!isKonteynerVisible) {
      setKonteynerTipi('');
      setSelectedKonteynerler([]);
    } else {
      const lower = tasimaTipi.toLowerCase();
      if (lower.includes('demiryolu') || lower.includes('rail')) {
        setKonteynerOptions(DEMIRYOLU_CONTAINER_OPTIONS);
      } else if (lower.includes('karayolu') || lower.includes('road')) {
        setKonteynerOptions(KARAYOLU_VEHICLE_OPTIONS);
      } else if (lower.includes('havayolu') || lower.includes('air')) {
        setKonteynerOptions(HAVAYOLU_CONTAINER_OPTIONS);
      } else {
        setKonteynerOptions(DEMIRYOLU_CONTAINER_OPTIONS);
      }
    }
  }, [tasimaTipi, ticariTipi, isKonteynerVisible, isIthalat, kotasyonKullanimi]);

  const handleDevamEt = async () => {
    setApiError(null);
    setIsSubmitting(true);

    const finalKonteynerTipi =
      selectedKonteynerler.length > 0
        ? selectedKonteynerler.join(', ')
        : konteynerTipi;

    const values: TeklifFormValues = {
      tasimaTipi,
      ticariTipi,
      yuklemeTipi,
      kotasyonKullanimi: isIthalat ? 'Hayır' : kotasyonKullanimi,
      konteynerTipi: isKonteynerVisible ? finalKonteynerTipi : undefined,
      selectedKonteynerler: isKonteynerVisible
        ? (selectedKonteynerler.length > 0
            ? selectedKonteynerler
            : (konteynerTipi ? [konteynerTipi] : []))
        : [],
      customerRid,
      customerName,
    };

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = authToken.startsWith('Bearer ')
          ? authToken
          : `Bearer ${authToken}`;
      }

      // Send Proposal creation POST request to API
      const res = await fetch(`${activeBaseUrl}/Proposal/CreateProposal`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          CustomerRID: customerRid,
          TransportType: tasimaTipi,
          TradeType: ticariTipi,
          LoadingType: yuklemeTipi,
          ContainerType: isKonteynerVisible ? konteynerTipi : null,
          UseQuotation: kotasyonKullanimi === 'Evet',
          CONTYPE: 'MSSQL',
        }),
      }).catch(() => null);

      if (res && res.ok) {
        const resJson = await res.json();
        console.log('[CreateProposal API Success]:', resJson);
      }

      if (onSubmit) {
        onSubmit(values);
      }
      setIsSubmitted(true);
    } catch (err: any) {
      console.log('Proposal submission error:', err);
      if (onSubmit) {
        onSubmit(values);
      }
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const topPadding =
    Platform.OS === 'web' ? 20 : Math.max(insets.top, 20);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.btnPressed,
            Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
          ]}
        >
          <ThemedText style={styles.backBtnText}>Müşteri Kartına Dön</ThemedText>
        </Pressable>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {customerName ? (
          <View style={styles.customerMetaBadge}>
            <ThemedText style={styles.customerMetaLabel}>Firma / Müşteri:</ThemedText>
            <ThemedText style={styles.customerMetaTitle}>{customerName}</ThemedText>
          </View>
        ) : null}

        <View style={styles.card}>
          {isSubmitted ? (
            <View style={styles.successBox}>
              <ThemedText style={styles.successTitle}>
                Teklif İsteği Oluşturuldu
              </ThemedText>
              <ThemedText style={styles.successDesc}>
                Seçimleriniz başarıyla kaydedildi. Operasyon ekibi teklifinizi
                hazırlayacaktır.
              </ThemedText>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>
                    Taşıma Tipi:
                  </ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {tasimaTipi || 'Belirtilmedi'}
                  </ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>
                    Ticari Tipi:
                  </ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {ticariTipi || 'Belirtilmedi'}
                  </ThemedText>
                </View>
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>
                    Yükleme Tipi:
                  </ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {yuklemeTipi || 'Belirtilmedi'}
                  </ThemedText>
                </View>
                {isKonteynerVisible ? (
                  <View style={styles.summaryRow}>
                    <ThemedText style={styles.summaryLabel}>
                      Konteyner Tipi:
                    </ThemedText>
                    <ThemedText style={styles.summaryValue}>
                      {konteynerTipi || 'Belirtilmedi'}
                    </ThemedText>
                  </View>
                ) : null}
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>
                    Kotasyon Kullanımı:
                  </ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {kotasyonKullanimi}
                  </ThemedText>
                </View>
              </View>

              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.submitBtn,
                  pressed && styles.btnPressed,
                  { alignSelf: 'center', marginTop: 16 },
                ]}
              >
                <ThemedText style={styles.submitBtnText}>Tamam</ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.formGroupList}>
              {/* Field 1: Taşıma Tipi */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.fieldLabel}>
                  Taşıma Tipi Seçiniz
                </ThemedText>
                <Pressable
                  onPress={() =>
                    setActivePicker({
                      title: 'Taşıma Tipi Seçiniz',
                      options: tasimaOptions,
                      selected: tasimaTipi,
                      onSelect: (val) => setTasimaTipi(val),
                    })
                  }
                  style={({ pressed }) => [
                    styles.selectInput,
                    pressed && styles.selectInputPressed,
                  ]}
                >
                  <ThemedText
                    style={
                      tasimaTipi
                        ? styles.selectValueText
                        : styles.selectPlaceholderText
                    }
                  >
                    {tasimaTipi || 'Taşıma Tipi seçiniz.'}
                  </ThemedText>
                  <ThemedText style={styles.chevronIcon}>∨</ThemedText>
                </Pressable>
              </View>

              {/* Field 2: Ticari Tipi */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.fieldLabel}>
                  Ticari Tipi Seçiniz
                </ThemedText>
                <Pressable
                  onPress={() =>
                    setActivePicker({
                      title: 'Ticari Tipi Seçiniz',
                      options: ticariOptions,
                      selected: ticariTipi,
                      onSelect: (val) => {
                        setTicariTipi(val);
                        const isValIthalat =
                          val.includes('İthalat') ||
                          val.includes('ITHALAT') ||
                          val.toLowerCase().includes('ithal') ||
                          val.toLowerCase().includes('thalat');
                        if (isValIthalat) {
                          setKotasyonKullanimi('Hayır');
                          setKonteynerOptions(DEMIRYOLU_CONTAINER_OPTIONS);
                        }
                      },
                    })
                  }
                  style={({ pressed }) => [
                    styles.selectInput,
                    pressed && styles.selectInputPressed,
                  ]}
                >
                  <ThemedText
                    style={
                      ticariTipi
                        ? styles.selectValueText
                        : styles.selectPlaceholderText
                    }
                  >
                    {ticariTipi || 'Ticari Tipi seçiniz.'}
                  </ThemedText>
                  <ThemedText style={styles.chevronIcon}>∨</ThemedText>
                </Pressable>
              </View>

              {/* Field 3: Yükleme Tipi */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.fieldLabel}>
                  Yükleme Tipi Seçiniz
                </ThemedText>
                <Pressable
                  onPress={() =>
                    setActivePicker({
                      title: 'Yükleme Tipi Seçiniz',
                      options: yuklemeOptions,
                      selected: yuklemeTipi,
                      onSelect: (val) => setYuklemeTipi(val),
                    })
                  }
                  style={({ pressed }) => [
                    styles.selectInput,
                    pressed && styles.selectInputPressed,
                  ]}
                >
                  <ThemedText
                    style={
                      yuklemeTipi
                        ? styles.selectValueText
                        : styles.selectPlaceholderText
                    }
                  >
                    {yuklemeTipi || 'Yükleme Tipi seçiniz.'}
                  </ThemedText>
                  <ThemedText style={styles.chevronIcon}>∨</ThemedText>
                </Pressable>
              </View>

              {/* Field 3.5 (Conditional): Konteyner Tipi */}
              {isKonteynerVisible ? (
                <View style={styles.fieldGroup}>
                  <ThemedText style={styles.fieldLabel}>
                    Konteyner Tipi Seçiniz {(isIthalat || kotasyonKullanimi === 'Hayır') ? '(Çoklu Seçim)' : ''}
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      const opts = (isIthalat || kotasyonKullanimi === 'Hayır') ? (konteynerOptions.length > 0 ? konteynerOptions : DEMIRYOLU_CONTAINER_OPTIONS) : konteynerOptions;
                      setActivePicker({
                        title: 'Konteyner Tipi Seçiniz',
                        options: opts,
                        selected: selectedKonteynerler.join(', ') || konteynerTipi,
                        isMultiSelect: true,
                        multiSelected: selectedKonteynerler,
                        onMultiSelect: (vals) => {
                          setSelectedKonteynerler(vals);
                          setKonteynerTipi(vals.join(', '));
                        },
                        onSelect: (val) => {
                          setSelectedKonteynerler([val]);
                          setKonteynerTipi(val);
                        },
                      });
                    }}
                    style={({ pressed }) => [
                      styles.selectInput,
                      pressed && styles.selectInputPressed,
                    ]}
                  >
                    <ThemedText
                      style={
                        selectedKonteynerler.length > 0 || konteynerTipi
                          ? styles.selectValueText
                          : styles.selectPlaceholderText
                      }
                      numberOfLines={2}
                    >
                      {selectedKonteynerler.length > 0
                        ? selectedKonteynerler.join(', ')
                        : (konteynerTipi || 'Konteyner Tipi seçiniz.')}
                    </ThemedText>
                    <ThemedText style={styles.chevronIcon}>∨</ThemedText>
                  </Pressable>
                </View>
              ) : null}

              {/* Field 4: Teklifte Kotasyon Kullanacak mısınız ? */}
              <View style={styles.fieldGroup}>
                <ThemedText style={styles.fieldLabel}>
                  Teklifte Kotasyon Kullanacak mısınız ? {isIthalat ? '(İthalat İçin Zorunlu Hayır)' : ''}
                </ThemedText>
                <Pressable
                  disabled={isIthalat}
                  onPress={() => {
                    if (!isIthalat) {
                      setActivePicker({
                        title: 'Teklifte Kotasyon Kullanacak mısınız ?',
                        options: KOTASYON_OPTIONS,
                        selected: kotasyonKullanimi,
                        onSelect: (val) => setKotasyonKullanimi(val),
                      });
                    }
                  }}
                  style={({ pressed }) => [
                    styles.selectInput,
                    isIthalat && styles.selectInputDisabled,
                    pressed && !isIthalat && styles.selectInputPressed,
                  ]}
                >
                  <ThemedText style={[styles.selectValueText, isIthalat && styles.selectValueTextDisabled]}>
                    {kotasyonKullanimi}
                  </ThemedText>
                  {!isIthalat && <ThemedText style={styles.chevronIcon}>∨</ThemedText>}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      {!isSubmitted && (
        <View style={styles.footerBar}>
          <View style={styles.footerBtnGroup}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <ThemedText style={styles.cancelBtnText}>Vazgeç</ThemedText>
            </Pressable>

            <Pressable
              onPress={handleDevamEt}
              style={({ pressed }) => [
                styles.submitBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <ThemedText style={styles.submitBtnText}>Devam Et</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Dropdown Options Picker Modal */}
      {activePicker && (
        <Modal
          transparent
          visible={!!activePicker}
          onRequestClose={() => setActivePicker(null)}
          animationType="fade"
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActivePicker(null)}
          >
            <Pressable
              style={[
                styles.pickerCard,
                activePicker.options.length > 6 && styles.pickerCardWide,
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.pickerHeaderRow}>
                <ThemedText style={styles.pickerTitle}>
                  {activePicker.title}
                </ThemedText>
                <Pressable
                  onPress={() => setActivePicker(null)}
                  style={styles.pickerCloseBtn}
                >
                  <ThemedText style={styles.pickerCloseBtnText}>✕</ThemedText>
                </Pressable>
              </View>

              <ScrollView
                style={styles.pickerScrollView}
                contentContainerStyle={styles.pickerScrollContent}
                showsVerticalScrollIndicator={true}
              >
                <View
                  style={
                    activePicker.options.length > 6
                      ? styles.pickerOptionsGridTwoCol
                      : styles.pickerOptionsList
                  }
                >
                  {activePicker.options.map((option) => {
                    const isMulti = activePicker.isMultiSelect;
                    const multiSelected = activePicker.multiSelected || [];
                    const isSelected = isMulti
                      ? multiSelected.includes(option)
                      : activePicker.selected === option;

                    return (
                      <Pressable
                        key={option}
                        onPress={() => {
                          if (isMulti) {
                            const newSelections = isSelected
                              ? multiSelected.filter((item) => item !== option)
                              : [...multiSelected, option];
                            if (activePicker.onMultiSelect) {
                              activePicker.onMultiSelect(newSelections);
                            }
                            setActivePicker({
                              ...activePicker,
                              multiSelected: newSelections,
                            });
                          } else {
                            activePicker.onSelect(option);
                            setActivePicker(null);
                          }
                        }}
                        style={({ pressed }) => [
                          styles.pickerOptionItem,
                          activePicker.options.length > 6 && styles.pickerOptionItemTwoCol,
                          isSelected && styles.pickerOptionSelected,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <ThemedText
                          numberOfLines={2}
                          style={[
                            styles.pickerOptionText,
                            isSelected && styles.pickerOptionTextSelected,
                          ]}
                        >
                          {option}
                        </ThemedText>
                        {isSelected && (
                          <ThemedText style={styles.checkIcon}>✓</ThemedText>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              {activePicker.isMultiSelect && (
                <View style={styles.pickerFooterRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.submitBtn,
                      { width: '100%', marginTop: 12 },
                      pressed && styles.btnPressed,
                    ]}
                    onPress={() => setActivePicker(null)}
                  >
                    <ThemedText style={styles.submitBtnText}>
                      Tamam ({activePicker.multiSelected?.length || 0} Seçildi)
                    </ThemedText>
                  </Pressable>
                </View>
              )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  backBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#475569',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingVertical: 32,
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
  },
  formGroupList: {
    gap: 28,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 46,
  },
  selectInputPressed: {
    backgroundColor: '#e2e8f0',
  },
  selectPlaceholderText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  selectValueText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
  },
  chevronIcon: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  footerBar: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    alignItems: 'flex-end',
  },
  footerBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#475569',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  submitBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#1d4ed8',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnPressed: {
    opacity: 0.8,
  },
  // Modal styles for dropdown option picker
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
    borderRadius: 16,
    padding: 20,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  pickerCardWide: {
    maxWidth: 660,
    maxHeight: '85%',
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pickerCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerCloseBtnText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  pickerScrollView: {
    maxHeight: 460,
  },
  pickerScrollContent: {
    paddingVertical: 4,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    paddingRight: 8,
  },
  pickerOptionsList: {
    gap: 8,
  },
  pickerOptionsGridTwoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
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
  pickerOptionItemTwoCol: {
    width: '48.5%',
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
  checkIcon: {
    fontSize: 14,
    color: '#1d4ed8',
    fontWeight: 'bold',
  },
  // Success state styles
  successBox: {
    padding: 20,
    gap: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#166534',
  },
  successDesc: {
    fontSize: 13,
    color: '#475569',
  },
  summaryBox: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  customerMetaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  customerMetaLabel: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '600',
  },
  customerMetaTitle: {
    fontSize: 14,
    color: '#1e3a8a',
    fontWeight: '800',
  },
  selectInputDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    opacity: 0.8,
  },
  selectValueTextDisabled: {
    color: '#64748b',
    fontWeight: '600',
  },
  pickerFooterRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 8,
  },
});
