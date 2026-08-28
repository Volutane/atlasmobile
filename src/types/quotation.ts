export interface QuotationForCreateOfferSearchModel {
  LINERID?: string;
  LOADINGLOCATIONRID?: string;
  LOADINGPORTRID?: string;
  DISCHARGEPORTRID?: string;
  DISCHARGELOCATIONRID?: string;
  CONTAINERTYPERIDS?: string;
  CUSTOMERRID?: string;
  LOADERRID?: string;
  SHIPPINGTYPE?: string;
  COMMERCIALTYPE?: string;
  LOADINGTYPE?: string;
  FILLINGTYPE?: string;
  FLAMMABILITY?: string;
  PAYMENT?: string;
  CONTYPE?: string;
}

export interface QuotationContainerHeaderModel {
  containerrid: string;
  containertype: string;
  containertypeshort: string;
}

export interface QuotationContainerExpensesModel {
  containerrid: string;
  containertype?: string;
  containercost?: number | string;
}

export interface QuotationContainerExtendedExpenseModel {
  quotationrid?: string;
  containerrid?: string;
  type?: string; // "KARA" or other category
  containerextendedcost?: number | string;
  optionrid?: string;
  optionlabel?: string;
  optionname?: string;
  isdefault?: number;
}

export interface QuotationForCreateOfferModel {
  quotationrid: string;
  quotationno?: string;
  quotationvaliditydate?: string;
  line?: string;
  loadinglocation?: string;
  loadinglocationshort?: string;
  loadingport?: string;
  loadingportshort?: string;
  dischargeport?: string;
  dischargeportshort?: string;
  dischargelocation?: string;
  dischargelocationshort?: string;
  freetime?: string | number;
  fillingtype?: string;
  payment?: string;
  transittime?: string | number;
  service?: string;
  customername?: string;
  type?: string; // e.g. "NAC"
  isspecialforcustomer?: number; // 1 or 0
  isselectable?: number; // 1 or 0
  selectabilityreason?: string;
  localexpenseisselectable?: number; // 1 or 0
  localexpenseselectabilityreason?: string;
  selectedloadinglocationrid?: string;
  note?: string;
  containersinfo?: QuotationContainerExpensesModel[];
}

export interface QuotationContainerExpenseSearchModel {
  QUOTATIONRID?: string;
}

export interface ExtendedPricesSearchModel {
  SELECTEDLOADINGRID?: string;
  CUSTOMERRID?: string;
  LOADERRID?: string;
  QUOTATIONRID?: string;
}

export interface OfferExpensesModel {
  OFFEREXPENSERID?: string;
  OFFERRID?: string;
  CONTAINERRID?: string;
  CONTAINERTYPE?: string;
  EXPENSETYPE?: string;
  EXPENSENAME?: string;
  MASRAFTIPI?: string;
  ALLIN?: string | number;
  ISALLIN?: number;
  KDV?: string | number;
  VAT?: string | number;
  MIKTAR?: string | number;
  QUANTITY?: string | number;
  ALISFIYATI?: string | number;
  PURCHASEPRICE?: string | number;
  COST?: string | number;
  ALISDOVIZ?: string;
  PURCHASECURRENCY?: string;
  CURRENCY?: string;
  ALISTARAFI?: string;
  PURCHASEPARTY?: string;
  LINE?: string;
  SATISFIYATI?: string | number;
  SALESPRICE?: string | number;
  SATISDOVIZ?: string;
  SALESCURRENCY?: string;
  BEHER?: string;
  UNIT?: string;
  SATISTARAFI?: string;
  SALESPARTY?: string;
  [key: string]: any;
}

export interface QuotationContainersModel {
  CONTAINERRID?: string;
  CONTAINERTYPE?: string;
  CONTAINERTYPESHORT?: string;
  [key: string]: any;
}

export interface OfferModel {
  OFFERRID?: string;
  QUOTATIONRID?: string;
  OFFERNO?: string;
  OFFERDATE?: string;
  VALIDITYDATE?: string;
  FREETIME?: string | number;
  PAYMENT?: string;
  TRANSITTIME?: string | number;
  FILLINGTYPE?: string;
  INCOTERM?: string;
  LOADERRID?: string;
  LOADER?: string;
  COLOADERRID?: string;
  COLOADER?: string;
  LINE?: string;
  LOADINGLOCATION?: string;
  LOADINGPORT?: string;
  DISCHARGELOCATION?: string;
  DISCHARGEPORT?: string;
  OFFEREXPENSES?: OfferExpensesModel[];
  QUOTATIONCONTAINERS?: QuotationContainersModel[];
  OFFERCARGODETAIL?: any[];
  EDITTEDOFFER?: any[];
  [key: string]: any;
}

