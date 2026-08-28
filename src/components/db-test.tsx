import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { DEFAULT_API_URL } from '@/constants/api';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

export function DbTest() {
  const theme = useTheme();
  const responsive = useResponsive();
  const defaultApiUrl = DEFAULT_API_URL;

  const [apiUrl, setApiUrl] = useState<string>(defaultApiUrl);
  const [loading, setLoading] = useState<boolean>(false);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<any[]>([]);

  // 1. Test Connection
  const handleTestConnection = async () => {
    setLoading(true);
    setStatusMessage(null);
    setDbInfo(null);
    setTables([]);
    setSelectedTable(null);
    setTableData([]);

    try {
      const cleanUrl = apiUrl.trim().replace(/\/$/, '');
      const response = await fetch(`${cleanUrl}/api/health`);
      const responseText = await response.text();
      let json: any;
      try {
        json = JSON.parse(responseText);
      } catch (pErr) {
        throw new Error(`Sunucu JSON yerine metin/HTML döndürdü (HTTP ${response.status}). URL'yi kontrol edin.`);
      }

      if (json.success) {
        setStatusMessage('✅ MSSQL Bağlantısı Başarılı!');
        setDbInfo(json.db);
        fetchTables(cleanUrl);
      } else {
        setStatusMessage(`MSSQL Bağlantısı Başarısız: ${json.message}`);
      }
    } catch (err: any) {
      setStatusMessage(` API'ye Bağlanılamadı (${err.message})`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch List of Tables
  const fetchTables = async (baseUrl: string) => {
    try {
      const response = await fetch(`${baseUrl}/api/tables`);
      const responseText = await response.text();
      let json: any;
      try {
        json = JSON.parse(responseText);
      } catch (pErr) {
        return;
      }
      if (json.success) {
        setTables(json.tables || []);
      }
    } catch (err: any) {
      console.error('Tablolar alınamadı:', err);
    }
  };

  // 3. Fetch Selected Table Rows
  const fetchTableData = async (tableName: string) => {
    setSelectedTable(tableName);
    setTableLoading(true);
    try {
      const cleanUrl = apiUrl.trim().replace(/\/$/, '');
      const response = await fetch(`${cleanUrl}/api/table/${tableName}`);
      const responseText = await response.text();
      let json: any;
      try {
        json = JSON.parse(responseText);
      } catch (pErr) {
        throw new Error(`Sunucu JSON yanıtı döndürmedi (HTTP ${response.status})`);
      }
      if (json.success) {
        setTableData(json.data || []);
      } else {
        setStatusMessage(`Tablo verisi alınamadı: ${json.message}`);
      }
    } catch (err: any) {
      setStatusMessage(`Hata: ${err.message}`);
    } finally {
      setTableLoading(false);
    }
  };

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, responsive.isTablet && styles.cardTablet]}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle" style={styles.headerTitle}>
          🗄️ MSSQL ATLASDB Bağlantısı
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Node.js REST API aracılığıyla MSSQL Server
        </ThemedText>
      </View>

      {/* API Endpoint Configuration */}
      <View style={[styles.inputSection, responsive.isTablet && styles.inputSectionTablet]}>
        <View style={styles.inputFieldContainer}>
          <ThemedText type="smallBold">API Endpoint URL:</ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.backgroundElement,
              },
            ]}
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="http://10.0.2.2:3000"
            placeholderTextColor="#888"
            autoCapitalize="none"
          />
        </View>

        {/* Quick URL Presets & Action Button on Tablet */}
        <View style={styles.actionContainer}>
          <View style={styles.presetRow}>
            <Pressable
              style={styles.presetBadge}
              onPress={() => setApiUrl('http://10.0.2.2:3000')}>
              <ThemedText type="small">Android (10.0.2.2)</ThemedText>
            </Pressable>
            <Pressable
              style={styles.presetBadge}
              onPress={() => setApiUrl('http://localhost:3000')}>
              <ThemedText type="small">Localhost (3000)</ThemedText>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleTestConnection}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>MSSQL Bağlantısını Test Et</ThemedText>
            )}
          </Pressable>
        </View>
      </View>

      {/* Connection Status Message */}
      {statusMessage && (
        <View
          style={[
            styles.statusBox,
            {
              backgroundColor: statusMessage.includes('✅')
                ? 'rgba(46, 125, 50, 0.12)'
                : 'rgba(211, 47, 47, 0.12)',
              borderColor: statusMessage.includes('✅') ? '#2e7d32' : '#d32f2f',
            },
          ]}>
          <ThemedText
            type="smallBold"
            style={{
              color: statusMessage.includes('✅') ? '#2e7d32' : '#d32f2f',
            }}>
            {statusMessage}
          </ThemedText>
          {dbInfo && (
            <ThemedText type="small" style={styles.dbDetails}>
              Veritabanı: {dbInfo.dbName} | Server Zamanı:{' '}
              {new Date(dbInfo.serverTime).toLocaleTimeString()}
            </ThemedText>
          )}
        </View>
      )}

      {/* Database Tables List */}
      {tables.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            ATLASDB Tabloları ({tables.length}):
          </ThemedText>
          <View style={styles.tableChipsContainer}>
            {tables.map((t, idx) => {
              const isSelected = selectedTable === t.TABLE_NAME;
              return (
                <Pressable
                  key={idx}
                  style={[
                    styles.chip,
                    responsive.isTablet && styles.chipTablet,
                    {
                      backgroundColor: isSelected
                        ? '#007AFF'
                        : theme.backgroundElement,
                    },
                  ]}
                  onPress={() => fetchTableData(t.TABLE_NAME)}>
                  <ThemedText
                    type="small"
                    style={[
                      styles.chipText,
                      isSelected && styles.selectedChipText,
                    ]}>
                    {t.TABLE_NAME}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* Table Data Preview */}
      {selectedTable && (
        <View style={styles.section}>
          <View style={styles.tableDataHeader}>
            <ThemedText type="smallBold">
              📋 {selectedTable} Tablosu Verileri ({tableData.length} kayıt):
            </ThemedText>
            {tableLoading && <ActivityIndicator size="small" color="#007AFF" />}
          </View>

          {tableData.length === 0 && !tableLoading ? (
            <ThemedText type="small" style={styles.emptyText}>
              Bu tabloda hiç kayıt bulunamadı veya tablo boş.
            </ThemedText>
          ) : (
            <FlatList
              key={responsive.isTablet ? 'tablet-db-grid' : 'mobile-db-list'}
              data={tableData}
              numColumns={responsive.isTablet ? 2 : 1}
              keyExtractor={(_, i) => i.toString()}
              scrollEnabled={false}
              columnWrapperStyle={responsive.isTablet ? { gap: Spacing.three } : undefined}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.dataCard,
                    responsive.isTablet && styles.dataCardTablet,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.backgroundElement,
                    },
                  ]}>
                  <ThemedText type="smallBold" style={styles.dataCardTitle}>
                    # Record {index + 1}
                  </ThemedText>
                  <ThemedText type="code" style={styles.dataText}>
                    {JSON.stringify(item, null, 2)}
                  </ThemedText>
                </View>
              )}
            />
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.four,
    width: '100%',
  },
  cardTablet: {
    padding: Spacing.five,
    borderRadius: Spacing.five,
    gap: Spacing.five,
  },
  cardHeader: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputSection: {
    gap: Spacing.two,
  },
  inputSectionTablet: {
    gap: Spacing.three,
  },
  inputFieldContainer: {
    gap: Spacing.one,
  },
  actionContainer: {
    gap: Spacing.two,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 14,
  },
  presetRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  presetBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,122,255,0.1)',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  statusBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    gap: 4,
  },
  dbDetails: {
    marginTop: 2,
    opacity: 0.85,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 14,
  },
  tableChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipTablet: {
    paddingHorizontal: Spacing.four,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 13,
  },
  selectedChipText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  tableDataHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.one,
  },
  emptyText: {
    fontStyle: 'italic',
    paddingVertical: Spacing.two,
  },
  dataCard: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    marginBottom: Spacing.two,
    gap: 4,
    flex: 1,
  },
  dataCardTablet: {
    padding: Spacing.four,
  },
  dataCardTitle: {
    fontSize: 12,
    color: '#007AFF',
  },
  dataText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
