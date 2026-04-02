import { Injectable } from '@nestjs/common';

import { objectParticle, topicParticle } from '../utils/korean-particle.util';

export type AutobiographyMode = 'student' | 'teacher';

type StudentGenerateRequest = {
  mode: 'student';
  student_name?: string;
  tone?: string;
  achievements?: string;
  memories?: string;
  future_dream?: string;
};

type TeacherGenerateRequest = {
  mode: 'teacher';
  teacher_name?: string;
  school_name?: string;
  teaching_philosophy?: string;
  memorable_classes?: string;
  student_message?: string;
  closing_message?: string;
};

export type GenerateAutobiographyRequest = StudentGenerateRequest | TeacherGenerateRequest;

type GenerateAutobiographyResponse = {
  generated_text: string;
  mode: AutobiographyMode;
};

@Injectable()
export class AutobiographyCompilationService {
  generate(request: GenerateAutobiographyRequest): GenerateAutobiographyResponse {
    if (request.mode === 'student') {
      return {
        generated_text: this.generateStudentText(request),
        mode: 'student',
      };
    }

    return {
      generated_text: this.generateTeacherText(request),
      mode: 'teacher',
    };
  }

  private generateStudentText(request: StudentGenerateRequest): string {
    const studentName = request.student_name?.trim() || '학생';
    const tone = request.tone?.trim() || '진솔하고 차분한';
    const achievements = request.achievements?.trim() || '작은 목표를 꾸준히 이루며 성장한 경험';
    const memories = request.memories?.trim() || '함께 배우고 웃었던 소중한 학교생활의 장면';
    const futureDream = request.future_dream?.trim() || '앞으로도 배움을 이어가며 꿈을 실현하고 싶은 다짐';

    return `${studentName}의 자서전은 ${tone} 문체로 시작됩니다. 그동안의 성취로는 ${achievements}${objectParticle(achievements)} 꼽을 수 있고, 가장 오래 남는 기억은 ${memories}입니다. 이 경험을 바탕으로 ${futureDream}${objectParticle(futureDream)} 향해 한 걸음씩 나아가고자 합니다.`;
  }

  private generateTeacherText(request: TeacherGenerateRequest): string {
    const teacherName = request.teacher_name?.trim() || '교사';
    const schoolName = request.school_name?.trim() || '학교';
    const teachingPhilosophy =
      request.teaching_philosophy?.trim() || '학생의 가능성을 존중하고 스스로 성장하도록 돕는 교육 철학';
    const memorableClasses =
      request.memorable_classes?.trim() || '서로의 생각을 나누며 배움의 기쁨을 확인한 수업들';
    const studentMessage =
      request.student_message?.trim() || '학생들이 건넨 따뜻한 말과 응원이 교직의 힘이 되었다는 고백';
    const closingMessage =
      request.closing_message?.trim() || '앞으로도 아이들과 함께 배우며 더 나은 내일을 만들어가겠다는 인사';

    return `${teacherName}${topicParticle(teacherName)} ${schoolName}에서 ${teachingPhilosophy}${objectParticle(teachingPhilosophy)} 바탕으로 학생들과 함께했습니다. 특히 ${memorableClasses}${topicParticle(memorableClasses)} 교육 여정에서 깊은 의미를 남겼습니다. ${studentMessage}. 끝으로 ${closingMessage}.`;
  }
}
