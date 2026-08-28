const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

app.use(cors());
app.use(express.json());

function normalizeKeysDeep(input) {
  if (Array.isArray(input)) return input.map(normalizeKeysDeep);
  if (input !== null && typeof input === 'object' && !(input instanceof Date)) {
    const out = {};
    for (const key of Object.keys(input)) out[key.toLowerCase()] = normalizeKeysDeep(input[key]);
    return out;
  }
  return input;
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[SERVER INCOMING] ${req.method} ${req.url}`);
  next();
});

// 1. Config Object
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT || '2438', 10),
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 15000,
    requestTimeout: 15000
  }
};

let poolPromise = null;

// Connection Pool Manager with logging and fallback
async function getPool() {
  if (!poolPromise) {
    poolPromise = (async () => {
      console.log(`[MSSQL] Connecting to ${process.env.DB_SERVER}:${process.env.DB_PORT}...`);
      console.log(`[MSSQL] User: "${process.env.DB_USER}", Password length: ${process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0}`);

      try {
        const pool = await sql.connect(dbConfig);
        console.log('[MSSQL] Connected successfully via config object!');
        return pool;
      } catch (firstErr) {
        console.warn('[MSSQL] Object config failed:', firstErr.message);

        if (process.env.DB_CONNECTION_STRING) {
          console.log('[MSSQL] Retrying via DB_CONNECTION_STRING...');
          const pool = await sql.connect(process.env.DB_CONNECTION_STRING);
          console.log('[MSSQL] Connected successfully via connection string!');
          return pool;
        }
        throw firstErr;
      }
    })().catch(err => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

// Helper to extract User GUID / RID from JWT token or raw string
function extractUserRid(str) {
  if (!str || typeof str !== 'string') return '';
  const cleanStr = str.trim();
  if (cleanStr.startsWith('ey') && cleanStr.includes('.')) {
    try {
      const parts = cleanStr.split('.');
      if (parts.length >= 2) {
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf8');
        const parsed = JSON.parse(payloadJson);
        const extracted =
          parsed['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
          parsed.sub ||
          parsed.nameidentifier ||
          parsed.userrid ||
          parsed.useraccountrid ||
          parsed.userAccountRid ||
          parsed.rid;
        if (extracted) return String(extracted).trim();
      }
    } catch (e) { }
  }
  return cleanStr;
}

// 4. Auth Login Endpoint (UserLoginControl)
// Accepts LoginRequest model: { USERNAME: string, PASSWORD: string } or { username: string, password: string }
async function handleUserLogin(req, res) {
  try {
    const username = req.body?.USERNAME || req.body?.username || req.body?.Username || req.body?.ISIM || req.body?.isim;
    const password = req.body?.PASSWORD || req.body?.password || req.body?.Password;

    if (!username || String(username).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı (USERNAME) boş olamaz'
      });
    }
    if (!password || String(password).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Şifre (PASSWORD) boş olamaz'
      });
    }

    const cleanUsername = String(username).trim();
    const cleanPassword = String(password).trim();

    // Direct API Connection to http://apa.linklojistik.com:1312/Login/UserLoginControl
    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const targetEndpoint = `${remoteApiUrl.replace(/\/$/, '')}/Login/UserLoginControl`;

    console.log(`[API Login] Connecting to ${targetEndpoint}...`);

    try {
      const loginPayload = {
        USERNAME: cleanUsername,
        PASSWORD: cleanPassword,
        username: cleanUsername,
        password: cleanPassword
      };

      const apiResponse = await fetch(targetEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(loginPayload)
      });

      const responseText = await apiResponse.text();
      let responseData = null;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseErr) {
        responseData = null;
      }

      if (apiResponse.ok && responseData) {
        const userToken = responseData.token || responseData.TOKEN || responseData.useraccountrid || responseData.USERACCOUNTRID || responseData.userrid || responseData.USERRID || responseData.rid || responseData.RID;
        const userRid = responseData.useraccountrid || responseData.USERACCOUNTRID || responseData.userrid || responseData.USERRID || responseData.rid || responseData.RID || extractUserRid(userToken);
        return res.json({
          success: true,
          message: responseData.message || responseData.Message || `Giriş başarılı! Hoş geldiniz, ${responseData.name || responseData.isim || cleanUsername}`,
          token: userToken,
          user: {
            ...responseData,
            USERACCOUNTRID: userRid,
            useraccountrid: userRid,
            USERRID: userRid,
            userrid: userRid,
            TOKEN: userToken
          }
        });
      } else if (responseData && (responseData.message || responseData.Message)) {
        return res.status(apiResponse.status || 401).json({
          success: false,
          message: responseData.message || responseData.Message
        });
      }
    } catch (apiErr) {
      console.warn('[API Forwarding Error]:', apiErr.message);
    }

    return res.status(401).json({
      success: false,
      message: `Kullanıcı girişi başarısız. Kullanıcı adı veya şifre hatalı. (API: ${targetEndpoint})`
    });

  } catch (error) {
    console.error('[Login Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Giriş işlemi sırasında sunucu hatası oluştu',
      error: error.message
    });
  }
}

app.all('/Login/UserLoginControl', handleUserLogin);
app.all('/login/UserLoginControl', handleUserLogin);
app.all('/api/auth/login', handleUserLogin);

// 6. Booking Search — sadece remote API kullanır
// API Dapper DynamicParameters: @searchparameter (string), @searchtype (string)
async function handleBookingSearch(req, res) {
  try {
    const searchparameter =
      req.query.searchparameter ||
      req.query.query ||
      req.query.code ||
      req.body?.searchparameter ||
      req.body?.SEARCHTEXT ||
      req.body?.query ||
      req.body?.code ||
      '';
    const searchtype =
      req.query.searchtype ||
      req.body?.searchtype ||
      req.body?.SEARCHTYPE ||
      'REFNOORAGENCYNO';

    const cleanQuery = String(searchparameter).trim();

    if (!cleanQuery) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Booking/BookingSearchBar`;

    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';

    const payload = JSON.stringify({
      SEARCHTEXT: cleanQuery,
      SEARCHTYPE: String(searchtype).trim(),
      searchparameter: cleanQuery,
      searchtype: String(searchtype).trim()
    });

    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    console.log(`[API Booking] POST ${targetUrl} (query: "${cleanQuery}")`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: payload,
      signal: controller.signal
    }).catch(err => {
      console.warn('[API Booking Fetch Warning]:', err.message);
      return null;
    });

    clearTimeout(timer);

    if (!apiRes) {
      return res.json({
        success: false,
        message: 'Uzaktan Booking API yanıt vermedi veya zaman aşımına uğradı',
        data: []
      });
    }

    const text = await apiRes.text();

    if (!apiRes.ok) {
      return res.status(apiRes.status || 502).json({
        success: false,
        message: `Remote API hatası: ${apiRes.status}`,
        raw: text
      });
    }

    let apiData = null;
    try { apiData = JSON.parse(text); } catch (e) { }

    const list = Array.isArray(apiData)
      ? apiData
      : Array.isArray(apiData?.data) ? apiData.data
        : Array.isArray(apiData?.result) ? apiData.result
          : Array.isArray(apiData?.items) ? apiData.items
            : [];

    console.log(`[API Booking] Returned ${list.length} items from remote API`);

    // Enrich items using DB stored procedure with individual 3s timeout
    const enrichedList = await Promise.all(
      list.map(async (item, index) => {
        let bookingRid = item.BookingRID || item.bookingRID || item.RID || item.rid;
        if (!bookingRid && item.resultpath) {
          const match = item.resultpath.match(/BookingRID=([a-fA-F0-9-]+)/i);
          if (match) bookingRid = match[1];
        }

        if (!bookingRid) {
          return { id: index + 1, booking_no: cleanQuery, ...item };
        }

        try {
          const dbPromise = (async () => {
            const pool = await getPool();
            const spReq = pool.request();
            spReq.input('bookingRID', sql.UniqueIdentifier, bookingRid);
            return await spReq.execute('SPGETBOOKINGWITHRIDFORMANAGEMENT');
          })();

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('DB Timeout')), 3000)
          );

          const spRes = await Promise.race([dbPromise, timeoutPromise]);

          if (spRes && spRes.recordset && spRes.recordset.length > 0) {
            const row = spRes.recordset[0];

            return {
              ...row,
              id: row.ID || index + 1,
              BookingRID: bookingRid,
              booking_no: row.BOOKINGNO || cleanQuery,
              booking_tarihi: row.BOOKINGDATE || row.CREATEDDATE,
              gemi_adi: row.SHIPNAME || row.VESSELNAME || row.gemi_adi,
              sefer_no: row.VOYAGENO || row.sefer_no,
              hat: row.LINENAME || row.hat,
              yukleme_limani: row.LOADINGPORT || row.yukleme_limani,
              tahliye_limani: row.DISCHARGEPORT || row.tahliye_limani,
              yukleme_yeri: row.LOADINGLOCATION || row.CUSTOMERNAME || row.yukleme_yeri,
              varis_yeri: row.DISCHARGELOCATION || row.varis_yeri,
              ticaret_tipi: row.TRADETYPE || row.COMMERCIALTYPE || row.commercialtype || row.ticaret_tipi,
              tasima_tipi: row.SHIPPINGTYPE || row.shippingtype || row.tasima_tipi,
              konteyner_tipleri: row.CONTAINERTYPES || row.CONTAINERS || row.containertypes || row.konteyner_tipleri,
              dosya_durumu: row.DOSYA_DURUMU || row.BOOKINGSTEP || row.bookingstep || (row.ISACTIVE ? 'AKTİF' : 'PASİF'),
              incoterm: row.INCOTERM || row.incoterm,
              toplam_alis: row.TOTALBUYINGCOST || row.TOTALBUYING || row.totalbuyingcost || row.toplam_alis || 0,
              toplam_satis: row.TOTALSELLINGCOST || row.TOTALSELLING || row.totalsellingcost || row.toplam_satis || 0,
              kar: row.PROFIT || row.TOTALPROFIT || row.profit || row.kar || 0,
              gercek_kar: row.REALPROFIT || row.realprofit || row.gercek_kar || 0,
              iptal: row.CANCEL !== undefined ? row.CANCEL : (row.ISDELETED ? 1 : 0),
              notlar: row.NOTE || row.notlar,
              satis_temsilcisi: row.SALESPRESENTATIVE || row.salespresentative || row.salesrepresentative || row.SATIS_TEMSILCISI || row.createdusername,
              musteri_temsilcisi: row.CUSTOMERPRESENTATIVE || row.customerpresentative || row.customerrepresentative || row.MUSTERI_TEMSILCISI,
              dokumantasyon_temsilcisi: row.DOCUMENTATIONPRESENTATIVE || row.documentationpresentative || row.documentationrepresentative || row.DOKUMANTASYON_TEMSILCISI,
              rezervasyon_sahibi: row.CUSTOMERNAME || row.customername || row.REZERVASYON_SAHIBI,
              teklif_numarasi: row.OFFERNO || row.offerno || row.TEKLIF_NO,
              kotasyon_numarasi: row.QUOTATIONNO || row.quotationno || row.KOTASYON_NO,
              odeme_tipi: row.PAYMENT || row.payment || row.paymenttype || row.ODEME_TIPI,
              yukleme_tipi: row.LOADINGTYPE || row.loadingtype || row.YUKLEME_TIPI,
              dolum_tipi: row.FILLINGTYPE || row.fillingtype || row.DOLUM_TIPI,
              beyanname_durumu: row.DECLARATION || row.declaration || row.BEYANNAME_DURUMU,
              talimat_durumu: row.INSTRUCTION || row.instruction || row.TALIMAT_DURUMU,
              fatura_durumu: row.INVOICE || row.invoice || row.FATURA_DURUMU,
              odeme_sekli: row.PAYMENTTYPE || row.paymenttype || row.ODEME_SEKLI,
              ens: row.ENSSTATUS || row.ensstatus || row.ENS,
              konteyner_izleme: row.CONTAINERTRACK || row.containertrack || row.KONTEYNER_IZLEME,
              konteyner_adedi_tipi: row.CONTAINERTYPES || row.containertypes || row.KONTEYNER_ADEDI_TIPI,
              kotasyon_notu: row.QUOTATIONNOTE || row.quotationnote || row.KOTASYON_NOTU,
              acente: row.AGENCY || row.agency || row.ACENTE,
              gumruk_mudurlugu: row.BOOKINGCUSTOM || row.custom || row.bookingcustom || row.GUMRUK_MUDURLUGU,
              kara_nakliye: row.LANDSHIPPING || row.landshipping || row.KARA_NAKLIYE,
              rez_teyit_formu: row.CONFIRMATIONFORM || row.confirmationform || row.REZ_TEYIT_FORMU,
              resultpath: item.resultpath,
              details: row
            };
          }
        } catch (e) {
          console.warn(`[Enrich Warning for RID ${bookingRid}]:`, e.message);
        }

        return { id: index + 1, booking_no: cleanQuery, ...item };
      })
    );

    return res.json({
      success: true,
      source: 'remote_api_enriched',
      query: cleanQuery,
      count: enrichedList.length,
      data: enrichedList
    });

  } catch (error) {
    console.error('[Booking Search Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'Booking araması sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/Booking/BookingSearchBar', handleBookingSearch);
app.all('/api/booking/BookingSearchBar', handleBookingSearch);
app.all('/api/booking/search', handleBookingSearch);

// 7. GetBookingWithRid Endpoint
// Accepts BookingRidSearchModel: { BOOKINGRID: Guid?, CONTYPE: string? }
async function handleGetBookingWithRid(req, res) {
  try {
    const bookingRid =
      req.body?.BOOKINGRID ||
      req.body?.bookingRID ||
      req.body?.bookingRid ||
      req.body?.RID ||
      req.body?.rid ||
      req.query?.BOOKINGRID ||
      req.query?.bookingRID ||
      req.query?.rid ||
      '';

    const contype =
      req.body?.CONTYPE ||
      req.body?.contype ||
      req.query?.CONTYPE ||
      req.query?.contype ||
      '';

    const cleanRid = String(bookingRid).trim();

    if (!cleanRid) {
      return res.status(400).json({
        success: false,
        message: 'BOOKINGRID parametresi gereklidir'
      });
    }

    console.log(`[API GetBookingWithRid] Fetching details for RID: ${cleanRid}, CONTYPE: ${contype}`);

    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Booking/GetBookingWithRid`;

    let remoteData = null;

    try {
      const payload = JSON.stringify({
        BOOKINGRID: cleanRid,
        CONTYPE: contype ? String(contype).trim() : null
      });

      const baseHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      if (authHeader) baseHeaders['Authorization'] = authHeader;

      const apiRes = await fetch(targetUrl, {
        method: 'POST',
        headers: baseHeaders,
        body: payload
      });

      console.log(`[API GetBookingWithRid] Remote status: ${apiRes.status}`);

      if (apiRes.ok) {
        const text = await apiRes.text();
        console.log(`[API GetBookingWithRid] Remote body: ${text.slice(0, 300)}`);
        try { remoteData = JSON.parse(text); } catch (e) { }
      }
    } catch (apiErr) {
      console.warn('[GetBookingWithRid Remote API Warning]:', apiErr.message);
    }

    // Secondary / Fallback: Query SQL Database SP or Tables using bookingRID
    let dbData = null;
    try {
      const pool = await getPool();
      const spReq = pool.request();
      spReq.input('bookingRID', sql.UniqueIdentifier, cleanRid);
      const spRes = await spReq.execute('SPGETBOOKINGWITHRIDFORMANAGEMENT');
      if (spRes.recordset && spRes.recordset.length > 0) {
        dbData = spRes.recordset[0];
      }
    } catch (dbErr) {
      console.warn('[GetBookingWithRid DB Warning]:', dbErr.message);
    }

    // Dynamic helper to search keys across DB data and Remote API data
    const getVal = (...keys) => {
      for (const k of keys) {
        if (remoteData && remoteData[k] !== undefined && remoteData[k] !== null && String(remoteData[k]).trim() !== '') return String(remoteData[k]).trim();
        if (dbData && dbData[k] !== undefined && dbData[k] !== null && String(dbData[k]).trim() !== '') return String(dbData[k]).trim();
      }
      return '';
    };

    const referanslar = (() => {
      let list = [];
      if (remoteData?.overseasagency) {
        const refVal = (remoteData.overseasagencyref && remoteData.overseasagencyref !== '-') ? remoteData.overseasagencyref : '';
        list.push({
          rid: remoteData.overseasagencyrid || remoteData.rid || remoteData.BookingRID || '',
          referans: refVal,
          numara: refVal,
          unvan: remoteData.overseasagency,
          rol: 'Yurt Dışı Acente (POL)',
          isOverseas: true
        });
      }
      if (Array.isArray(remoteData?.bookingshipperconsigneemodel) && remoteData.bookingshipperconsigneemodel.length > 0) {
        remoteData.bookingshipperconsigneemodel.forEach(r => {
          const name = r.title || r.customername || r.overseasagency || '';
          const refVal = (r.overseasref && r.overseasref !== '-') ? r.overseasref : ((r.referenceno && r.referenceno !== '-') ? r.referenceno : '');
          if (name && !list.some(item => item.unvan === name)) {
            list.push({
              rid: r.rid || r.RID || r.BookingRID || remoteData?.BookingRID || '',
              referans: refVal,
              numara: refVal,
              unvan: name,
              rol: r.type || '',
              isOverseas: false
            });
          }
        });
      } else if (Array.isArray(remoteData?.bookinglc) && remoteData.bookinglc.length > 0) {
        remoteData.bookinglc.forEach(r => {
          const name = r.customername || '';
          const refVal = (r.refno && r.refno !== '-') ? r.refno : '';
          if (name && !list.some(item => item.unvan === name)) {
            list.push({
              rid: r.rid || r.RID || r.BookingRID || remoteData?.BookingRID || '',
              referans: refVal,
              numara: refVal,
              unvan: name,
              rol: r.type || '',
              isOverseas: false
            });
          }
        });
      }
      if (list.length === 0 && (remoteData?.customername || dbData?.CUSTOMERNAME)) {
        list.push({ rid: remoteData?.BookingRID || dbData?.BookingRID || '', referans: '', numara: '', unvan: remoteData?.customername || dbData?.CUSTOMERNAME, rol: 'Müşteri / Acente', isOverseas: false });
      }
      return list;
    })();

    const rezDetayList = (() => {
      if (Array.isArray(remoteData?.bookingcontainermodel) && remoteData.bookingcontainermodel.length > 0) {
        return remoteData.bookingcontainermodel.map(c => ({
          konteyner_tipi: c.containertype || c.containertypelong || getVal('containertypes') || "20'SD",
          tonaj: c.estimatedtonnage ? `${c.estimatedtonnage} kg, tonaj` : '',
          tartim_notu: c.vgmtypedescription || '',
          vgm: c.vgm === 1 || c.vgm === true,
          hat_acente_rez_no: c.agencyref || getVal('shipvoyageno', 'voyageno', 'sefer_no') || '-',
          konteyner_no: c.containerno || '',
          yukleme_limani: c.loadingport || getVal('loadingport') || '-',
          depo: c.warehousename || '-',
          yukleme_tarihi_saati: (c.loadingdate && c.loadinghour) ? `${c.loadingdate} - ${c.loadinghour}` : (c.loadingdate || getVal('bookingdate') || '-'),
          yukleme_adresi: c.loadingaddress || '--',
          nakliyeci: c.transporter || '--'
        }));
      }
      return [];
    })();

    const notlarList = (() => {
      let list = [];
      if (Array.isArray(remoteData?.customerNotes) && remoteData.customerNotes.length > 0) {
        list = remoteData.customerNotes.map(n => ({
          departman: n.department || 'Genel',
          not: n.customernote || n.note || ''
        }));
      } else if (Array.isArray(remoteData?.bookingnotesmodel) && remoteData.bookingnotesmodel.length > 0) {
        list = remoteData.bookingnotesmodel.map(n => ({
          departman: n.department || 'Genel',
          not: n.note || n.customernote || ''
        }));
      }
      return list;
    })();

    const kurlar = (() => {
      const dol = remoteData?.sellingdollar || dbData?.sellingdollar;
      if (dol) {
        return {
          dolar: dol,
          euro: remoteData?.sellingeuro || dbData?.sellingeuro || '-',
          sterlin: remoteData?.sellingsterlin || dbData?.sellingsterlin || '-',
          euro_dolar: remoteData?.eurodollar || dbData?.eurodollar || '-',
          sterlin_dolar: remoteData?.sterlindollar || dbData?.sterlindollar || '-'
        };
      }
      return null;
    })();

    const mergedData = {
      BookingRID: cleanRid,
      CONTYPE: contype,
      ...(typeof remoteData === 'object' && remoteData ? remoteData : {}),
      ...(typeof dbData === 'object' && dbData ? dbData : {}),
      booking_no: getVal('bookingno', 'BOOKINGNO', 'booking_no', 'BookingNo', 'REFNO', 'REF_NO', 'refno') || cleanRid,
      booking_tarihi: getVal('bookingdate', 'BOOKINGDATE', 'booking_tarihi', 'BookingDate', 'CREATEDDATE', 'CREATED_DATE'),
      gemi_adi: getVal('shipname', 'SHIPNAME', 'VESSELNAME', 'VESSEL_NAME', 'gemi_adi', 'ShipName', 'VesselName'),
      sefer_no: getVal('voyageno', 'shipvoyageno', 'VOYAGENO', 'VOYAGE_NO', 'sefer_no', 'VoyageNo'),
      hat: getVal('line', 'LINENAME', 'LINE_NAME', 'hat', 'LineName'),
      yukleme_limani: getVal('loadingport', 'LOADINGPORT', 'PORT_OF_LOADING', 'yukleme_limani', 'LoadingPort', 'POL'),
      portrid: getVal('portrid', 'PORTRID', 'loadingportrid', 'LOADINGPORTRID', 'PortRid', 'PortRID'),
      voyagecutoffrid: getVal('voyagecutoffrid', 'VOYAGECUTOFFRID', 'VoyageCutOffRid', 'VoyageCutoffRid'),
      tahliye_limani: getVal('dischargeport', 'DISCHARGEPORT', 'PORT_OF_DISCHARGE', 'tahliye_limani', 'DischargePort', 'POD'),
      yukleme_yeri: getVal('loadinglocation', 'LOADINGLOCATION', 'yukleme_yeri', 'LoadingLocation'),
      varis_yeri: getVal('dischargelocation', 'DISCHARGELOCATION', 'varis_yeri', 'DischargeLocation'),
      ticaret_tipi: getVal('commercialtype', 'TRADETYPE', 'ticaret_tipi', 'TradeType'),
      tasima_tipi: getVal('shippingtype', 'SHIPPINGTYPE', 'tasima_tipi', 'ShippingType'),
      konteyner_tipleri: getVal('containertypes', 'CONTAINERTYPES', 'CONTAINERS', 'konteyner_tipleri', 'ContainerTypes') || contype,
      dosya_durumu: getVal('bookingstep', 'DOSYA_DURUMU', 'dosya_durumu', 'FILE_STATUS') || (dbData?.ISACTIVE === false ? 'PASİF' : (dbData?.ISACTIVE ? 'AKTİF' : '')),
      incoterm: getVal('incoterm', 'INCOTERM', 'Incoterm'),
      toplam_alis: getVal('totalbuyingcost', 'totalbuying', 'TOTALBUYINGCOST', 'TOTALBUYING', 'toplam_alis', 'TotalBuying'),
      toplam_satis: getVal('totalsellingcost', 'totalselling', 'TOTALSELLINGCOST', 'TOTALSELLING', 'toplam_satis', 'TotalSelling'),
      kar: getVal('profit', 'totalprofit', 'PROFIT', 'TOTALPROFIT', 'kar', 'Profit'),
      gercek_kar: getVal('realprofit', 'REALPROFIT', 'gercek_kar', 'RealProfit'),
      iptal: dbData?.CANCEL !== undefined ? dbData?.CANCEL : (remoteData?.CANCEL !== undefined ? remoteData?.CANCEL : (dbData?.ISDELETED ? 1 : 0)),
      notlar: getVal('NOTE', 'REMARKS', 'notlar', 'Notes', 'NOTLAR'),

      operasyon_asamasi: getVal('bookingstep', 'operasyon_asamasi', 'DOSYA_DURUMU') || 'Operasyon Aşamasında',
      bagli_ithalat_dosya: getVal('connectedprebooking', 'connectedprebookingno', 'BAGLI_ITHALAT_DOSYA', 'bagli_ithalat_dosya', 'CONNECTED_IMPORT_FILE') || '-',
      satis_temsilcisi: getVal('salespresentative', 'salesrepresentative', 'SATIS_TEMSILCISI', 'satis_temsilcisi', 'SALES_REP', 'SALESREP', 'SalesRep', 'createdusername') || '-',
      musteri_temsilcisi: getVal('customerpresentative', 'customerrepresentative', 'MUSTERI_TEMSILCISI', 'musteri_temsilcisi', 'CUSTOMER_REP', 'CUSTOMERREP', 'CustomerRep') || '-',
      dokumantasyon_temsilcisi: getVal('documentationpresentative', 'documentationrepresentative', 'DOKUMANTASYON_TEMSILCISI', 'dokumantasyon_temsilcisi', 'DOC_REP', 'DOCREP', 'DocRep') || '-',
      rezervasyon_sahibi: getVal('customername', 'REZERVASYON_SAHIBI', 'rezervasyon_sahibi', 'CUSTOMERNAME', 'CUSTOMER_NAME', 'CustomerName') || '-',
      teklif_numarasi: getVal('offerno', 'TEKLIF_NO', 'teklif_numarasi', 'OFFER_NO', 'OFFERNO', 'OfferNo') || '-',
      kotasyon_numarasi: getVal('quotationno', 'KOTASYON_NO', 'kotasyon_numarasi', 'QUOTATION_NO', 'QUOTATIONNO', 'QuotationNo') || '-',
      odeme_tipi: getVal('payment', 'paymenttype', 'ODEME_TIPI', 'odeme_tipi', 'PAYMENT_TYPE', 'PaymentType') || '-',
      yukleme_tipi: getVal('loadingtype', 'YUKLEME_TIPI', 'yukleme_tipi', 'LOADING_TYPE', 'LoadingType') || '-',
      dolum_tipi: getVal('fillingtype', 'DOLUM_TIPI', 'dolum_tipi', 'FILLING_TYPE', 'FillingType') || '-',
      beyanname_durumu: getVal('declaration', 'declarationstatus', 'BEYANNAME_DURUMU', 'beyanname_durumu', 'DECLARATION_STATUS', 'DeclarationStatus') || '-',
      fatura_durumu: getVal('invoice', 'invoicestatus', 'FATURA_DURUMU', 'fatura_durumu', 'INVOICE_STATUS', 'InvoiceStatus') || '-',
      odeme_sekli: getVal('paymenttype', 'paymentmethod', 'ODEME_SEKLI', 'odeme_sekli', 'PAYMENT_METHOD', 'PaymentMethod') || '-',
      konteyner_izleme: getVal('containertrack', 'containertracking', 'KONTEYNER_IZLEME', 'konteyner_izleme', 'CONTAINER_TRACKING', 'ContainerTracking') || '-',
      overseas: getVal('overseas', 'OVERSEAS', 'Overseas') || 'Evet',
      birlestirilmis_dosyalar: getVal('mergedfiles', 'mergedbookingno', 'BIRLESTIRILMIS_DOSYALAR', 'birlestirilmis_dosyalar', 'MERGED_FILES') || '-',
      rez_olusturma_tarihi: getVal('reservationdate', 'createddate', 'REZ_OLUSTURMA_TARIHI', 'rez_olusturma_tarihi', 'CREATEDDATE', 'CREATED_DATE'),
      rez_teyit_formu: getVal('confirmationform', 'REZ_TEYIT_FORMU', 'rez_teyit_formu', 'CONFIRMATION_FORM') || 'Teyit formu henüz gönderilmemiş',
      kara_nakliye: getVal('landshipping', 'KARA_NAKLIYE', 'kara_nakliye', 'LAND_TRANSPORT') || 'Hayır',
      tehlikelilik: getVal('flammability', 'flammabilitydescription', 'TEHLIKELILIK', 'tehlikelilik', 'HAZARDOUS', 'IS_HAZARDOUS') || 'Yanıtsız',
      teklif_gecerlilik_tarihi: getVal('offervaliditydate', 'TEKLIF_GECERLILIK_TARIHI', 'teklif_gecerlilik_tarihi', 'OFFER_VALIDITY_DATE'),
      free_time: getVal('freetime', 'FREE_TIME', 'free_time', 'FreeTime') || '-',
      konteyner_adedi_tipi: getVal('containertypes', 'KONTEYNER_ADEDI_TIPI', 'konteyner_adedi_tipi', 'CONTAINERTYPES', 'CONTAINERS') || '-',
      talimat_durumu: getVal('instruction', 'instructionstatus', 'TALIMAT_DURUMU', 'talimat_durumu', 'INSTRUCTION_STATUS') || '-',
      odeme_durumu: getVal('paymentstatus', 'ODEME_DURUMU', 'odeme_durumu', 'PAYMENT_STATUS') || '-',
      ens: getVal('ensstatus', 'ens', 'ENS', 'ENS') || '-',
      kotasyon_notu: getVal('quotationnote', 'KOTASYON_NOTU', 'kotasyon_notu', 'QUOTATION_NOTE') || '-',
      imo: getVal('imo', 'IMO', 'Imo'),
      yapim_yili: getVal('constructionyear', 'YAPIM_YILI', 'yapim_yili', 'BUILD_YEAR', 'BuildYear'),
      gemi_bayragi: getVal('shipcountry', 'GEMI_BAYRAGI', 'gemi_bayragi', 'VESSEL_FLAG', 'VesselFlag'),
      acente: getVal('agency', 'ACENTE', 'acente', 'AGENCY', 'Agency'),
      liman_ofisi: getVal('portoffice', 'LIMAN_OFISI', 'liman_ofisi', 'PORT_OFFICE', 'PortOffice'),
      talimat_cutoff: getVal('instructioncutoff', 'TALIMAT_CUTOFF', 'talimat_cutoff', 'INSTRUCTION_CUTOFF'),
      beyanname_cutoff: getVal('declarationcutoff', 'BEYANNAME_CUTOFF', 'beyanname_cutoff', 'DECLARATION_CUTOFF'),
      vgm_cutoff: getVal('vgmcutoff', 'VGM_CUTOFF', 'vgm_cutoff', 'VGM_CUTOFF'),
      eta: getVal('eta', 'ETA', 'Eta'),
      etd: getVal('etd', 'ETD', 'Etd'),
      ardiyesiz_giris: getVal('warehousefreeentry', 'bookingunstoragedentry', 'ARDIYESIZ_GIRIS', 'ardiyesiz_giris', 'STORAGE_FREE_ENTRY'),
      atd: getVal('atd', 'ATD', 'Atd', 'ACTUAL_DEPARTURE'),
      free_detention: getVal('freedetentiondate', 'FREE_DETENTION', 'free_detention', 'FreeDetention'),
      gumruk_mudurlugu: getVal('bookingcustom', 'custom', 'GUMRUK_MUDURLUGU', 'gumruk_mudurlugu', 'CUSTOMS_OFFICE'),
      yurt_disi_acente_adres: getVal('overseasaddress', 'YURT_DISI_ACENTE_ADRES', 'yurt_disi_acente_adres', 'OVERSEAS_AGENCY_ADDRESS'),
      referanslar,
      rezervasyon_detaylari_list: rezDetayList,
      notlar_list: notlarList,
      kurlar,
      rawFields: {
        ...(typeof remoteData === 'object' && remoteData ? remoteData : {}),
        ...(typeof dbData === 'object' && dbData ? dbData : {})
      }
    };

    return res.json({
      success: true,
      data: mergedData
    });
  } catch (error) {
    console.error('[GetBookingWithRid Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'GetBookingWithRid sorgusu çalıştırılamadı',
      error: error.message
    });
  }
}

app.all('/Booking/GetBookingWithRid', handleGetBookingWithRid);
app.all('/api/booking/GetBookingWithRid', handleGetBookingWithRid);
app.all('/api/booking/get-booking-with-rid', handleGetBookingWithRid);

// 8. Edit Overseas Reference Endpoint
// Accepts: { WHOEDITUSERRID: string, RID: string, REFERENCE: string }
async function handleEditOverseasReference(req, res) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    let rawUserRid = req.body?.WHOEDITUSERRID || req.body?.whoEditUserRID || req.body?.whoedituserrid || req.body?.useraccountrid || '';

    if ((!rawUserRid || rawUserRid.startsWith('ey')) && authHeader) {
      const match = authHeader.match(/Bearer\s+(.+)/i);
      if (match) rawUserRid = match[1].trim();
    }

    const whoEditUserRID = extractUserRid(rawUserRid);
    const rid = req.body?.RID || req.body?.rid || '';
    const reference = req.body?.REFERENCE || req.body?.reference || '';

    console.log(`[API EditOverseasReference] RID: ${rid}, WHOEDIT: ${whoEditUserRID}, REF: "${reference}"`);

    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Booking/EditOverseasReference`;

    const payload = JSON.stringify({
      WHOEDITUSERRID: whoEditUserRID,
      RID: rid,
      REFERENCE: reference
    });

    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: payload
    }).catch(err => {
      console.warn('[EditOverseasReference Remote API Error]:', err.message);
      return null;
    });

    if (!apiRes) {
      return res.status(502).json({
        success: false,
        message: 'Uzaktan API yanıt vermedi'
      });
    }

    const text = await apiRes.text();
    let responseData = null;
    try { responseData = JSON.parse(text); } catch (e) { }

    if (apiRes.ok) {
      return res.json(responseData || { success: true, message: 'Referans başarıyla değiştirildi!' });
    } else {
      return res.status(apiRes.status || 400).json({
        success: false,
        message: responseData?.message || responseData?.Message || `Remote API hatası: ${apiRes.status}`,
        raw: text
      });
    }
  } catch (error) {
    console.error('[EditOverseasReference Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'EditOverseasReference işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/Booking/EditOverseasReference', handleEditOverseasReference);
app.all('/api/booking/EditOverseasReference', handleEditOverseasReference);
app.all('/api/booking/edit-overseas-reference', handleEditOverseasReference);

// 9. Edit Shipper Consignee Reference Endpoint
// Accepts: { WHOEDITUSERRID: string, RID: string, REFERENCE: string }
async function handleEditShipperConsigneeReference(req, res) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    let rawUserRid = req.body?.WHOEDITUSERRID || req.body?.whoEditUserRID || req.body?.whoedituserrid || req.body?.useraccountrid || '';

    if ((!rawUserRid || rawUserRid.startsWith('ey')) && authHeader) {
      const match = authHeader.match(/Bearer\s+(.+)/i);
      if (match) rawUserRid = match[1].trim();
    }

    const whoEditUserRID = extractUserRid(rawUserRid);
    const rid = req.body?.RID || req.body?.rid || '';
    const reference = req.body?.REFERENCE || req.body?.reference || '';

    console.log(`[API EditShipperConsigneeReference] RID: ${rid}, WHOEDIT: ${whoEditUserRID}, REF: "${reference}"`);

    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Booking/EditShipperConsigneeReference`;

    const payload = JSON.stringify({
      WHOEDITUSERRID: whoEditUserRID,
      RID: rid,
      REFERENCE: reference
    });

    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: payload
    }).catch(err => {
      console.warn('[EditShipperConsigneeReference Remote API Error]:', err.message);
      return null;
    });

    if (!apiRes) {
      return res.status(502).json({
        success: false,
        message: 'Uzaktan API yanıt vermedi'
      });
    }

    const text = await apiRes.text();
    let responseData = null;
    try { responseData = JSON.parse(text); } catch (e) { }

    if (apiRes.ok) {
      return res.json(responseData || { success: true, message: 'Referans başarıyla değiştirildi!' });
    } else {
      return res.status(apiRes.status || 400).json({
        success: false,
        message: responseData?.message || responseData?.Message || `Remote API hatası: ${apiRes.status}`,
        raw: text
      });
    }
  } catch (error) {
    console.error('[EditShipperConsigneeReference Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'EditShipperConsigneeReference işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/Booking/EditShipperConsigneeReference', handleEditShipperConsigneeReference);
app.all('/api/booking/EditShipperConsigneeReference', handleEditShipperConsigneeReference);
app.all('/api/booking/edit-shipper-consignee-reference', handleEditShipperConsigneeReference);

// ISO 6346 Doğrulama Yardımcısı (4 Harf + 7 Rakam, Mod 11)
function isValidContainerNumberServer(containerNumber) {
  if (!containerNumber || typeof containerNumber !== 'string') {
    return false;
  }

  containerNumber = containerNumber.trim().toUpperCase();

  if (!/^[A-Z]{4}\d{7}$/.test(containerNumber)) {
    return false;
  }

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const c = containerNumber.charAt(i);
    let value;

    if (/[A-Z]/.test(c)) {
      value = c.charCodeAt(0) - 65 + 10;
      if (value >= 11) value++;
      if (value >= 22) value++;
      if (value >= 33) value++;
    } else {
      value = parseInt(c, 10);
    }

    sum += value * Math.pow(2, i);
  }

  let calculatedCheckDigit = sum % 11;
  if (calculatedCheckDigit === 10) {
    calculatedCheckDigit = 0;
  }

  const actualCheckDigit = parseInt(containerNumber.charAt(10), 10);
  return calculatedCheckDigit === actualCheckDigit;
}

// 10. Add Booking Container No Endpoint (Sadece Uzaktan API / Remote API Proxy)
async function handleAddBookingContainerNo(req, res) {
  try {
    const bookingContainerRID = req.body?.BOOKINGCONTAINERRID || req.body?.bookingContainerRID || req.body?.bookingcontainerrid || '';
    const containerNo = (req.body?.CONTAINERNO || req.body?.containerNo || req.body?.containerno || '').trim().toUpperCase();

    console.log(`[API AddBookingContainerNo] RID: "${bookingContainerRID}", ContainerNo: "${containerNo}"`);

    // 1. ISO 6346 Kontrolü (Backend Doğrulaması)
    if (!isValidContainerNumberServer(containerNo)) {
      console.warn(`[AddBookingContainerNo] ISO 6346 geçersiz: "${containerNo}"`);
      return res.status(400).json({
        status: "InvalidContainer",
        message: "Konteyner numarasını hatalı girdiniz (ISO 6346 doğrulama başarısız)."
      });
    }

    // 2. Uzaktan API'ye iletme (Remote API Forwarding)
    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Booking/AddBookingContainerNo`;

    const payload = JSON.stringify({
      BOOKINGCONTAINERRID: bookingContainerRID,
      CONTAINERNO: containerNo
    });

    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: payload
    }).catch(err => {
      console.warn('[AddBookingContainerNo Remote API Error]:', err.message);
      return null;
    });

    if (!apiRes) {
      return res.status(502).json({
        status: "Error",
        message: "Uzaktan API yanıt vermedi."
      });
    }

    const text = await apiRes.text();
    let responseData = null;
    try { responseData = JSON.parse(text); } catch (e) { }

    if (apiRes.ok) {
      return res.json(responseData || { status: "Success", message: "Konteyner numarası başarıyla eklendi." });
    } else {
      return res.status(apiRes.status || 400).json(responseData || {
        status: "Error",
        message: `Remote API hatası: ${apiRes.status}`,
        raw: text
      });
    }
  } catch (error) {
    console.error('[AddBookingContainerNo Error]:', error.message);
    res.status(500).json({
      status: "Error",
      message: 'AddBookingContainerNo işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/Booking/AddBookingContainerNo', handleAddBookingContainerNo);
app.all('/api/booking/AddBookingContainerNo', handleAddBookingContainerNo);
app.all('/api/booking/add-booking-container-no', handleAddBookingContainerNo);

// 11. User GetUsersForSelect Endpoint (Proxy to http://apa.linklojistik.com:1312/User/GetUsersForSelect)
async function handleGetUsersForSelect(req, res) {
  try {
    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/User/GetUsersForSelect`;

    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    console.log(`[API GetUsersForSelect] POST ${targetUrl}`);

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(req.body || {})
    }).catch(err => {
      console.warn('[GetUsersForSelect Remote API Error]:', err.message);
      return null;
    });

    if (!apiRes) {
      return res.status(502).json({
        success: false,
        message: 'Uzaktan API yanıt vermedi'
      });
    }

    const text = await apiRes.text();
    let responseData = null;
    try { responseData = JSON.parse(text); } catch (e) { }

    if (apiRes.ok) {
      return res.json(responseData || []);
    } else {
      return res.status(apiRes.status || 400).json({
        success: false,
        message: `Remote API hatası: ${apiRes.status}`,
        raw: text
      });
    }
  } catch (error) {
    console.error('[GetUsersForSelect Error]:', error.message);
    res.status(500).json({
      success: false,
      message: 'GetUsersForSelect işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/User/GetUsersForSelect', handleGetUsersForSelect);
app.all('/api/user/GetUsersForSelect', handleGetUsersForSelect);
app.all('/api/user/get-users-for-select', handleGetUsersForSelect);

// 12. Booking ChangePresentative Endpoint (Proxy to http://apa.linklojistik.com:1312/Booking/ChangePresentative)
async function handleChangePresentative(req, res) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    let rawUserRid = req.body?.WHOCHANGEUSERRID || req.body?.whoChangeUserRID || req.body?.whochangeuserrid || req.body?.useraccountrid || '';

    if ((!rawUserRid || rawUserRid.startsWith('ey')) && authHeader) {
      const match = authHeader.match(/Bearer\s+(.+)/i);
      if (match) rawUserRid = match[1].trim();
    }

    const whoChangeUserRID = extractUserRid(rawUserRid) || rawUserRid;
    const bookingRID = req.body?.BOOKINGRID || req.body?.bookingRID || req.body?.bookingrid || '';
    const rawType = req.body?.TYPE || req.body?.type || '';
    const userRID = req.body?.USERRID || req.body?.userRID || req.body?.userrid || '';

    // Normalize type parameter to expected backend endpoint values ('sales', 'customer', 'documentation')
    let type = String(rawType).toLowerCase().trim();
    if (type === 'satis' || type === 'salespresentative' || type === 'salesrepresentative') {
      type = 'sales';
    } else if (type === 'musteri' || type === 'customerpresentative' || type === 'customerrepresentative') {
      type = 'customer';
    } else if (type === 'dokumantasyon' || type === 'documentationpresentative' || type === 'documentationrepresentative' || type === 'doc') {
      type = 'documentation';
    }

    console.log(`[API ChangePresentative] BOOKINGRID: "${bookingRID}", WHOCHANGE: "${whoChangeUserRID}", TYPE: "${type}" (raw: "${rawType}"), USERRID: "${userRID}"`);

    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Booking/ChangePresentative`;

    const changePresentativeModel = {
      WHOCHANGEUSERRID: whoChangeUserRID,
      BOOKINGRID: bookingRID,
      TYPE: type,
      USERRID: userRID
    };

    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(changePresentativeModel)
    }).catch(err => {
      console.warn('[ChangePresentative Remote API Error]:', err.message);
      return null;
    });

    if (!apiRes) {
      return res.status(502).json({
        status: "Error",
        message: "Uzaktan API yanıt vermedi."
      });
    }

    const text = await apiRes.text();
    let responseData = null;
    try { responseData = JSON.parse(text); } catch (e) { }

    if (apiRes.ok) {
      return res.json(responseData || { status: "Success", message: "Temsilci başarıyla değiştirildi." });
    } else {
      return res.status(apiRes.status || 400).json(responseData || {
        status: "Error",
        message: `Remote API hatası: ${apiRes.status}`,
        raw: text
      });
    }
  } catch (error) {
    console.error('[ChangePresentative Error]:', error.message);
    res.status(500).json({
      status: "Error",
      message: 'ChangePresentative işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/Booking/ChangePresentative', handleChangePresentative);
app.all('/api/booking/ChangePresentative', handleChangePresentative);
app.all('/api/booking/change-presentative', handleChangePresentative);

// 13. Voyage EditVoyage Endpoint (Proxy to http://apa.linklojistik.com:1312/Voyage/EditVoyage)
async function handleEditVoyage(req, res) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    let rawUserRid = req.body?.WHOEDITUSERRID || req.body?.whoEditUserRid || req.body?.useraccountrid || '';

    if ((!rawUserRid || rawUserRid.startsWith('ey')) && authHeader) {
      const match = authHeader.match(/Bearer\s+(.+)/i);
      if (match) rawUserRid = match[1].trim();
    }

    const rawVoyageRID = req.body?.VOYAGERID || req.body?.voyageRID || req.body?.voyagerid || '';
    const voyageNo = req.body?.VOYAGENO || req.body?.voyageNo || req.body?.voyageno || '';
    const shipRID = req.body?.SHIPRID || req.body?.shipRID || req.body?.shiprid || '';
    const lineRID = req.body?.LINERID || req.body?.lineRID || req.body?.linerid || '';

    // Check if string is a valid GUID
    const isGuid = (val) => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val.trim());

    const voyageRID = isGuid(rawVoyageRID) ? rawVoyageRID.trim() : null;
    const cleanShipRID = isGuid(shipRID) ? shipRID.trim() : null;
    const cleanLineRID = isGuid(lineRID) ? lineRID.trim() : null;
    const cleanWhoEditUserRID = isGuid(whoEditUserRID) ? whoEditUserRID.trim() : null;

    console.log(`[API EditVoyage] VOYAGERID: "${voyageRID}", VOYAGENO: "${voyageNo}", SHIPRID: "${cleanShipRID}", LINERID: "${cleanLineRID}", WHOEDIT: "${cleanWhoEditUserRID}"`);

    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Voyage/EditVoyage`;

    const editVoyageModel = {
      VOYAGERID: voyageRID,
      VOYAGENO: voyageNo || null,
      SHIPRID: cleanShipRID,
      LINERID: cleanLineRID,
      WHOEDITUSERRID: cleanWhoEditUserRID
    };

    for (let key in editVoyageModel) {
      if (editVoyageModel[key] === '') {
        editVoyageModel[key] = null;
      }
    }

    const baseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(editVoyageModel)
    }).catch(err => {
      console.warn('[EditVoyage Remote API Error]:', err.message);
      return null;
    });

    if (!apiRes) {
      return res.json({
        status: "Success",
        message: "Sefer bilgileri kaydedildi."
      });
    }

    const text = await apiRes.text();
    console.log(`[EditVoyage Remote Response Status ${apiRes.status}]:`, text);
    let responseData = null;
    try { responseData = JSON.parse(text); } catch (e) { }

    if (apiRes.ok) {
      if (responseData && (responseData.status === "Error" || responseData.status === "error" || responseData.Status === "Error")) {
        return res.status(400).json(responseData);
      }
      return res.json(responseData || { status: "Success", message: "Sefer başarıyla güncellendi." });
    } else {
      return res.status(apiRes.status || 400).json(responseData || {
        status: "Error",
        message: responseData?.message || responseData?.Message || `Remote API hatası: ${apiRes.status}`,
        raw: text
      });
    }
  } catch (error) {
    console.error('[EditVoyage Error]:', error.message);
    res.status(500).json({
      status: "Error",
      message: 'EditVoyage işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/Voyage/EditVoyage', handleEditVoyage);
app.all('/api/voyage/EditVoyage', handleEditVoyage);
app.all('/api/voyage/edit-voyage', handleEditVoyage);

// 14. Voyage EditVoyageCutOff Endpoint (Proxy to http://apa.linklojistik.com:1312/Voyage/EditVoyageCutOff)
async function handleEditVoyageCutOff(req, res) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    let rawUserRid = req.body?.WHOEDITUSERRID || req.body?.whoEditUserRid || req.body?.useraccountrid || '';

    if ((!rawUserRid || rawUserRid.startsWith('ey')) && authHeader) {
      const match = authHeader.match(/Bearer\s+(.+)/i);
      if (match) rawUserRid = match[1].trim();
    }

    const whoEditUserRID = extractUserRid(rawUserRid) || rawUserRid;
    const voyageCutOffRID = req.body?.VOYAGECUTOFFRID || req.body?.voyageCutOffRID || req.body?.voyagecutoffrid || '';
    const portRID = req.body?.PORTRID || req.body?.portRID || req.body?.portrid || '';
    const etd = req.body?.ETD || req.body?.etd || '';
    const eta = req.body?.ETA || req.body?.eta || '';
    const ata = req.body?.ATA || req.body?.ata || '';
    const atd = req.body?.ATD || req.body?.atd || '';
    const unstorage = req.body?.UNSTORAGE || req.body?.unstored || req.body?.unstorage || '';
    const freeDetention = req.body?.FREEDETENTION || req.body?.freeDetention || req.body?.freedetention || '';
    const instruction = req.body?.INSTRUCTION || req.body?.instruction || '';
    const instructionHour = req.body?.INSTRUCTIONHOUR || req.body?.instructionHour || '';
    const declaration = req.body?.DECLARATION || req.body?.declaration || '';
    const declarationHour = req.body?.DECLARATIONHOUR || req.body?.declarationHour || '';
    const vgm = req.body?.VGM || req.body?.vgm || '';
    const vgmHour = req.body?.VGMHOUR || req.body?.vgmHour || '';

    const isGuid = (val) => typeof val === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val.trim());

    const cleanVoyageCutOffRID = isGuid(voyageCutOffRID) ? voyageCutOffRID.trim() : null;
    const cleanPortRID = isGuid(portRID) ? portRID.trim() : null;
    const cleanWhoEditUserRID = isGuid(whoEditUserRID) ? whoEditUserRID.trim() : null;

    console.log(`[API EditVoyageCutOff] VOYAGECUTOFFRID: "${cleanVoyageCutOffRID}", PORTRID: "${cleanPortRID}", ETD: "${etd}", ETA: "${eta}"`);

    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Voyage/EditVoyageCutOff`;

    const editCutOffModel = {
      VOYAGECUTOFFRID: cleanVoyageCutOffRID,
      PORTRID: cleanPortRID,
      WHOEDITUSERRID: cleanWhoEditUserRID,
      ETD: etd || null,
      ETA: eta || null,
      ATA: ata || null,
      ATD: atd || null,
      UNSTORAGE: unstorage || null,
      FREEDETENTION: freeDetention || null,
      INSTRUCTION: instruction || null,
      INSTRUCTIONHOUR: instructionHour || null,
      DECLARATION: declaration || null,
      DECLARATIONHOUR: declarationHour || null,
      VGM: vgm || null,
      VGMHOUR: vgmHour || null
    };

    for (let key in editCutOffModel) {
      if (editCutOffModel[key] === '') {
        editCutOffModel[key] = null;
      }
    }

    const baseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(editCutOffModel)
    }).catch(err => {
      console.warn('[EditVoyageCutOff Remote API Error]:', err.message);
      return null;
    });

    if (!apiRes) {
      return res.json({
        status: "Success",
        message: "Sefer CutOff bilgileri kaydedildi."
      });
    }

    const text = await apiRes.text();
    console.log(`[EditVoyageCutOff Remote Response Status ${apiRes.status}]:`, text);
    let responseData = null;
    try { responseData = JSON.parse(text); } catch (e) { }

    if (apiRes.ok) {
      if (responseData && (responseData.status === "Error" || responseData.status === "error" || responseData.Status === "Error")) {
        return res.status(400).json(responseData);
      }
      return res.json(responseData || { status: "Success", message: "Sefer CutOff başarıyla güncellendi." });
    } else {
      return res.status(apiRes.status || 400).json(responseData || {
        status: "Error",
        message: responseData?.message || responseData?.Message || `Remote API hatası: ${apiRes.status}`,
        raw: text
      });
    }
  } catch (error) {
    console.error('[EditVoyageCutOff Error]:', error.message);
    res.status(500).json({
      status: "Error",
      message: 'EditVoyageCutOff işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/Voyage/EditVoyageCutOff', handleEditVoyageCutOff);
app.all('/api/voyage/EditVoyageCutOff', handleEditVoyageCutOff);
app.all('/api/voyage/edit-voyage-cutoff', handleEditVoyageCutOff);

// 15. Customer GetCustomerForGrid Endpoint (Proxy to http://apa.linklojistik.com:1312/Customer/GetCustomerForGrid)
async function handleGetCustomerForGrid(req, res) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const rawGrup = req.body?.GRUP !== undefined ? req.body.GRUP : (req.body?.grup !== undefined ? req.body.grup : 0);

    const grupNum = Number(rawGrup);
    const grup = !isNaN(grupNum) ? grupNum : 0;

    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Customer/GetCustomerForGrid`;

    console.log(`[API GetCustomerForGrid] Proxying to "${targetUrl}" with GRUP: ${grup}`);

    const searchModel = {
      GRUP: grup
    };

    const baseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(searchModel)
    }).catch(err => {
      console.warn('[GetCustomerForGrid Remote API Error]:', err.message);
      return null;
    });

    if (!apiRes) {
      return res.status(503).json({
        status: "Error",
        message: "Uzak sunucuya erişilemedi"
      });
    }

    const text = await apiRes.text();
    console.log(`[GetCustomerForGrid Remote Response Status ${apiRes.status}]:`, text.substring(0, 150));
    let responseData = null;
    try { responseData = JSON.parse(text); } catch (e) { }

    if (apiRes.ok) {
      return res.json(responseData || []);
    } else {
      return res.status(apiRes.status || 400).json(responseData || {
        status: "Error",
        message: responseData?.message || responseData?.Message || `Remote API hatası: ${apiRes.status}`,
        raw: text
      });
    }
  } catch (error) {
    console.error('[GetCustomerForGrid Error]:', error.message);
    res.status(500).json({
      status: "Error",
      message: 'GetCustomerForGrid işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/Customer/GetCustomerForGrid', handleGetCustomerForGrid);
app.all('/api/Customer/GetCustomerForGrid', handleGetCustomerForGrid);
app.all('/api/customer/get-customer-for-grid', handleGetCustomerForGrid);
app.all('/GetCustomerForGrid', handleGetCustomerForGrid);

// Helper function to create generic Customer sub-endpoint proxy
function createCustomerSubProxy(endpointName) {
  return async (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
      const customerRid =
        req.body?.CustomerRID ||
        req.body?.customerRID ||
        req.body?.CustomerRid ||
        req.body?.rid ||
        req.body?.RID ||
        req.query?.CustomerRID ||
        '';
      const mode = req.body?.MODE || req.body?.mode || 'view';
      const contype = req.body?.CONTYPE || req.body?.contype || 'MSSQL';

      const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
      const base = remoteApiUrl.replace(/\/$/, '');
      const targetUrl = `${base}/Customer/${endpointName}`;

      console.log(`[API ${endpointName}] Proxying to "${targetUrl}" with CustomerRID: ${customerRid}`);

      const searchModel = {
        CustomerRID: customerRid,
        MODE: mode,
        CONTYPE: contype,
        ...(req.body || {})
      };

      const baseHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      };
      if (authHeader) baseHeaders['Authorization'] = authHeader;

      const apiRes = await fetch(targetUrl, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(searchModel)
      }).catch(err => {
        console.warn(`[${endpointName} Remote API Error]:`, err.message);
        return null;
      });

      if (!apiRes) {
        return res.status(503).json({ status: "Error", message: "Uzak sunucuya erişilemedi" });
      }

      const text = await apiRes.text();
      let responseData = null;
      try { responseData = JSON.parse(text); } catch (e) { }

      if (apiRes.ok) {
        return res.json(responseData || []);
      } else {
        return res.status(apiRes.status || 400).json(responseData || {
          status: "Error",
          message: `Remote API hatası: ${apiRes.status}`,
          raw: text
        });
      }
    } catch (error) {
      console.error(`[${endpointName} Error]:`, error.message);
      res.status(500).json({ status: "Error", message: `${endpointName} işlemi sırasında hata oluştu`, error: error.message });
    }
  };
}

// 16. Customer GetCustomerWithRid Endpoint (Proxy to http://apa.linklojistik.com:1312/Customer/GetCustomerWithRid)
async function handleGetCustomerWithRid(req, res) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const customerRid =
      req.body?.CustomerRID ||
      req.body?.customerRID ||
      req.body?.CustomerRid ||
      req.body?.rid ||
      req.body?.RID ||
      req.query?.CustomerRID ||
      req.query?.rid ||
      '';
    const mode = req.body?.MODE || req.body?.mode || 'view';
    const contype = req.body?.CONTYPE || req.body?.contype || 'MSSQL';

    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Customer/GetCustomerWithRid`;

    console.log(`[API GetCustomerWithRid] Proxying to "${targetUrl}" with CustomerRID: ${customerRid}, MODE: ${mode}`);

    const searchModel = {
      CustomerRID: customerRid,
      MODE: mode,
      CONTYPE: contype
    };

    const baseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(searchModel)
    }).catch(err => {
      console.warn('[GetCustomerWithRid Remote API Error]:', err.message);
      return null;
    });

    if (!apiRes) {
      return res.status(503).json({
        status: "Error",
        message: "Uzak sunucuya erişilemedi"
      });
    }

    const text = await apiRes.text();
    console.log(`[GetCustomerWithRid Remote Response Status ${apiRes.status}]:`, text.substring(0, 150));
    let responseData = null;
    try { responseData = JSON.parse(text); } catch (e) { }

    if (apiRes.ok && responseData) {
      let card = responseData.data || responseData.result || responseData.item || responseData.CustomerCardModel || responseData;

      const fetchSubEndpoint = async (endpointName, payload) => {
        try {
          const subUrl = `${base}/Customer/${endpointName}`;
          const subRes = await fetch(subUrl, {
            method: 'POST',
            headers: baseHeaders,
            body: JSON.stringify(payload)
          }).catch(() => null);
          if (subRes && subRes.ok) {
            const subText = await subRes.text();
            try {
              const subJson = JSON.parse(subText);
              return Array.isArray(subJson)
                ? subJson
                : (Array.isArray(subJson?.data) ? subJson.data : (Array.isArray(subJson?.result) ? subJson.result : []));
            } catch (e) { }
          }
        } catch (e) { }
        return [];
      };

      const payload = { CustomerRID: customerRid, MODE: mode, CONTYPE: contype };
      const userPosPayload = { CustomerRID: customerRid, CONTYPE: contype };

      const hasItems = (arr) => Array.isArray(arr) && arr.length > 0;

      const [
        officials,
        customs,
        countries,
        addresses,
        notes,
        finances,
        userPositions,
        files,
        meetings
      ] = await Promise.all([
        !hasItems(card.CustomerOfficials || card.customerOfficials || card.officials)
          ? fetchSubEndpoint('GetCustomerOfficialsWithRID', payload)
          : Promise.resolve(card.CustomerOfficials || card.customerOfficials || card.officials || []),

        !hasItems(card.CustomerCustoms || card.customerCustoms || card.customs)
          ? fetchSubEndpoint('GetCustomerCustomsWithRID', payload)
          : Promise.resolve(card.CustomerCustoms || card.customerCustoms || card.customs || []),

        !hasItems(card.CustomerCountries || card.customerCountries || card.countries)
          ? fetchSubEndpoint('GetCustomerCountriesWithRID', payload)
          : Promise.resolve(card.CustomerCountries || card.customerCountries || card.countries || []),

        !hasItems(card.CustomerAddreses || card.customerAddreses || card.customerAddresses || card.addresses)
          ? fetchSubEndpoint('GetCustomerAddressWithRID', payload)
          : Promise.resolve(card.CustomerAddreses || card.customerAddreses || card.customerAddresses || card.addresses || []),

        !hasItems(card.CustomerNotes || card.customerNotes || card.notes)
          ? fetchSubEndpoint('GetCustomerNotesWithRID', payload)
          : Promise.resolve(card.CustomerNotes || card.customerNotes || card.notes || []),

        !hasItems(card.CustomerFinancialInfos || card.customerFinancialInfos || card.financialInfos)
          ? fetchSubEndpoint('GetCustomerFinanceInfoWithRID', payload)
          : Promise.resolve(card.CustomerFinancialInfos || card.customerFinancialInfos || card.financialInfos || []),

        !hasItems(card.POSITIONUSERLIST || card.positionUserList || card.positionuserlist)
          ? fetchSubEndpoint('GetCustomerUserPosition', userPosPayload)
          : Promise.resolve(card.POSITIONUSERLIST || card.positionUserList || card.positionuserlist || []),

        !hasItems(card.CUSTOMERFILESMODEL || card.customerFilesModel || card.files)
          ? fetchSubEndpoint('GetCustomersFilesForManagement', payload)
          : Promise.resolve(card.CUSTOMERFILESMODEL || card.customerFilesModel || card.files || []),

        !hasItems(card.CustomerMeetings || card.customerMeetings || card.meetings)
          ? fetchSubEndpoint('GetCustomerMeetingsWithRID', payload)
          : Promise.resolve(card.CustomerMeetings || card.customerMeetings || card.meetings || []),
      ]);

      const enrichedCard = {
        ...card,
        CustomerOfficials: officials,
        CustomerCustoms: customs,
        CustomerCountries: countries,
        CustomerAddreses: addresses,
        CustomerNotes: notes,
        CustomerFinancialInfos: finances,
        POSITIONUSERLIST: userPositions,
        CUSTOMERFILESMODEL: files,
        CustomerMeetings: meetings,
      };

      console.log(`[API GetCustomerWithRid] Enriched sub-lists count -> Officials: ${officials.length}, Customs: ${customs.length}, Countries: ${countries.length}, Addresses: ${addresses.length}, Notes: ${notes.length}`);

      return res.json(enrichedCard);
    } else {
      return res.status(apiRes ? apiRes.status : 400).json(responseData || {
        status: "Error",
        message: responseData?.message || responseData?.Message || `Remote API hatası`,
        raw: text
      });
    }
  } catch (error) {
    console.error('[GetCustomerWithRid Error]:', error.message);
    res.status(500).json({
      status: "Error",
      message: 'GetCustomerWithRid işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/Customer/GetCustomerWithRid', handleGetCustomerWithRid);
app.all('/api/Customer/GetCustomerWithRid', handleGetCustomerWithRid);
app.all('/api/customer/get-customer-with-rid', handleGetCustomerWithRid);
app.all('/GetCustomerWithRid', handleGetCustomerWithRid);

// Sub-endpoint routes
const subEndpoints = [
  'GetCustomerOfficialsWithRID',
  'GetCustomerCustomsWithRID',
  'GetCustomerCountriesWithRID',
  'GetCustomerAddressWithRID',
  'GetCustomerNotesWithRID',
  'GetCustomerFinanceInfoWithRID',
  'GetCustomersFilesForManagement',
  'GetCustomerUserPosition'
];

subEndpoints.forEach(ep => {
  const handler = createCustomerSubProxy(ep);
  app.all(`/Customer/${ep}`, handler);
  app.all(`/api/Customer/${ep}`, handler);
  app.all(`/${ep}`, handler);
});

// Proposal Proxy Handlers
function createProposalProxy(endpointName) {
  return async (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
      const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
      const base = remoteApiUrl.replace(/\/$/, '');
      const targetUrl = `${base}/Proposal/${endpointName}`;

      console.log(`[API Proposal ${endpointName}] Proxying to "${targetUrl}"`);

      const baseHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      };
      if (authHeader) baseHeaders['Authorization'] = authHeader;

      const apiRes = await fetch(targetUrl, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(req.body || {})
      }).catch(err => {
        console.warn(`[Proposal/${endpointName} Remote API Error]:`, err.message);
        return null;
      });

      if (!apiRes) {
        return res.status(503).json({ status: "Error", message: "Uzak sunucuya erişilemedi" });
      }

      const text = await apiRes.text();
      let responseData = null;
      try { responseData = JSON.parse(text); } catch (e) { }

      if (apiRes.ok) {
        return res.json(responseData || { status: "Success", message: "İşlem başarılı" });
      } else {
        return res.status(apiRes.status || 400).json(responseData || {
          status: "Error",
          message: `Remote API hatası: ${apiRes.status}`,
          raw: text
        });
      }
    } catch (error) {
      console.error(`[Proposal/${endpointName} Error]:`, error.message);
      res.status(500).json({ status: "Error", message: `${endpointName} işlemi sırasında hata oluştu`, error: error.message });
    }
  };
}

const proposalEndpoints = [
  'CreateProposal',
  'AddProposal',
  'SaveProposal',
  'GetTransportTypes',
  'GetTradeTypes',
  'GetLoadingTypes',
  'GetContainerTypes',
  'GetEquipmentTypes',
  'GetProposalList'
];

proposalEndpoints.forEach(ep => {
  const handler = createProposalProxy(ep);
  app.all(`/Proposal/${ep}`, handler);
  app.all(`/api/Proposal/${ep}`, handler);
  app.all(`/${ep}`, handler);
});

// Offer Proxy & Stored Procedure Handlers
async function handleGetQuotationsForCreateOffer(req, res) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Offer/GetQuotationsForCreateOffer`;

    console.log(`[API Offer GetQuotationsForCreateOffer] Proxying to "${targetUrl}"`);

    const baseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(req.body || {})
    }).catch(err => {
      console.warn('[GetQuotationsForCreateOffer Remote API Error]:', err.message);
      return null;
    });

    if (apiRes && apiRes.ok) {
      const text = await apiRes.text();
      try {
        const json = JSON.parse(text);
        return res.json(json);
      } catch (e) {
        return res.send(text);
      }
    }

    // Direct MSSQL Fallback via Stored Procedure SPGETQUOTATIONSWITHINFO
    console.log('[GetQuotationsForCreateOffer] Attempting direct MSSQL stored procedure SPGETQUOTATIONSWITHINFO...');
    const pool = await getPool();
    const request = pool.request();

    const body = req.body || {};
    request.input('lineRID', sql.UniqueIdentifier, body.LINERID || body.lineRID || null);
    request.input('loadingLocationRID', sql.UniqueIdentifier, body.LOADINGLOCATIONRID || body.loadingLocationRID || null);
    request.input('loadingPortRID', sql.UniqueIdentifier, body.LOADINGPORTRID || body.loadingPortRID || null);
    request.input('dischargePortRID', sql.UniqueIdentifier, body.DISCHARGEPORTRID || body.dischargePortRID || null);
    request.input('dischargeLocationRID', sql.UniqueIdentifier, body.DISCHARGELOCATIONRID || body.dischargeLocationRID || null);
    request.input('containerTypeRIDs', sql.VarChar, body.CONTAINERTYPERIDS || body.containerTypeRIDs || null);
    request.input('customerRID', sql.UniqueIdentifier, body.CUSTOMERRID || body.customerRID || null);
    request.input('loaderRID', sql.UniqueIdentifier, body.LOADERRID || body.loaderRID || null);
    request.input('shippingType', sql.VarChar, body.SHIPPINGTYPE || body.shippingType || null);
    request.input('commercialType', sql.VarChar, body.COMMERCIALTYPE || body.commercialType || null);
    request.input('loadingType', sql.VarChar, body.LOADINGTYPE || body.loadingType || null);
    request.input('fillingType', sql.VarChar, body.FILLINGTYPE || body.fillingType || null);
    request.input('flammability', sql.VarChar, body.FLAMMABILITY || body.flammability || null);
    request.input('payment', sql.VarChar, body.PAYMENT || body.payment || null);

    const spResult = await request.execute('SPGETQUOTATIONSWITHINFO');
    const recordset = spResult.recordset || [];
    return res.json(recordset);
  } catch (error) {
    console.error('[GetQuotationsForCreateOffer Error]:', error.message);
    return res.status(500).json({
      status: "Error",
      message: 'GetQuotationsForCreateOffer işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

function createOfferProxy(endpointName) {
  return async (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
      const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
      const base = remoteApiUrl.replace(/\/$/, '');
      const targetUrl = `${base}/Offer/${endpointName}`;

      console.log(`[API Offer ${endpointName}] Proxying to "${targetUrl}"`);

      const baseHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      };
      if (authHeader) baseHeaders['Authorization'] = authHeader;

      const apiRes = await fetch(targetUrl, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify(req.body || {})
      }).catch(err => {
        console.warn(`[Offer/${endpointName} Remote API Error]:`, err.message);
        return null;
      });

      if (!apiRes) {
        return res.status(503).json({ status: "Error", message: "Uzak sunucuya erişilemedi" });
      }

      const text = await apiRes.text();
      let responseData = null;
      try { responseData = JSON.parse(text); } catch (e) { }

      if (apiRes.ok) {
        return res.json(responseData !== null ? responseData : []);
      } else {
        return res.status(apiRes.status || 400).json(responseData || {
          status: "Error",
          message: `Remote API hatası: ${apiRes.status}`,
          raw: text
        });
      }
    } catch (error) {
      console.error(`[Offer/${endpointName} Error]:`, error.message);
      res.status(500).json({ status: "Error", message: `${endpointName} işlemi sırasında hata oluştu`, error: error.message });
    }
  };
}

const offerEndpoints = [
  'GetQuotationsContainers',
  'GetQuotationsContainerExpenses',
  'GetQuotationsContainerExtendedExpenses',
  'LoaderBlackListControl',
  'GetFillingTypes',
  'GetPaymentTypes',
  'GetFlammabilityTypes',
  'GetOfferWithRid',
  'CreateOffer',
  'OfferNew',
  'SaveOffer',
];

app.all('/Offer/GetQuotationsForCreateOffer', handleGetQuotationsForCreateOffer);
app.all('/api/Offer/GetQuotationsForCreateOffer', handleGetQuotationsForCreateOffer);
app.all('/GetQuotationsForCreateOffer', handleGetQuotationsForCreateOffer);

offerEndpoints.forEach(ep => {
  const handler = createOfferProxy(ep);
  app.all(`/Offer/${ep}`, handler);
  app.all(`/api/Offer/${ep}`, handler);
  app.all(`/${ep}`, handler);
});

// Generic Proxy: forwards to remote API, supports both GET (query params) and POST (body)
function createGenericProxy(method, remotePath) {
  return async (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
      const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
      const base = remoteApiUrl.replace(/\/$/, '');

      let targetUrl = `${base}${remotePath}`;

      // For GET, forward query params from the incoming request
      if (method === 'GET') {
        const idx = req.originalUrl.indexOf('?');
        if (idx !== -1) targetUrl += req.originalUrl.substring(idx);
      }

      console.log(`[API Generic Proxy] ${method} "${targetUrl}"`);

      const baseHeaders = { 'Accept': 'application/json' };
      if (method === 'POST') baseHeaders['Content-Type'] = 'application/json; charset=utf-8';
      if (authHeader) baseHeaders['Authorization'] = authHeader;

      const fetchOptions = { method, headers: baseHeaders };
      if (method === 'POST') fetchOptions.body = JSON.stringify(req.body || {});

      const apiRes = await fetch(targetUrl, fetchOptions).catch(err => {
        console.warn(`[GenericProxy ${remotePath} Error]:`, err.message);
        return null;
      });

      if (!apiRes) return res.status(503).json({ status: "Error", message: "Uzak sunucuya erişilemedi" });

      const text = await apiRes.text();
      let responseData = null;
      try { responseData = JSON.parse(text); } catch (e) { }

      if (apiRes.ok) {
        return res.json(responseData !== null ? responseData : []);
      } else {
        return res.status(apiRes.status || 400).json(responseData || { status: "Error", message: `Remote API hatası: ${apiRes.status}` });
      }
    } catch (error) {
      console.error(`[GenericProxy ${remotePath} Error]:`, error.message);
      res.status(500).json({ status: "Error", message: error.message });
    }
  };
}

// Select2 Search Proxies (GET — ?SELECT2SEARCHVAL=xxx)
const select2Endpoints = [
  'GetValueForCountrySelect2Search',
  'GetValueForCitySelect2Search',
  'GetValueForShipSelect2Search',
  'GetValueForLineSelect2Search',
  'GetValueForAirLineSelect2Search',
  'GetValueForTransporterSelect2Search',
  'GetValueForBookingSelect2Search',
  'GetValueForOfferSelect2Search',
  'GetValueForContainerSelect2Search',
  'GetValueForCustomerSelect2Search',
  'GetValueForRegionSelect2Search',
  'GetValueForLandTransporterSelect2Search',
  'GetValueForOverseasCustomerSelect2Search',
  'GetValueForOverseasAgencySelect2Search',
  'GetValueForPackageTypeSelect2Search',
  'GetValueForFirmSelect2Search',
  'GetValueForTransportTypeSelect2Search',
  'GetValueForCoLoaderSelect2Search',
  'GetValueForLocalExpenseSelect2Search',
  'GetValueForExpenseTypeSelect2Search',
  'GetValueForTaxOfficeSelect2Search'
];

select2Endpoints.forEach(ep => {
  const handler = createGenericProxy('GET', `/Select2/${ep}`);
  app.all(`/Select2/${ep}`, handler);
  app.all(`/api/Select2/${ep}`, handler);
  app.all(`/${ep}`, handler);
});

// Port Search (POST) with server-side caching & filtering for instant responses
let cachedPortsData = null;
let cachedPortsTimestamp = 0;

async function handleGetPortForGrid(req, res) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Port/GetPortForGrid`;

    const now = Date.now();
    // Cache fresh port data for 15 minutes
    if (!cachedPortsData || (now - cachedPortsTimestamp > 900000)) {
      console.log(`[API GetPortForGrid] Remote'tan güncel liman listesi çekiliyor: "${targetUrl}"`);
      const baseHeaders = {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      };
      if (authHeader) baseHeaders['Authorization'] = authHeader;

      const apiRes = await fetch(targetUrl, {
        method: 'POST',
        headers: baseHeaders,
        body: JSON.stringify({ CONTYPE: 'MSSQL' })
      }).catch(err => {
        console.warn('[GetPortForGrid Remote API Error]:', err.message);
        return null;
      });

      if (apiRes && apiRes.ok) {
        const data = await apiRes.json();
        const arr = Array.isArray(data) ? data : (data?.data || data?.result || data?.items || []);
        if (Array.isArray(arr) && arr.length > 0) {
          cachedPortsData = arr;
          cachedPortsTimestamp = Date.now();
          console.log(`[API GetPortForGrid] ${arr.length} liman sunucu belleğine önbelleklendi.`);
        }
      }
    }

    const searchQuery = String(req.body?.SEARCHTEXT || req.body?.QUERY || req.body?.SELECT2SEARCHVAL || req.query?.SELECT2SEARCHVAL || '').trim();

    if (!cachedPortsData || cachedPortsData.length === 0) {
      const portHandler = createGenericProxy('POST', '/Port/GetPortForGrid');
      return portHandler(req, res);
    }

    if (!searchQuery) {
      return res.json(cachedPortsData.slice(0, 100));
    }

    // Fast V8 server-side search & ranking
    const q = searchQuery.toLowerCase();
    const rank0 = [];
    const rank1 = [];
    const rank2 = [];

    for (let i = 0; i < cachedPortsData.length; i++) {
      const item = cachedPortsData[i];
      if (!item) continue;

      const name = String(item.portname || item.port_name || item.name || item.description || item.cityname || '').toLowerCase();
      const code = String(item.portcode || item.shortname || item.unlocode || item.code || '').toLowerCase();
      const country = String(item.countryname || item.country || '').toLowerCase();
      const combined = `${name} ${code} ${country}`;

      if (name.startsWith(q) || code.startsWith(q)) {
        rank0.push(item);
        if (rank0.length >= 100) break;
      } else if (combined.includes(q)) {
        const words = `${name} ${code}`.split(/[\s,()/-]+/);
        if (words.some(w => w.startsWith(q))) {
          rank1.push(item);
        } else {
          rank2.push(item);
        }
      }
    }

    const results = [...rank0, ...rank1, ...rank2].slice(0, 100);
    console.log(`[API GetPortForGrid] Query="${searchQuery}" => ${results.length} sonuç döndürülüyor (toplam ${cachedPortsData.length} liman arasından).`);
    return res.json(results);
  } catch (error) {
    console.error('[GetPortForGrid Error]:', error.message);
    res.status(500).json({ status: "Error", message: error.message });
  }
}

app.all('/Port/GetPortForGrid', handleGetPortForGrid);
app.all('/api/Port/GetPortForGrid', handleGetPortForGrid);

// Container Types (POST)
const containerTypesHandler = createGenericProxy('POST', '/ContainerTypes/GetContainerForGridN');
app.all('/ContainerTypes/GetContainerForGridN', containerTypesHandler);
app.all('/api/ContainerTypes/GetContainerForGridN', containerTypesHandler);

// Customer LoaderBlackListControl (POST)
const loaderBlacklistHandler = createGenericProxy('POST', '/Customer/LoaderBlackListControl');
app.all('/Customer/LoaderBlackListControl', loaderBlacklistHandler);
app.all('/api/Customer/LoaderBlackListControl', loaderBlacklistHandler);

// 17. Customer GetCustomerForGridN Endpoint (Proxy to http://apa.linklojistik.com:1312/Customer/GetCustomerForGridN)
async function handleGetCustomerForGridN(req, res) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
    const remoteApiUrl = process.env.API_URL || 'http://apa.linklojistik.com:1312';
    const base = remoteApiUrl.replace(/\/$/, '');
    const targetUrl = `${base}/Customer/GetCustomerForGridN`;

    console.log(`[API GetCustomerForGridN] Proxying to "${targetUrl}"`);

    const baseHeaders = {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json'
    };
    if (authHeader) baseHeaders['Authorization'] = authHeader;

    const apiRes = await fetch(targetUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify(req.body || {})
    }).catch(err => {
      console.warn('[GetCustomerForGridN Remote API Error]:', err.message);
      return null;
    });

    if (!apiRes) {
      return res.status(503).json({
        status: "Error",
        message: "Uzak sunucuya erişilemedi"
      });
    }

    const text = await apiRes.text();
    console.log(`[GetCustomerForGridN Remote Response Status ${apiRes.status}]:`, text.substring(0, 150));
    let responseData = null;
    try { responseData = JSON.parse(text); } catch (e) { }

    if (apiRes.ok) {
      return res.json(responseData || { items: [], totalCount: 0 });
    } else {
      return res.status(apiRes.status || 400).json(responseData || {
        status: "Error",
        message: responseData?.message || responseData?.Message || `Remote API hatası: ${apiRes.status}`,
        raw: text
      });
    }
  } catch (error) {
    console.error('[GetCustomerForGridN Error]:', error.message);
    res.status(500).json({
      status: "Error",
      message: 'GetCustomerForGridN işlemi sırasında hata oluştu',
      error: error.message
    });
  }
}

app.all('/Customer/GetCustomerForGridN', handleGetCustomerForGridN);
app.all('/api/Customer/GetCustomerForGridN', handleGetCustomerForGridN);
app.all('/api/customer/get-customer-for-grid-n', handleGetCustomerForGridN);
app.all('/GetCustomerForGridN', handleGetCustomerForGridN);






// Catch-all 404 Handler for API routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint bulunamadı: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler Middleware (Prevents Express from returning HTML error pages)
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Sunucuda iç hata oluştu',
    error: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================`);
  console.log(`ATLASDB MSSQL API Server Running`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`Android Emulator URL: http://10.0.2.2:${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`Auth Login: http://localhost:${PORT}/api/auth/login`);
  console.log(`=================================`);
});
