import Tesseract from 'tesseract.js';

export interface OcrResult {
  part_name: string;
  sku_id: string;
  mrp: number;
  quantity: number;
}

export async function scanLabelOcr(imageSrc: string): Promise<OcrResult | null> {
  try {
    const result = await Tesseract.recognize(imageSrc, 'eng');
    const text = result.data.text;
    if (!text) return null;

    const finalResult: OcrResult = {
      part_name: '',
      sku_id: '',
      mrp: 0,
      quantity: 1,
    };

    // 1. MRP Extract (M.R.P. : ₹ : 149.00)
    const mrpMatch = text.match(/M\.R\.P\.\s*:\s*₹?\s*:?\s*(\d+(?:\.\d{2})?)/i);
    if (mrpMatch && mrpMatch[1]) {
      finalResult.mrp = parseFloat(mrpMatch[1]);
    }

    // 2. Part No / SKU (PART NO. : KI-2691E/LX-2GSF6312)
    const partNoMatch = text.match(/PART\s*NO\.\s*:\s*([\w/\-]+)/i);
    if (partNoMatch && partNoMatch[1]) {
      finalResult.sku_id = partNoMatch[1].trim();
    }

    // 3. Quantity (QUANTITY : 1 N)
    const qtyMatch = text.match(/QUANTITY\s*:\s*(\d+)/i);
    if (qtyMatch && qtyMatch[1]) {
      finalResult.quantity = parseInt(qtyMatch[1], 10);
    }

    // 4. Part Name (Line above PART NO.)
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('PART NO.')) {
        if (i > 0) finalResult.part_name = lines[i - 1].replace(/^[^\w]+/, '');
        break;
      }
    }

    return finalResult;
  } catch (error) {
    console.error('Label OCR Error:', error);
    return null;
  }
}