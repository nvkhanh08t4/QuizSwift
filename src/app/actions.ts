
'use server';

import { verifyAnswer, type VerifyAnswerInput, type VerifyAnswerOutput } from '@/ai/flows/ai-answer-verification';
import type { Question } from '@/lib/types';
import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

export async function getAIFeedback(input: VerifyAnswerInput): Promise<VerifyAnswerOutput> {
  try {
    const result = await verifyAnswer(input);
    return result;
  } catch (error) {
    console.error("Error getting AI feedback:", error);
    return {
      isCorrect: false,
      feedback: "An error occurred while trying to generate AI feedback. Please try again later.",
    };
  }
}

export async function getQuestions(): Promise<{ questions: Question[]; skippedRows: (string | number)[]; debugInfo?: string }> {
  try {
    const rootDir = process.cwd();
    
    // Danh sách các đường dẫn tiềm năng để tìm file
    const searchPaths = [
      path.join(rootDir, 'CCNH.xlsx'),
      path.join(rootDir, 'ccnh.xlsx'),
      path.join(rootDir, 'src', 'CCNH.xlsx'),
      path.join(rootDir, 'public', 'CCNH.xlsx'),
      path.resolve('./CCNH.xlsx'),
    ];

    let filePath = '';
    // Kiểm tra trực tiếp các đường dẫn phổ biến
    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    // Nếu vẫn không tìm thấy, quét toàn bộ thư mục gốc để tìm tệp .xlsx bất kỳ
    if (!filePath) {
      try {
        const files = fs.readdirSync(rootDir);
        const excelFile = files.find(f => f.toLowerCase().endsWith('.xlsx'));
        if (excelFile) {
          filePath = path.join(rootDir, excelFile);
        }
      } catch (e) {
        console.error("Error scanning root directory:", e);
      }
    }

    if (!filePath) {
      const debugInfo = `CWD: ${rootDir}. Checked paths: ${searchPaths.length}. Files in root: ${fs.readdirSync(rootDir).join(', ')}`;
      return { 
        questions: [], 
        skippedRows: ["Không tìm thấy file CCNH.xlsx. Hãy đảm bảo file đã được commit và push lên GitHub."],
        debugInfo
      };
    }

    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Đọc tất cả các hàng dưới dạng mảng để tìm dòng tiêu đề
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (rows.length === 0) {
      return { questions: [], skippedRows: ["File Excel không có dữ liệu."] };
    }

    // Tìm dòng chứa các từ khóa tiêu đề (Câu hỏi, Question, STT, v.v.)
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i].map(c => String(c || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
      if (row.some(c => c.includes('cau hoi') || c.includes('question') || c.includes('noi dung') || c.includes('stt'))) {
        headerRowIndex = i;
        break;
      }
    }

    // Nếu không tìm thấy dòng tiêu đề rõ ràng, mặc định dùng dòng đầu tiên (index 0)
    const finalHeaderIndex = headerRowIndex === -1 ? 0 : headerRowIndex;
    const json: any[] = XLSX.utils.sheet_to_json(worksheet, { range: finalHeaderIndex });

    const parsedQuestions: Question[] = [];
    const skippedRows: (string | number)[] = [];

    json.forEach((row, index) => {
      // Chuẩn hóa key (tên cột) để dễ truy xuất
      const normalizedRow: {[key: string]: any} = {};
      for (const key in row) {
        const cleanKey = key.trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
          .replace(/\s+/g, '');
        normalizedRow[cleanKey] = row[key];
      }
      
      const rowId = normalizedRow.stt || normalizedRow.id || `Hàng ${index + finalHeaderIndex + 2}`;
      
      // Lấy nội dung câu hỏi
      const questionText = String(normalizedRow['cauhoi'] || normalizedRow['question'] || normalizedRow['noidung'] || normalizedRow['noidungcauhoi'] || '').trim();
      
      // Lấy các phương án trả lời
      const optA = String(normalizedRow['optiona'] || normalizedRow['dapana'] || normalizedRow['a'] || '').trim();
      const optB = String(normalizedRow['optionb'] || normalizedRow['dapanb'] || normalizedRow['b'] || '').trim();
      const optC = String(normalizedRow['optionc'] || normalizedRow['dapanc'] || normalizedRow['c'] || '').trim();
      const optD = String(normalizedRow['optiond'] || normalizedRow['dapand'] || normalizedRow['d'] || '').trim();
      
      // Lấy đáp án đúng (A, B, C, hoặc D)
      const correctAnswerRaw = String(normalizedRow['correctanswer'] || normalizedRow['dapandung'] || normalizedRow['ketqua'] || normalizedRow['dapan'] || '').trim().toUpperCase();
      
      if (!questionText) return; // Bỏ qua dòng trống hoàn toàn
      
      if (!correctAnswerRaw) {
        skippedRows.push(`${rowId} (Thiếu đáp án đúng)`);
        return;
      }
      
      let correctAnswerKey: 'A' | 'B' | 'C' | 'D' | 'ABCD' | null = null;
      
      if (['A', 'B', 'C', 'D'].includes(correctAnswerRaw)) {
        correctAnswerKey = correctAnswerRaw as 'A' | 'B' | 'C' | 'D';
      } else if (
        correctAnswerRaw === 'ABCD' || 
        correctAnswerRaw.includes('TATCA') || 
        correctAnswerRaw.includes('ALL')
      ) {
        correctAnswerKey = 'ABCD';
      }
      
      if (!correctAnswerKey) {
          skippedRows.push(`${rowId} (Giá trị đáp án '${correctAnswerRaw}' không hợp lệ)`);
          return;
      }

      parsedQuestions.push({
        id: rowId,
        question: questionText,
        options: { A: optA, B: optB, C: optC, D: optD },
        correctAnswer: correctAnswerKey,
      });
    });

    return { questions: parsedQuestions, skippedRows };

  } catch (error: any) {
    console.error("Critical error in getQuestions:", error);
    return { questions: [], skippedRows: [`Lỗi hệ thống: ${error.message}`] };
  }
}
