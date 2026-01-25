import { Injectable } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import { StudentRecordsService } from './student-records.service';
import { toJson, toMarkdown } from '@ohah/hwpjs';
import * as sharp from 'sharp';

@Injectable()
export class OCRService {
  constructor(private readonly studentRecordsService: StudentRecordsService) {}

  async parseImage(buffer: Buffer) {
    const text = await this.extractTextFromImage(buffer);
    return this.parseTextToStudents(text);
  }

  async extractTextFromImage(buffer: Buffer): Promise<string> {
    const processedBuffer = await sharp.default(buffer)
      .resize({ width: 3000 }) 
      .grayscale()
      .linear(1.5, -0.3) 
      .threshold(160) 
      .sharpen()
      .toBuffer();

    const worker = await createWorker(['kor', 'eng']); 
    const { data: { text } } = await worker.recognize(processedBuffer);
    await worker.terminate();
    
    return text;
  }

  async parseHwp(buffer: Buffer) {
    try {
      const { markdown, images } = toMarkdown(buffer, {
        image: 'blob', // Get images as Blob/Buffer
        use_html: false,
      });

      // 1. Text from HWP
      let text = markdown
        .replace(/!\[.*?\]\(.*?\)/g, '') 
        .replace(/[#*`_~]/g, '') 
        .replace(/\n+/g, '\n'); 

      // 2. OCR on embedded images
      if (images && images.length > 0) {
        for (const img of images) {
          // 'img.data' is Uint8Array in @ohah/hwpjs output
          if (img.data) {
            const imageBuffer = Buffer.from(img.data);
            const ocrText = await this.extractTextFromImage(imageBuffer);
            text += `\n${ocrText}`;
          }
        }
      }

      return this.parseTextToStudents(text);

    } catch (e) {
      console.error("HWP Parse Error", e);
      return { mapping: {}, students: [], saved: [], count: 0, error: "Failed to parse HWP" };
    }
  }
  }

  private async parseTextToStudents(text: string) {
    const lines = text.split(/\r?\n/);
    const students: Array<{
      name: string;
      residentNumber: string;
      birthDate: string;
      address: string;
      student_number: number;
    }> = [];

    const splitByDelimiters = (raw: string) => {
      // Split by |, [, ], !, {, }, ( ) which are common OCR errors for table lines
      return raw.split(/[|!\[\]{}()]+/);
    };

    for (const line of lines) {
      // Filter out header lines that contain specific keywords
      if (/학년|반|담임|부\s*모|형제자매|번호|이름|주민등록번호|주소|성명|생년월일/.test(line)) continue;

      const segments = splitByDelimiters(line).map(s => s.trim()).filter(s => s.length > 0);
      if (segments.length < 2) continue; 

      let name = '';
      let residentNumber = '';
      let birthDate = '';
      let addressCandidates: string[] = [];

      for (const segment of segments) {
        // Skip purely numeric small segments (likely row numbers or garbage)
        if (/^\d{1,3}$/.test(segment)) continue;
        
        // Skip common header words if they appear as segments
        if (/^(학년|반|담임|부|모|형제자매|번호|이름|성명|주소)$/.test(segment)) continue;

        // Name Detection (Hangul, 2-5 chars)
        if (!name && /^[가-힣]{2,5}$/.test(segment)) {
          name = segment;
          continue;
        }

        // Resident Number / Birth Date Detection
        // RRN: 6 digits, dash?, 1-4, 6 digits
        const rrnMatch = segment.match(/(\d{6})\s*[-]?\s*([1-4]\d{6})/);
        // Birth Date: 5-6 digits (e.g. 110108, 180312) - often OCR drops leading zero
        // Or YYYY.MM.DD
        const dateMatch = segment.match(/(\d{4})[./-](\d{2})[./-](\d{2})/) || segment.match(/(\d{2})[./-](\d{2})[./-](\d{2})/);
        const simpleDateMatch = segment.match(/\b\d{5,6}\b/);

        if (!residentNumber && rrnMatch) {
            residentNumber = `${rrnMatch[1]}-${rrnMatch[2]}`;
            birthDate = this.birthDateFromRrn(residentNumber);
        } else if (!birthDate) {
            if (dateMatch) {
                const y = dateMatch[1].length === 2 ? `20${dateMatch[1]}` : dateMatch[1]; 
                birthDate = `${y}-${dateMatch[2]}-${dateMatch[3]}`;
            } else if (simpleDateMatch) {
                let d = simpleDateMatch[0];
                // Handle 5 digits (likely missing leading zero, e.g. 11018 -> 110108? OR 11018 -> 11.01.8?)
                // Given 6th grade context (born ~2013), dates start with 13, 12, 11...
                if (d.length === 5) d = '0' + d; // try padding
                
                // Validate if it looks like YYMMDD
                const yy = parseInt(d.slice(0, 2));
                const mm = parseInt(d.slice(2, 4));
                const dd = parseInt(d.slice(4, 6));

                if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
                    birthDate = `20${d.slice(0, 2)}-${d.slice(2, 4)}-${d.slice(4, 6)}`;
                }
            }
        }
        
        // If not name or date, it's likely address or garbage
        // Address usually contains Hangul and spaces/numbers
        if (segment !== name && !rrnMatch && !dateMatch && !simpleDateMatch) {
             // Filter out obvious garbage or header fragments
             if (/[가-힣]/.test(segment) && segment.length > 1) {
                 // Ignore segments that contain common header keywords
                 if (!/부\s*모|형제자매|학년|반|담임/.test(segment)) {
                    addressCandidates.push(segment);
                 }
             }
        }
      }

      const address = addressCandidates.join(' ');

      if (name && (residentNumber || birthDate || address.length > 2)) {
        students.push({
          name,
          residentNumber,
          birthDate,
          address,
          student_number: students.length + 1 
        });
      }
    }
    
    const saved = await this.studentRecordsService.saveStudents(students.map(s => ({
        number: s.student_number,
        name: s.name,
        residentNumber: s.residentNumber,
        birthDate: s.birthDate,
        address: s.address
    })), { mode: 'upsert' });

    return { mapping: {}, students, saved, count: students.length, text };
  }

  private birthDateFromRrn(rrn: string): string {
    const d = rrn.replace(/\D/g, '');
    if (d.length !== 13) return '';
    const yy = parseInt(d.slice(0, 2));
    const mm = d.slice(2, 4);
    const dd = d.slice(4, 6);
    const g = parseInt(d[6]);
    
    let year = 1900 + yy;
    if (g === 3 || g === 4 || g === 7 || g === 8) {
      year = 2000 + yy;
    }
    return `${year}-${mm}-${dd}`;
  }
}
