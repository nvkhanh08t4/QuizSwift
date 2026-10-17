
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

export async function getQuestions(): Promise<{ questions: Question[]; skippedRows: (string | number)[] }> {
  try {
    // Ưu tiên tìm file ở thư mục gốc (tốt nhất cho Vercel) sau đó mới tìm trong src/
    let filePath = path.join(process.cwd(), 'CCNH.xlsx');
    
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'src', 'CCNH.xlsx');
    }

    if (!fs.existsSync(filePath)) {
      console.error("Excel file not found at:", filePath);
      return { 
        questions: [], 
        skippedRows: ["Không tìm thấy file CCNH.xlsx. Hãy đảm bảo file nằm ở thư mục gốc của dự án hoặc trong thư mục src/"] 
      };
    }

    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (rows.length === 0) {
      return { questions: [], skippedRows: ["File Excel trống"] };
    }

    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i].map(c => String(c || '').toLowerCase());
      if (row.some(c => c.includes('cauhoi') || c.includes('question') || c.includes('noi dung') || c.includes('nội dung'))) {
        headerRowIndex = i;
        break;
      }
    }

    const json: any[] = XLSX.utils.sheet_to_json(worksheet, { range: headerRowIndex });

    const parsedQuestions: Question[] = [];
    const skippedRows: (string | number)[] = [];

    json.forEach((row, index) => {
      const normalizedRow: {[key: string]: any} = {};
      for (const key in row) {
        const cleanKey = key.trim().toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
          .replace(/\s+/g, '');
        normalizedRow[cleanKey] = row[key];
      }
      
      const rowId = normalizedRow.id || normalizedRow.stt || `Dòng ${index + headerRowIndex + 2}`;
      const questionText = String(normalizedRow['question'] || normalizedRow['cauhoi'] || normalizedRow['noidung'] || '').trim();
      
      const optA = String(normalizedRow['optiona'] || normalizedRow['dapana'] || normalizedRow['a'] || '').trim();
      const optB = String(normalizedRow['optionb'] || normalizedRow['dapanb'] || normalizedRow['b'] || '').trim();
      const optC = String(normalizedRow['optionc'] || normalizedRow['dapanc'] || normalizedRow['c'] || '').trim();
      const optD = String(normalizedRow['optiond'] || normalizedRow['dapand'] || normalizedRow['d'] || '').trim();
      
      const correctAnswerRaw = String(normalizedRow['correctanswer'] || normalizedRow['dapandung'] || normalizedRow['ketqua'] || normalizedRow['dapan'] || '').trim();
      
      if (!questionText) return;
      
      if (!correctAnswerRaw) {
        skippedRows.push(`${rowId} (Thiếu đáp án đúng)`);
        return;
      }
      
      let correctAnswerKey: 'A' | 'B' | 'C' | 'D' | 'ABCD' | null = null;
      const cleanAnswer = correctAnswerRaw.toUpperCase();

      if (['A', 'B', 'C', 'D'].includes(cleanAnswer)) {
        correctAnswerKey = cleanAnswer as 'A' | 'B' | 'C' | 'D';
      } else if (
        cleanAnswer === 'ABCD' || 
        cleanAnswer.includes('TATCA') || 
        cleanAnswer.includes('ALL') ||
        cleanAnswer.includes('TRONGSO')
      ) {
        correctAnswerKey = 'ABCD';
      }
      
      if (!correctAnswerKey) {
          skippedRows.push(`${rowId} (Đáp án '${correctAnswerRaw}' không phải A, B, C, D)`);
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

  } catch (error) {
    console.error("Error reading CCNH.xlsx:", error);
    return { questions: [], skippedRows: ["Lỗi khi xử lý file Excel"] };
  }
}
