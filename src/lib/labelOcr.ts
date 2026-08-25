import Tesseract from 'tesseract.js';

export interface OcrResult {
  part_name: string;
  sku_id: string;
  vehicle_model: string;
  mrp: number;
  quantity: number;
}

export async function scanLabelOcr(imageSrc: string): Promise<OcrResult | null> {
  try {
    const result = await Tesseract.recognize(imageSrc, 'eng');
    const text = result.data.text;
    if (!text || text.trim().length < 5) return null;

    console.log('--- RAW OCR RESULT --- \n', text);

    const finalResult: OcrResult = {
      part_name: '',
      sku_id: '',
      vehicle_model: '',
      mrp: 0,
      quantity: 1,
    };

    // 1. MRP (M.R.P. ₹ : 195.00, MRP: 195, 149.00)
    const mrpMatch = text.match(/M\.?R\.?P[^\d]*([0-9]+(?:\.[0-9]{1,2})?)/i);
    if (mrpMatch && mrpMatch[1]) {
      finalResult.mrp = parseFloat(mrpMatch[1]);
    }

    // 2. SKU / Part No (Item No: X-7055A, O.E No: 2GS-F6311-00, PART NO: ...)
    const skuMatch = text.match(/(?:Item\s*No|Part\s*No|O\.?E\.?\s*No)[^\w\n]*([A-Z0-9\-\/]+)/i);
    if (skuMatch && skuMatch[1]) {
      finalResult.sku_id = skuMatch[1].trim();
    } else {
      const fallbackSku = text.match(/[A-Z0-9]{1,4}-[A-Z0-9]{3,8}(?:-[A-Z0-9]+)?/i);
      if (fallbackSku) finalResult.sku_id = fallbackSku[0].trim();
    }

    // 3. Quantity (QTY: 1 N)
    const qtyMatch = text.match(/(?:QTY|QUANTITY)[^\d\n]*([0-9]+)/i);
    if (qtyMatch && qtyMatch[1]) {
      finalResult.quantity = parseInt(qtyMatch[1], 10);
    }

    // 4. Lines Cleaning
    const cleanLines = text
      .split('\n')
      .map((l) => l.replace(/[|│]/g, '').trim())
      .filter((l) => l.length > 2 && !/BATCH|MFD|MKT|PRICE|TAXES|PKD|M\.R\.P|Naiwala|Customer/i.test(l));

    // Line 1 -> Part Name (e.g. ACC. CABLE (A) 2014)
    if (cleanLines.length > 0) {
      finalResult.part_name = cleanLines[0].replace(/^[^\w]+/, '');
    }

    // Line 2 -> Vehicle Model (e.g. FZ-S V.2 / FAZOR / SZ-RR)
    if (cleanLines.length > 1 && !/(?:Item|Part|OE|QTY)/i.test(cleanLines[1])) {
      finalResult.vehicle_model = cleanLines[1].replace(/^[^\w]+/, '');
    }

    return finalResult;
  } catch (error) {
    console.error('Label OCR Error:', error);
    return null;
  }
}