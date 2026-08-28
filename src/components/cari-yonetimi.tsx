import { useEffect, useMemo, useRef, useState } from 'react';
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

export interface CustomerGridModel {
  rid?: string;
  unvan?: string;
  satis_temsilcisi?: string;
  musteri_temsilcisi?: string;
  dokumantasyon_temsilcisi?: string;
  ulke?: string;
  ulkeisim?: string;
  sehir?: string;
  musteri_grup?: string;
  vergi_dairesi?: string;
  vergi_no?: string;
  web_adresi?: string;
  odeme_sekli?: string;
  odeme_kuru?: string;
  tl_kur?: string;
  vade?: string;
  efatura?: string;
  muhasebe_not?: string;
  muhasebe_kodu?: string;
  musteri_grup_rengi?: string;
}

export interface CariItem {
  id: string;
  satisTemsilcisi: string;
  ulke: string;
  unvan: string;
  vade: string;
  musteriTemsilcisi: string;
  vergiNo: string;
  dokumantasyonTemsilcisi: string;
  sehir: string;
  grup: string;
  vergiDairesi: string;
  webAdresi: string;
  odemeSekli: string;
  odemeKuru: string;
  tlKuru: string;
  eFatura: string;
  muhasebeKodu: string;
  colorBadge?: string;
}

export interface CariYonetimiProps {
  onClose: () => void;
  onSelectCustomer: (customer: CariItem) => void;
  onOpenTeklifCreate?: (customer: CariItem) => void;
}

const BADGES = [
  { label: 'TÜC', bg: '#8B5CF6', grupId: 1 },
  { label: 'CAM', bg: '#0D9488', grupId: 2 },
  { label: 'POM', bg: '#06B6D4', grupId: 3 },
  { label: 'YDA', bg: '#F97316', grupId: 4 },
  { label: 'YIA', bg: '#3B82F6', grupId: 5 },
  { label: 'FOR', bg: '#64748B', grupId: 6 },
  { label: 'YIN', bg: '#22C55E', grupId: 7 },
  { label: 'UKN', bg: '#EAB308', grupId: 8 },
  { label: 'SAT', bg: '#EAB308', grupId: 9 },
  { label: 'DİS', bg: '#EF4444', grupId: 10 },
  { label: 'KAL', bg: '#000000', grupId: 11 },
  { label: 'ONB', bg: '#FACC15', grupId: 12 },
];

export function CariYonetimiScreen({
  onClose,
  onSelectCustomer,
  onOpenTeklifCreate,
}: CariYonetimiProps) {
  const insets = useSafeAreaInsets();
  const authContext = useAuth();
  const { user, token, apiUrl: contextApiUrl } = authContext || {};
  const authToken = token || user?.TOKEN || user?.token || '';

  const [dataList, setDataList] = useState<CariItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [selectedGrupId, setSelectedGrupId] = useState<number>(0);
  const [selectedPageSize, setSelectedPageSize] = useState<number>(10);

  const [selectedCustomerItem, setSelectedCustomerItem] = useState<CariItem | null>(null);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState<boolean>(false);

  const customerCacheRef = useRef<Record<number, CariItem[]>>({});

  const fetchCustomersFromApi = async (grupVal: number = 0, forceRefresh = false) => {
    if (!forceRefresh && customerCacheRef.current[grupVal]) {
      setDataList(customerCacheRef.current[grupVal]);
      return;
    }

    setIsLoading(true);
    const activeBaseUrl = (contextApiUrl || DEFAULT_API_URL).trim().replace(/\/$/, '');
    const primaryUrl = `${activeBaseUrl}/Customer/GetCustomerForGrid`;

    const requestBody = {
      GRUP: grupVal,
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

      const response = await fetch(primaryUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const jsonResult: CustomerGridModel[] = await response.json();
        if (Array.isArray(jsonResult)) {
          const mappedItems: CariItem[] = jsonResult.map((item: any, index) => {
            const actualRid = item.RID || item.rid || item.CustomerRID || item.customerRID || item.id || item.RID_GUID;
            return {
              id: actualRid || String(index + 1),
              RID: actualRid,
              CustomerRID: actualRid,
              rid: actualRid,
              unvan: item.unvan || item.UNVAN || item.CUSTOMERNAME || item.customername || '',
              satisTemsilcisi: item.satis_temsilcisi || item.SALESPRESENTATIVE || item.salespresentative || '',
              musteriTemsilcisi: item.musteri_temsilcisi || item.CUSTOMERPRESENTATIVE || item.customerpresentative || '',
              dokumantasyonTemsilcisi: item.dokumantasyon_temsilcisi || item.DOCUMENTATIONPRESENTATIVE || item.documentationpresentative || '',
              ulke: item.ulkeisim || item.ulke || item.COUNTRY || item.country || '',
              sehir: item.sehir || item.CITY || item.city || '',
              grup: item.musteri_grup || item.CUSTOMERGROUP || item.customergroup || item.grup || '',
              vergiDairesi: item.vergi_dairesi || item.TAXOFFICE || item.taxoffice || '',
              vergiNo: item.vergi_no || item.TAXNO || item.taxno || '',
              webAdresi: item.web_adresi || item.WEBADDRESS || item.webaddress || '',
              odemeSekli: item.odeme_sekli || item.PAYMENTTYPE || item.paymenttype || '',
              odemeKuru: item.odeme_kuru || item.PAYMENTCURRENCY || item.paymentcurrency || '',
              tlKuru: item.tl_kur || item.TLCURRENCY || item.tlcurrency || '',
              vade: item.vade || item.PAYMENTEXPIRE || item.paymentexpire || '',
              eFatura: item.efatura || item.EINVOICE || item.einvoice || '',
              muhasebeKodu: item.muhasebe_kodu || item.ACCOUNTINGCODE || item.accountingcode || '',
              colorBadge: item.musteri_grup_rengi || item.COLORBADGE || item.colorBadge || '',
              rawItem: item,
            };
          });
          customerCacheRef.current[grupVal] = mappedItems;
          setDataList(mappedItems);
        } else {
          setDataList([]);
        }
      } else {
        setDataList([]);
      }
    } catch (error) {
      console.log('GetCustomerForGrid fetch error:', error);
      setDataList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersFromApi(selectedGrupId);
  }, [selectedGrupId]);

  const topPadding = Platform.OS === 'web' ? 16 : Math.max(insets.top, 16);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({
    satisTemsilcisi: '',
    ulke: '',
    unvan: '',
    vade: '',
    musteriTemsilcisi: '',
    vergiNo: '',
    dokumantasyonTemsilcisi: '',
    sehir: '',
    grup: '',
    vergiDairesi: '',
    webAdresi: '',
    odemeSekli: '',
    odemeKuru: '',
    tlKuru: '',
    eFatura: '',
    muhasebeKodu: '',
  });

  const [debouncedColumnSearch, setDebouncedColumnSearch] = useState<Record<string, string>>(columnSearch);

  // Debounce main search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounce column search queries (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColumnSearch(columnSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [columnSearch]);

  const handleColumnSearchChange = (key: string, value: string) => {
    setColumnSearch((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    const emptyCols = {
      satisTemsilcisi: '',
      ulke: '',
      unvan: '',
      vade: '',
      musteriTemsilcisi: '',
      vergiNo: '',
      dokumantasyonTemsilcisi: '',
      sehir: '',
      grup: '',
      vergiDairesi: '',
      webAdresi: '',
      odemeSekli: '',
      odemeKuru: '',
      tlKuru: '',
      eFatura: '',
      muhasebeKodu: '',
    };
    setColumnSearch(emptyCols);
    setDebouncedColumnSearch(emptyCols);
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchQuery || Object.values(columnSearch).some((v) => v.trim() !== '')
  );

  // Memoized fast filtering with pre-extracted active column filter array
  const filteredData = useMemo(() => {
    if (!dataList || dataList.length === 0) return [];

    const q = debouncedSearchQuery.trim().toLowerCase();
    const activeColFilters = Object.entries(debouncedColumnSearch)
      .filter(([, val]) => val && val.trim() !== '')
      .map(([key, val]) => ({ key, val: val.trim().toLowerCase() }));

    if (!q && activeColFilters.length === 0) {
      return dataList;
    }

    return dataList.filter((item) => {
      if (q && !item.unvan.toLowerCase().includes(q)) {
        return false;
      }
      for (let i = 0; i < activeColFilters.length; i++) {
        const { key, val } = activeColFilters[i];
        const fieldVal = (item as any)[key] ? String((item as any)[key]).toLowerCase() : '';
        if (!fieldVal.includes(val)) {
          return false;
        }
      }
      return true;
    });
  }, [dataList, debouncedSearchQuery, debouncedColumnSearch]);

  const totalPages = Math.ceil(filteredData.length / selectedPageSize) || 1;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * selectedPageSize;
    return filteredData.slice(start, start + selectedPageSize);
  }, [filteredData, currentPage, selectedPageSize]);

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Top Round Badges Header */}
      <View style={styles.topBadgesRow}>
        <Pressable onPress={onClose} style={styles.closeHeaderBtn}>
          <ThemedText style={styles.closeHeaderBtnText}>Kapat</ThemedText>
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgesList}
        >
          {BADGES.map((b) => (
            <Pressable
              key={b.label}
              onPress={() => setSelectedGrupId(b.grupId === selectedGrupId ? 0 : b.grupId)}
              style={({ pressed }) => [
                styles.badgeCircle,
                { backgroundColor: b.bg },
                pressed && styles.btnPressed,
                selectedGrupId === b.grupId && styles.activeBadgeBorder,
              ]}
            >
              <ThemedText style={styles.badgeText}>{b.label}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Main Title Bar */}
      <View style={styles.titleBar}>
        <View style={styles.titleBarLeftRow}>
          <ThemedText style={styles.titleBarText}>Cari Listesi</ThemedText>
          {isLoading && (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginLeft: 10 }} />
          )}
        </View>

        <View style={styles.titleBarRight}>
          <Pressable
            onPress={() => setIsActionsModalOpen(true)}
            style={({ pressed }) => [
              styles.actionsDropdownBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <ThemedText style={styles.actionsDropdownText}>İşlemler</ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Grouping Hint Bar */}
      <View style={styles.groupingBar}>
        <ThemedText style={styles.groupingText}>
          Drag a column header here to group by that column
        </ThemedText>
      </View>

      {/* Main Data Table */}
      <ScrollView horizontal style={styles.tableScrollView} showsHorizontalScrollIndicator={true}>
        <View style={styles.tableContainer}>
          {/* Table Header Row */}
          <View style={styles.tableHeaderRow}>
            <View style={[styles.thCell, { width: 40 }]}>
              <ThemedText style={styles.thText}>Seç</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 60 }]}>
              <ThemedText style={styles.thText}>Kart</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 150 }]}>
              <ThemedText style={styles.thText}>Satış Temsilcisi</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 100 }]}>
              <ThemedText style={styles.thText}>Ülke</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 280 }]}>
              <ThemedText style={styles.thText}>Ünvan</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 70 }]}>
              <ThemedText style={styles.thText}>Vade</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 140 }]}>
              <ThemedText style={styles.thText}>Müşteri Temsilcisi</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 110 }]}>
              <ThemedText style={styles.thText}>Vergi No</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 160 }]}>
              <ThemedText style={styles.thText}>Dökümantasyon Temsilcisi</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 100 }]}>
              <ThemedText style={styles.thText}>Şehir</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 110 }]}>
              <ThemedText style={styles.thText}>Grup</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 160 }]}>
              <ThemedText style={styles.thText}>Vergi Dairesi</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 110 }]}>
              <ThemedText style={styles.thText}>Web Adresi</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 120 }]}>
              <ThemedText style={styles.thText}>Ödeme Şekli</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 100 }]}>
              <ThemedText style={styles.thText}>Ödeme Kuru</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 90 }]}>
              <ThemedText style={styles.thText}>TL Kuru</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 90 }]}>
              <ThemedText style={styles.thText}>E-Fatura</ThemedText>
            </View>
            <View style={[styles.thCell, { width: 120 }]}>
              <ThemedText style={styles.thText}>Muhasebe Kodu</ThemedText>
            </View>
          </View>

          {/* Table Search Inputs Row */}
          <View style={styles.tableSearchRow}>
            <View style={[styles.tdCell, { width: 40 }]} />
            <View style={[styles.tdCell, { width: 60 }]} />

            {/* Satış Temsilcisi */}
            <View style={[styles.tdCell, { width: 150 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.satisTemsilcisi}
                onChangeText={(val) => handleColumnSearchChange('satisTemsilcisi', val)}
              />
            </View>

            {/* Ülke */}
            <View style={[styles.tdCell, { width: 100 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.ulke}
                onChangeText={(val) => handleColumnSearchChange('ulke', val)}
              />
            </View>

            {/* Ünvan */}
            <View style={[styles.tdCell, { width: 280 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.unvan}
                onChangeText={(val) => handleColumnSearchChange('unvan', val)}
              />
            </View>

            {/* Vade */}
            <View style={[styles.tdCell, { width: 70 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.vade}
                onChangeText={(val) => handleColumnSearchChange('vade', val)}
              />
            </View>

            {/* Müşteri Temsilcisi */}
            <View style={[styles.tdCell, { width: 140 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.musteriTemsilcisi}
                onChangeText={(val) => handleColumnSearchChange('musteriTemsilcisi', val)}
              />
            </View>

            {/* Vergi No */}
            <View style={[styles.tdCell, { width: 110 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.vergiNo}
                onChangeText={(val) => handleColumnSearchChange('vergiNo', val)}
              />
            </View>

            {/* Dökümantasyon Temsilcisi */}
            <View style={[styles.tdCell, { width: 160 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.dokumantasyonTemsilcisi}
                onChangeText={(val) => handleColumnSearchChange('dokumantasyonTemsilcisi', val)}
              />
            </View>

            {/* Şehir */}
            <View style={[styles.tdCell, { width: 100 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.sehir}
                onChangeText={(val) => handleColumnSearchChange('sehir', val)}
              />
            </View>

            {/* Grup */}
            <View style={[styles.tdCell, { width: 110 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.grup}
                onChangeText={(val) => handleColumnSearchChange('grup', val)}
              />
            </View>

            {/* Vergi Dairesi */}
            <View style={[styles.tdCell, { width: 160 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.vergiDairesi}
                onChangeText={(val) => handleColumnSearchChange('vergiDairesi', val)}
              />
            </View>

            {/* Web Adresi */}
            <View style={[styles.tdCell, { width: 110 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.webAdresi}
                onChangeText={(val) => handleColumnSearchChange('webAdresi', val)}
              />
            </View>

            {/* Ödeme Şekli */}
            <View style={[styles.tdCell, { width: 120 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.odemeSekli}
                onChangeText={(val) => handleColumnSearchChange('odemeSekli', val)}
              />
            </View>

            {/* Ödeme Kuru */}
            <View style={[styles.tdCell, { width: 100 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.odemeKuru}
                onChangeText={(val) => handleColumnSearchChange('odemeKuru', val)}
              />
            </View>

            {/* TL Kuru */}
            <View style={[styles.tdCell, { width: 90 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.tlKuru}
                onChangeText={(val) => handleColumnSearchChange('tlKuru', val)}
              />
            </View>

            {/* E-Fatura */}
            <View style={[styles.tdCell, { width: 90 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.eFatura}
                onChangeText={(val) => handleColumnSearchChange('eFatura', val)}
              />
            </View>

            {/* Muhasebe Kodu */}
            <View style={[styles.tdCell, { width: 120 }]}>
              <TextInput
                style={styles.colSearchInput}
                placeholder="Ara..."
                placeholderTextColor="#94a3b8"
                value={columnSearch.muhasebeKodu}
                onChangeText={(val) => handleColumnSearchChange('muhasebeKodu', val)}
              />
            </View>
          </View>

          {/* Table Data Rows */}
          <ScrollView style={styles.tableBodyScrollView}>
            {filteredData.length === 0 && !isLoading ? (
              <View style={styles.emptyRowView}>
                <ThemedText style={styles.emptyRowText}>
                  {searchQuery ? `'${searchQuery}' aramasına uygun kayıt bulunamadı.` : 'Kayıt bulunamadı.'}
                </ThemedText>
              </View>
            ) : (
              paginatedData.map((row, index) => {
                const isSelected = selectedCustomerItem?.id === row.id;
                return (
                  <View
                    key={row.id + index}
                    style={[
                      styles.tableDataRow,
                      index % 2 === 1 && styles.tableDataRowAlt,
                      isSelected && styles.selectedTableRow,
                    ]}
                  >
                    {/* Checkbox (Selects customer for actions) */}
                    <View style={[styles.tdCell, { width: 40 }]}>
                      <Pressable
                        onPress={() => setSelectedCustomerItem(isSelected ? null : row)}
                        style={({ pressed }) => [
                          styles.checkboxTouchBox,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.checkboxOuter,
                            isSelected && styles.checkboxCheckedOuter,
                          ]}
                        >
                          {isSelected && (
                            <ThemedText style={styles.checkboxCheckMark}>✓</ThemedText>
                          )}
                        </View>
                      </Pressable>
                    </View>

                    {/* Edit Pencil Icon (Navigates to Müşteri Kartı) */}
                    <View style={[styles.tdCell, { width: 60 }]}>
                      <Pressable
                        onPress={() => onSelectCustomer(row)}
                        style={({ pressed }) => [
                          styles.editPencilBtn,
                          pressed && styles.btnPressed,
                        ]}
                      >
                        <ThemedText style={styles.editPencilText}>✏️</ThemedText>
                      </Pressable>
                    </View>

                    {/* Satış Temsilcisi */}
                    <View style={[styles.tdCell, { width: 150 }]}>
                      <ThemedText style={styles.tdText}>
                        {row.satisTemsilcisi}
                      </ThemedText>
                    </View>

                    {/* Ülke */}
                    <View style={[styles.tdCell, { width: 100 }]}>
                      <ThemedText style={styles.tdText}>{row.ulke}</ThemedText>
                    </View>

                    {/* Ünvan */}
                    <View style={[styles.tdCell, { width: 280 }]}>
                      <Pressable onPress={() => onSelectCustomer(row)}>
                        <ThemedText
                          style={[styles.tdText, styles.unvanLinkText]}
                          numberOfLines={1}
                        >
                          {row.unvan}
                        </ThemedText>
                      </Pressable>
                    </View>

                    {/* Vade */}
                    <View style={[styles.tdCell, { width: 70 }]}>
                      <ThemedText style={styles.tdText}>{row.vade}</ThemedText>
                    </View>

                    {/* Müşteri Temsilcisi */}
                    <View style={[styles.tdCell, { width: 140 }]}>
                      <ThemedText style={styles.tdText}>
                        {row.musteriTemsilcisi}
                      </ThemedText>
                    </View>

                    {/* Vergi No */}
                    <View style={[styles.tdCell, { width: 110 }]}>
                      <ThemedText style={styles.tdText}>{row.vergiNo}</ThemedText>
                    </View>

                    {/* Dökümantasyon Temsilcisi */}
                    <View style={[styles.tdCell, { width: 160 }]}>
                      <ThemedText style={styles.tdText}>
                        {row.dokumantasyonTemsilcisi}
                      </ThemedText>
                    </View>

                    {/* Şehir */}
                    <View style={[styles.tdCell, { width: 100 }]}>
                      <ThemedText style={styles.tdText}>{row.sehir}</ThemedText>
                    </View>

                    {/* Grup */}
                    <View style={[styles.tdCell, { width: 110 }]}>
                      <ThemedText style={styles.tdText}>{row.grup}</ThemedText>
                    </View>

                    {/* Vergi Dairesi */}
                    <View style={[styles.tdCell, { width: 160 }]}>
                      <ThemedText style={styles.tdText}>
                        {row.vergiDairesi}
                      </ThemedText>
                    </View>

                    {/* Web Adresi */}
                    <View style={[styles.tdCell, { width: 110 }]}>
                      <ThemedText style={styles.tdText}>{row.webAdresi}</ThemedText>
                    </View>

                    {/* Ödeme Şekli */}
                    <View style={[styles.tdCell, { width: 120 }]}>
                      <ThemedText style={styles.tdText}>{row.odemeSekli}</ThemedText>
                    </View>

                    {/* Ödeme Kuru */}
                    <View style={[styles.tdCell, { width: 100 }]}>
                      <ThemedText style={styles.tdText}>{row.odemeKuru}</ThemedText>
                    </View>

                    {/* TL Kuru */}
                    <View style={[styles.tdCell, { width: 90 }]}>
                      <ThemedText style={styles.tdText}>{row.tlKuru}</ThemedText>
                    </View>

                    {/* E-Fatura */}
                    <View style={[styles.tdCell, { width: 90 }]}>
                      <ThemedText style={styles.tdText}>{row.eFatura}</ThemedText>
                    </View>

                    {/* Muhasebe Kodu */}
                    <View style={[styles.tdCell, { width: 120 }]}>
                      <ThemedText style={styles.tdText}>
                        {row.muhasebeKodu}
                      </ThemedText>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Table Footer Bar */}
      <View style={styles.footerBar}>
        <View style={styles.footerLeft}>
          {hasActiveFilters && (
            <View style={styles.filterTagBox}>
              <ThemedText style={styles.filterTagText}>[Filtreli Liste]</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.footerRight}>
          <View style={styles.pageSizeRow}>
            <ThemedText style={styles.pageSizeText}>Sayfa Başına:</ThemedText>
            {[10, 25, 50, 100].map((size) => (
              <Pressable
                key={size}
                onPress={() => {
                  setSelectedPageSize(size);
                  setCurrentPage(1);
                }}
                style={[
                  styles.pageSizeBtn,
                  selectedPageSize === size && styles.pageSizeActiveBtn,
                ]}
              >
                <ThemedText
                  style={[
                    styles.pageSizeText,
                    selectedPageSize === size && styles.pageSizeActiveText,
                  ]}
                >
                  {size}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <View style={styles.paginationNavRow}>
            {/* First Page << */}
            <Pressable
              onPress={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              style={({ pressed }) => [
                styles.pageNavBtn,
                currentPage <= 1 && styles.pageNavDisabled,
                pressed && styles.btnPressed,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
            >
              <ThemedText style={[styles.pageNavBtnText, currentPage <= 1 && styles.pageNavTextDisabled]}>
                {'<<'}
              </ThemedText>
            </Pressable>

            {/* Prev Page < */}
            <Pressable
              onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={({ pressed }) => [
                styles.pageNavBtn,
                currentPage <= 1 && styles.pageNavDisabled,
                pressed && styles.btnPressed,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
            >
              <ThemedText style={[styles.pageNavBtnText, currentPage <= 1 && styles.pageNavTextDisabled]}>
                {'<'}
              </ThemedText>
            </Pressable>

            <ThemedText style={styles.paginationText}>
              Sayfa {currentPage} / {totalPages} ({filteredData.length} Kayıt)
            </ThemedText>

            {/* Next Page > */}
            <Pressable
              onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={({ pressed }) => [
                styles.pageNavBtn,
                currentPage >= totalPages && styles.pageNavDisabled,
                pressed && styles.btnPressed,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
            >
              <ThemedText style={[styles.pageNavBtnText, currentPage >= totalPages && styles.pageNavTextDisabled]}>
                {'>'}
              </ThemedText>
            </Pressable>

            {/* Last Page >> */}
            <Pressable
              onPress={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              style={({ pressed }) => [
                styles.pageNavBtn,
                currentPage >= totalPages && styles.pageNavDisabled,
                pressed && styles.btnPressed,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
            >
              <ThemedText style={[styles.pageNavBtnText, currentPage >= totalPages && styles.pageNavTextDisabled]}>
                {'>>'}
              </ThemedText>
            </Pressable>
          </View>

          {hasActiveFilters ? (
            <Pressable
              onPress={handleClearFilters}
              style={({ pressed }) => [
                styles.clearFilterBtn,
                pressed && styles.btnPressed,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
            >
              <ThemedText style={styles.clearFilterText}>Temizle</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* "... İşlemler" Actions Modal Dropdown */}
      {isActionsModalOpen && (
        <Modal
          transparent
          visible={isActionsModalOpen}
          onRequestClose={() => setIsActionsModalOpen(false)}
          animationType="fade"
        >
          <Pressable style={styles.modalOverlay} onPress={() => setIsActionsModalOpen(false)}>
            <Pressable style={styles.actionsModalCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.actionsModalHeader}>
                <ThemedText style={styles.actionsModalTitle}>İşlemler Menüsü</ThemedText>
                <Pressable onPress={() => setIsActionsModalOpen(false)} style={styles.actionsCloseBtn}>
                  <ThemedText style={styles.actionsCloseBtnText}>✕</ThemedText>
                </Pressable>
              </View>

              {/* Selected Customer Info Banner */}
              <View style={styles.actionsCustomerBanner}>
                {selectedCustomerItem ? (
                  <View>
                    <ThemedText style={styles.actionsBannerLabel}>Seçili Müşteri:</ThemedText>
                    <ThemedText style={styles.actionsBannerValue}>{selectedCustomerItem.unvan}</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={styles.actionsBannerWarning}>
                    Tabloda en soldaki kutucuğu (tik) işaretleyerek bir müşteri seçebilirsiniz.
                  </ThemedText>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsMenuList}>
                <Pressable
                  disabled={!selectedCustomerItem}
                  onPress={() => {
                    if (selectedCustomerItem) {
                      setIsActionsModalOpen(false);
                      if (onOpenTeklifCreate) {
                        onOpenTeklifCreate(selectedCustomerItem);
                      } else {
                        onSelectCustomer(selectedCustomerItem);
                      }
                    }
                  }}
                  style={({ pressed }) => [
                    styles.actionMenuItem,
                    !selectedCustomerItem && styles.actionMenuDisabled,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.actionMenuText, !selectedCustomerItem && styles.actionTextDisabled]}>
                      Teklif Oluştur Sayfasına Geç
                    </ThemedText>
                    <ThemedText style={styles.actionMenuSubText}>
                      {selectedCustomerItem ? `${selectedCustomerItem.unvan} için yeni teklif oluştur` : 'Önce listeden müşteri seçiniz'}
                    </ThemedText>
                  </View>
                </Pressable>

                <Pressable
                  disabled={!selectedCustomerItem}
                  onPress={() => {
                    if (selectedCustomerItem) {
                      setIsActionsModalOpen(false);
                      onSelectCustomer(selectedCustomerItem);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.actionMenuItem,
                    !selectedCustomerItem && styles.actionMenuDisabled,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.actionMenuText, !selectedCustomerItem && styles.actionTextDisabled]}>
                      Müşteri Kartına Git (Detay Gör)
                    </ThemedText>
                    <ThemedText style={styles.actionMenuSubText}>
                      {selectedCustomerItem ? `${selectedCustomerItem.unvan} kartını aç` : 'Önce listeden müşteri seçiniz'}
                    </ThemedText>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setIsActionsModalOpen(false);
                    fetchCustomersFromApi(selectedGrupId, true);
                  }}
                  style={({ pressed }) => [
                    styles.actionMenuItem,
                    pressed && styles.btnPressed,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.actionMenuText}>Cari Listesini Yenile</ThemedText>
                    <ThemedText style={styles.actionMenuSubText}>Sunucudan güncel müşteri listesini çek</ThemedText>
                  </View>
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
  topBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  closeHeaderBtn: {
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  badgesList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBadgeBorder: {
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },

  /* TITLE BAR */
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2b5292',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  titleBarLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleBarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  titleBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBoxInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 140,
  },
  searchInput: {
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
    flex: 1,
  },
  actionsDropdownBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  actionsDropdownText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },

  /* GROUPING BAR */
  groupingBar: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  groupingText: {
    fontSize: 11,
    color: '#94a3b8',
  },

  /* TABLE STYLES */
  tableScrollView: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tableContainer: {
    minWidth: 2300,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  thCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
  },
  thText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e40af',
  },

  tableSearchRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  tableBodyScrollView: {
    flex: 1,
  },
  tableDataRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tableDataRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tdCell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  tdText: {
    fontSize: 12,
    color: '#1e293b',
  },
  unvanLinkText: {
    fontWeight: '500',
    color: '#1d4ed8',
  },
  rowCheckbox: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  editPencilBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPencilText: {
    fontSize: 12,
  },
  emptyRowView: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRowText: {
    fontSize: 13,
    color: '#64748b',
  },
  colSearchInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 11,
    color: '#0f172a',
    height: 26,
  },

  /* FOOTER BAR */
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#0284c7',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTagBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  filterTagText: {
    fontSize: 11,
    color: '#3b82f6',
  },

  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageSizeBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: '#f1f5f9',
  },
  pageSizeActiveBtn: {
    backgroundColor: '#cbd5e1',
  },
  pageSizeText: {
    fontSize: 11,
    color: '#475569',
  },
  pageSizeActiveText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  paginationText: {
    fontSize: 11,
    color: '#64748b',
  },
  paginationNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageNavBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pageNavDisabled: {
    opacity: 0.35,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  pageNavBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  pageNavTextDisabled: {
    color: '#94a3b8',
  },
  clearFilterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearFilterText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '600',
  },
  btnPressed: {
    opacity: 0.7,
  },

  /* CHECKBOX & ROW SELECTION STYLES */
  checkboxTouchBox: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOuter: {
    width: 18,
    height: 18,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCheckedOuter: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  checkboxCheckMark: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    marginTop: -2,
  },
  selectedTableRow: {
    backgroundColor: '#e0f2fe',
  },

  /* ACTIONS MODAL DROPDOWN STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  actionsModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  actionsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 10,
  },
  actionsModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionsCloseBtn: {
    padding: 4,
  },
  actionsCloseBtnText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
  },
  actionsCustomerBanner: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  actionsBannerLabel: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '600',
  },
  actionsBannerValue: {
    fontSize: 14,
    color: '#0c4a6e',
    fontWeight: '800',
    marginTop: 2,
  },
  actionsBannerWarning: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  actionsMenuList: {
    gap: 10,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionMenuDisabled: {
    opacity: 0.5,
    backgroundColor: '#f1f5f9',
  },
  actionMenuIcon: {
    fontSize: 20,
  },
  actionMenuText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionTextDisabled: {
    color: '#94a3b8',
  },
  actionMenuSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
});
