 import Tesseract from 'tesseract.js';

export interface OcrResult {
  part_name: string;
  sku_id: string;
  mrp: number;
  quantity: number;
}

export async function scanLabelOcr(imageSrc: string): Promise<OcrResult | null> {
  try {
    const result = await Tesseract.recognize(imageSrc, 'eng', {
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz./:- ₹()',
    } as any);

    const text = result.data.text;
    if (!text || text.trim().length < 5) return null;

    console.log('Raw OCR Text:', text);

    const finalResult: OcrResult = {
      part_name: '',
      sku_id: '',
      mrp: 0,
      quantity: 1,
    };

    // 1. MRP Extraction (Supports: M.R.P. : 195, MRP: 149.00, M.R.P. ₹ : 195.00)
    const mrpMatch = text.match(/M\.?R\.?P\.?\s*[:₹\s]*([0-9]+(?:\.[0-9]{1,2})?)/i);
    if (mrpMatch && mrpMatch[1]) {
      finalResult.mrp = parseFloat(mrpMatch[1]);
    }

    // 2. SKU / Part No Extraction (Supports: Item No, O.E No, Part No, or generic code)
    const partNoMatch = text.match(/(?:ITEM\s*NO|O\.?E\.?\s*NO|PART\s*NO)\s*[:.\s]+([\w\-/]+)/i);
    if (partNoMatch && partNoMatch[1]) {
      finalResult.sku_id = partNoMatch[1].trim();
    } else {
      // Fallback: Extract first alpha-numeric code pattern like X-7055A or KI-2691E
      const codeFallback = text.match(/[A-Z0-9]{1,4}-[A-Z0-9]{3,8}/i);
      if (codeFallback) finalResult.sku_id = codeFallback[0].trim();
    }

    // 3. Quantity Extraction (Supports: QTY : 1, QUANTITY : 1 N)
    const qtyMatch = text.match(/(?:QTY|QUANTITY)\s*[:.\s]+([0-9]+)/i);
    if (qtyMatch && qtyMatch[1]) {
      finalResult.quantity = parseInt(qtyMatch[1], 10);
    }

    // 4. Part Name Extraction (Top-most clear line or line before Item/Part No)
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 3 && !/BATCH|MFD|MKT|PRICE|TAXES|PKD|M\.R\.P/i.test(l));

    if (lines.length > 0) {
      // Pick first non-metadata title line
      finalResult.part_name = lines[0].replace(/^[^\w]+/, '');
      if (lines[1] && !/(?:ITEM|PART|OE)\s*NO/i.test(lines[1])) {
        finalResult.part_name += ` ${lines[1]}`;
      }
    }

    return finalResult;
  } catch (error) {
    console.error('Label OCR Error:', error);
    return null;
  }
}