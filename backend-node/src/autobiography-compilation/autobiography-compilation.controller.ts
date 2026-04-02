import { Body, Controller, Post } from '@nestjs/common';
import { Proofreadable } from '../proofread/proofread.decorator';
import { AutobiographyCompilationService } from './autobiography-compilation.service';
import type { GenerateAutobiographyRequest } from './autobiography-compilation.service';

@Controller('autobiography-compilation')
export class AutobiographyCompilationController {
  constructor(
    private readonly autobiographyCompilationService: AutobiographyCompilationService,
  ) {}

  @Post('generate')
  @Proofreadable({
    contentType: 'autobiography',
    responseFields: ['generated_text'],
    protectedBodyFields: [
      'student_name',
      'teacher_name',
      'school_name',
      'achievements',
      'memories',
      'future_dream',
      'teaching_philosophy',
      'memorable_classes',
    ],
  })
  generate(@Body() body: GenerateAutobiographyRequest) {
    return this.autobiographyCompilationService.generate(body);
  }
}
