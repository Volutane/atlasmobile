/**
 * ISO 6346 standartlarına göre konteyner numarasının matematiksel doğruluğunu kontrol eder.
 * Algoritma: 4 Büyük Harf + 7 Rakam (Toplam 11 karakter).
 * Harfler özel ağırlık değerleri alarak (11, 22, 33 atlanarak) 2^i ile çarpılır ve mod 11 kontrol basamağı hesaplanır.
 * 
 * @param containerNumber Kontrol edilecek konteyner numarası (ör: "MSKU1234567")
 * @returns boolean ISO 6346 doğrulama sonucu
 */
export function isValidContainerNumber(containerNumber: string | null | undefined): boolean {
  if (!containerNumber || typeof containerNumber !== 'string') {
    return false;
  }

  const cleaned = containerNumber.trim().toUpperCase();

  // 4 harf + 7 rakam kontrolü
  if (!/^[A-Z]{4}\d{7}$/.test(cleaned)) {
    return false;
  }

  let sum = 0;

  for (let i = 0; i < 10; i++) {
    const char = cleaned.charAt(i);
    let value: number;

    if (/[A-Z]/.test(char)) {
      value = getLetterValue(char);
    } else {
      value = parseInt(char, 10);
    }

    sum += value * Math.pow(2, i);
  }

  let calculatedCheckDigit = sum % 11;

  // ISO 6346 standardında mod 11 sonucu 10 çıkarsa kontrol basamağı 0 kabul edilir.
  if (calculatedCheckDigit === 10) {
    calculatedCheckDigit = 0;
  }

  const actualCheckDigit = parseInt(cleaned.charAt(10), 10);

  return calculatedCheckDigit === actualCheckDigit;
}

/**
 * ISO 6346 harf değer tablosu hesaplayıcı.
 * A=10'dan başlar, 11'in katları olan 11, 22, 33 atlanır.
 */
function getLetterValue(char: string): number {
  let value = char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;

  if (value >= 11) value++;
  if (value >= 22) value++;
  if (value >= 33) value++;

  return value;
}
