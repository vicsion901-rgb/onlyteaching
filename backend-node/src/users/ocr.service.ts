import { Injectable } from '@nestjs/common';
import { OcrResult } from './interfaces/ocr-result.interface';

@Injectable()
export class OcrService {
  async extractText(imagePath: string): Promise<OcrResult> {
    // Stub OCR: replace with real OCR engine integration
    return {
      text: `나이스 교원 인사정보 서울OO초등학교 담당학급`,
      keywords: ['나이스', '교원', '인사', '초등학교'],
    };
  }
}

