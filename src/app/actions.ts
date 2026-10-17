
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
  const rootDir = process.cwd();
  let debugInfo = `CWD: ${rootDir}. `;
  
  try {
    const searchPaths = [
      path.join(rootDir, 'CCNH.xlsx'),
      path.join(rootDir, 'ccnh.xlsx'),
      path.join(rootDir, 'src', 'CCNH.xlsx'),
      path.join(rootDir, 'public', 'CCNH.xlsx'),
      path.resolve('./CCNH.xlsx'),
    ];

    let filePath = '';
    for (const p of searchPaths) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      const files = fs.readdirSync(rootDir);
      const excelFile = files.find(f => f.toLowerCase().endsWith('.xlsx'));
      if (excelFile) filePath = path.join(rootDir, excelFile);
    }

    if (!filePath) {
      return { 
        questions: [], 
        skippedRows: ["Không tìm thấy file Excel."],
        debugInfo: debugInfo + "No .xlsx found."
      };
    }

    const buf = fs.readFileSync(filePath);
    const workbook = XLSX.read(buf);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
    if (rows.length === 0) {
      return { questions: [], skippedRows: ["File trống."], debugInfo };
    }

    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const normalizedRow = row.map(c => 
        String(c || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '')
      );

      const hasQuestion = normalizedRow.some(c => c.includes('cauhoi') || c.includes('question') || c.includes('noidung'));
      const hasOptions = normalizedRow.some(c => c === 'a' || c === 'b' || c === 'c' || c === 'd' || c.includes('option') || c.includes('dapan'));
      const hasCorrect = normalizedRow.some(c => c.includes('dapandung') || c.includes('correct') || c === 'key' || (c.includes('dapan') && !c.includes('a') && !c.includes('b')));

      if (hasQuestion && (hasOptions || hasCorrect)) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0;
    }

    const headers = rows[headerRowIndex].map(h => 
      String(h || '').trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '')
    );

    debugInfo += `Found: ${path.basename(filePath)}. Header at row ${headerRowIndex + 1}. `;

    const colIndices = {
      stt: headers.findIndex(h => h === 'stt' || h === 'id' || h === 'no' || h.includes('sott')),
      question: headers.findIndex(h => h.includes('cauhoi') || h.includes('question') || h.includes('noidung')),
      a: headers.findIndex(h => h === 'a' || h === 'optiona' || h.includes('dapana') || h.includes('phuongana')),
      b: headers.findIndex(h => h === 'b' || h === 'optionb' || h.includes('dapanb') || h.includes('phuonganb')),
      c: headers.findIndex(h => h === 'c' || h === 'optionc' || h.includes('dapanc') || h.includes('phuonganc')),
      d: headers.findIndex(h => h === 'd' || h === 'optiond' || h.includes('dapand') || h.includes('phuongand')),
      correct: headers.findIndex(h => h.includes('dapandung') || h.includes('correct') || h === 'dapan' || h === 'key' || h.includes('dapanthuc'))
    };

    const parsedQuestions: Question[] = [];
    const skippedRows: (string | number)[] = [];

    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const qText = String(row[colIndices.question] || '').trim();
      if (!qText || qText.length < 5) continue;

      const rowId = row[colIndices.stt] || `Hàng ${i + 1}`;
      const optA = String(row[colIndices.a] || '').trim();
      const optB = String(row[colIndices.b] || '').trim();
      const optC = String(row[colIndices.c] || '').trim();
      const optD = String(row[colIndices.d] || '').trim();
      const correctRaw = String(row[colIndices.correct] || '').trim().toUpperCase();

      if (!correctRaw) {
        skippedRows.push(`${rowId} (Thiếu đáp án)`);
        continue;
      }

      let correctKey: 'A' | 'B' | 'C' | 'D' | 'ABCD' | null = null;
      if (['A', 'B', 'C', 'D'].includes(correctRaw)) {
        correctKey = correctRaw as any;
      } else if (correctRaw === 'ABCD' || correctRaw.includes('TATCA') || correctRaw.includes('ALL')) {
        correctKey = 'ABCD';
      } else {
        const firstChar = correctRaw.charAt(0);
        if (['A', 'B', 'C', 'D'].includes(firstChar)) {
          correctKey = firstChar as any;
        }
      }

      if (!correctKey) {
        skippedRows.push(`${rowId} (Đáp án '${correctRaw}' lạ)`);
        continue;
      }

      parsedQuestions.push({
        id: rowId,
        question: qText,
        options: { A: optA, B: optB, C: optC, D: optD },
        correctAnswer: correctKey,
      });
    }

    debugInfo += `Parsed ${parsedQuestions.length} questions.`;
    return { questions: parsedQuestions, skippedRows, debugInfo };

  } catch (error: any) {
    console.error("Error in getQuestions:", error);
    return { questions: [], skippedRows: [`Lỗi: ${error.message}`], debugInfo: debugInfo + `Error: ${error.message}` };
  }
}
