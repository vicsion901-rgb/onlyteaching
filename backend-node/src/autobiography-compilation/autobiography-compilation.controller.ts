import { Body, Controller, Post } from '@nestjs/common';
import { Proofreadable } from '../proofread/proofread.decorator';
import { AutobiographyCompilationService } from './autobiography-compilation.service';

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
    ],
  })
  generate(@Body() body: Record<string, unknown>) {
    return this.autobiographyCompilationService.generate(body as any);
  }
}
