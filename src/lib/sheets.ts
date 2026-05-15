/**
 * Google Sheets API Utility
 *
 * Cách dùng:
 * 1. Tạo Google Sheet với cột: Front (câu hỏi), Back (câu trả lời), Category (tuỳ chọn), Hint (gợi ý - tuỳ chọn)
 * 2. Publish sheet: File > Share > Publish to web > chọn sheet > CSV
 * 3. Hoặc dùng Google Sheets API v4 với API Key
 */

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  category?: string;
  hint?: string;
  comment?: string[];
}

export interface SheetConfig {
  spreadsheetId: string;
  apiKey: string;
  sheetName?: string;
  range?: string;
}

/**
 * Fetch flashcards từ Google Sheets qua API v4
 */
export async function fetchFromGoogleSheetsAPI(
  config: SheetConfig
): Promise<Flashcard[]> {
  const { spreadsheetId, apiKey, sheetName = 'Sheet1', range = 'A:E' } = config;
  const fullRange = sheetName ? `${sheetName}!${range}` : range;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    fullRange
  )}?key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err?.error?.message || `HTTP ${res.status}: Không thể tải dữ liệu`
    );
  }

  const data = await res.json();
  return parseSheetRows(data.values || []);
}

/**
 * Fetch flashcards từ Google Sheets dạng CSV public (không cần API key)
 * Publish sheet: File > Share > Publish to web
 */
export async function fetchFromPublicCSV(csvUrl: string): Promise<Flashcard[]> {
  const res = await fetch(csvUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}: Không thể tải CSV`);

  const text = await res.text();
  const rows = text
    .trim()
    .split('\n')
    .map((row) =>
      row.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
    );

  return parseSheetRows(rows);
}

function parseSheetRows(rows: string[][]): Flashcard[] {
  if (rows.length === 0) return [];

  // Hàng đầu là header
  const [header, ...dataRows] = rows;
  const colIndex = (names: string[]) => {
    const lower = header.map((h) => h.toLowerCase().trim());
    for (const name of names) {
      const idx = lower.indexOf(name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const frontIdx = colIndex([
    'front',
    'question',
    'câu hỏi',
    'term',
    'mặt trước',
  ]);
  const backIdx = colIndex([
    'back',
    'answer',
    'câu trả lời',
    'definition',
    'mặt sau',
  ]);
  const catIdx = colIndex(['category', 'tag', 'chủ đề', 'loại']);
  const hintIdx = colIndex(['hint', 'gợi ý', 'clue']);
  const commentIdx = colIndex(['comment', 'bình luận', 'ghi chú']);

  if (frontIdx === -1 || backIdx === -1) {
    // Fallback: cột 0 = front, cột 1 = back
    return dataRows
      .filter((row) => row.length >= 2 && row[0] && row[1])
      .map((row, i) => ({
        id: String(i),
        front: row[0] || '',
        back: row[1] || '',
        category: row[2] || undefined,
        hint: row[3] || undefined,
        commentIdx: row[4]?.split(',') || undefined,
      }));
  }

  return dataRows
    .filter((row) => row[frontIdx] && row[backIdx])
    .map((row, i) => ({
      id: String(i),
      front: row[frontIdx] || '',
      back: row[backIdx] || '',
      category: catIdx !== -1 ? row[catIdx] || undefined : undefined,
      hint: hintIdx !== -1 ? row[hintIdx] || undefined : undefined,
      comment:
        commentIdx !== -1
          ? row[commentIdx]?.split(',') || undefined
          : undefined,
    }));
}

/** Sample data để demo khi chưa có sheet */
export const SAMPLE_CARDS: Flashcard[] = [
  {
    id: '0',
    front: '我',
    back: 'Quang hợp — quá trình thực vật chuyển đổi ánh sáng mặt trời thành năng lượng hoá học.',
    category: 'Biology',
    hint: 'Liên quan đến diệp lục tố',
  },
  {
    id: '1',
    front: '我们',
    back: 'Nguyên phân — quá trình phân chia tế bào tạo ra 2 tế bào con giống hệt nhau.',
    category: 'Biology',
  },
  {
    id: '2',
    front: '你',
    back: 'Một vật đứng yên sẽ tiếp tục đứng yên, vật chuyển động sẽ tiếp tục chuyển động thẳng đều trừ khi có lực tác dụng.',
    category: 'Physics',
    hint: 'Quán tính',
  },
  {
    id: '3',
    front: '他',
    back: 'Năng lượng bằng khối lượng nhân với bình phương tốc độ ánh sáng — Einstein.',
    category: 'Physics',
  },
  {
    id: '4',
    front: '她',
    back: 'Thẩm thấu — sự khuếch tán của nước qua màng bán thấm từ nơi nồng độ thấp đến nơi nồng độ cao.',
    category: 'Biology',
  },
  {
    id: '5',
    front: '这 (这儿)',
    back: 'Phục Hưng — phong trào văn hoá châu Âu (thế kỷ 14–17) đánh dấu sự hồi sinh của nghệ thuật và khoa học cổ điển.',
    category: 'History',
  },
  {
    id: '6',
    front: '那 (那儿)',
    back: 'Dân chủ — hệ thống chính trị nơi quyền lực thuộc về người dân, thực hiện qua bầu cử.',
    category: 'Politics',
  },
  {
    id: '7',
    front: '哪',
    back: 'Chủ nghĩa tư bản — hệ thống kinh tế dựa trên tư hữu và vận hành bởi quy luật cung cầu thị trường.',
    category: 'Economics',
  },
];
