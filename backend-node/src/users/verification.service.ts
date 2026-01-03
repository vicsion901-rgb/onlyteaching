import { Injectable } from '@nestjs/common';
import { OcrResult } from './interfaces/ocr-result.interface';

@Injectable()
export class VerificationService {
  calculateScore(ocr: OcrResult, schoolName: string): number {
    let score = 0;
    if (ocr.keywords.includes('나이스')) score += 20;
    if (ocr.keywords.includes('교원')) score += 20;
    if (ocr.keywords.includes('인사')) score += 20;
    if (ocr.text.includes(schoolName)) score += 30;
    return score;
  }

  decide(score: number): 'AUTO' | 'MANUAL' | 'REJECT' {
    if (score >= 80) return 'AUTO';
    if (score >= 50) return 'MANUAL';
    return 'REJECT';
  }
}

