import { Injectable } from '@nestjs/common';

export type AutobiographyMode = 'student' | 'teacher';

type CareRecord = {
  date: string;
  mood: string;
  todos: string;
  events: string;
};

type SourceData = {
  careClassroom?: CareRecord[];
  schedule?: Array<{ title?: string; date?: string; start?: string }>;
  studentRecords?: Array<{ number?: number; name?: string }>;
  lifeRecords?: Array<{ keyword?: string }>;
  subjectEvaluation?: Array<{ title?: string; subject?: string }>;
  todayMeal?: Array<{ name?: string; date?: string }>;
  observationJournal?: unknown[];
};

type GenerateRequest = {
  mode?: AutobiographyMode;
  tab?: AutobiographyMode;
  version?: AutobiographyMode;
  prompt?: string;
  // 선생님
  teacher_name?: string;
  teacher_role?: string;
  teacher_focus?: string;
  // 학생
  student_name?: string;
  student_number?: number | string;
  student_id?: number;
  // 연동 데이터
  source_data?: SourceData;
  selected_sources?: string[];
  // legacy fields
  tone?: string;
  achievements?: string;
  memories?: string;
  future_dream?: string;
  school_name?: string;
  teaching_philosophy?: string;
  memorable_classes?: string;
  student_message?: string;
  closing_message?: string;
};

@Injectable()
export class AutobiographyCompilationService {
  generate(request: GenerateRequest): { generated_text: string; mode: AutobiographyMode } {
    const mode: AutobiographyMode =
      request.mode || request.tab || request.version || 'teacher';

    const text =
      mode === 'student'
        ? this.generateStudentText(request)
        : this.generateTeacherText(request);

    return { generated_text: text, mode };
  }

  // ─── 선생님 자서전 ────────────────────────────────────────────────────

  private generateTeacherText(req: GenerateRequest): string {
    const name = req.teacher_name?.trim() || '선생님';
    const role = req.teacher_role?.trim() || '담임교사';
    const focus = req.teacher_focus?.trim() || '';
    const prompt = req.prompt?.trim() || '';
    const src = req.source_data || {};
    const care = Array.isArray(src.careClassroom) ? src.careClassroom : [];
    const students = Array.isArray(src.studentRecords) ? src.studentRecords : [];

    const sections: string[] = [];

    // ── 프롤로그 ─────────────────────────────────────────────────────────
    const studentCount = students.length;
    const classSummary = studentCount > 0 ? `${studentCount}명의 학생들과 함께한` : '학생들과 함께한';
    const focusPart = focus ? ` ${focus}을(를) 중심으로` : '';

    sections.push(
      `【 프롤로그 】\n\n` +
      `${name} ${role}의 교직 이야기가 시작됩니다.\n\n` +
      `${classSummary} 하루하루는 단순한 수업이 아니었습니다.${focusPart} ` +
      `매일 아침 교실 문을 열 때마다, 오늘은 어떤 만남이 기다리고 있을까 설레는 마음이 앞섰습니다.\n\n` +
      (prompt ? `${prompt}\n\n` : ''),
    );

    // ── 돌봄교실 기록 기반 시간순 본문 ──────────────────────────────────
    if (care.length > 0) {
      const sorted = [...care].sort((a, b) => a.date.localeCompare(b.date));
      const byMonth: Record<string, CareRecord[]> = {};

      for (const rec of sorted) {
        const month = rec.date.slice(0, 7); // 'YYYY-MM'
        if (!byMonth[month]) byMonth[month] = [];
        byMonth[month].push(rec);
      }

      sections.push(`【 교실 일지 — 월별 기록 】\n`);

      for (const [month, recs] of Object.entries(byMonth)) {
        const [year, m] = month.split('-');
        sections.push(`\n▶ ${year}년 ${parseInt(m)}월\n`);

        for (const rec of recs) {
          const dateLabel = this.formatDate(rec.date);
          const lines: string[] = [`  • ${dateLabel}`];

          if (rec.mood) {
            lines.push(`    감정: ${rec.mood}`);
          }
          if (rec.events?.trim()) {
            lines.push(`    특이사항: ${rec.events.trim()}`);
          }
          if (rec.todos?.trim()) {
            lines.push(`    기록: ${rec.todos.trim()}`);
          }
          sections.push(lines.join('\n'));
        }

        // 월 소감 (감정 분포 기반)
        const moods = recs.map((r) => r.mood).filter(Boolean);
        const monthComment = this.buildMonthComment(moods, parseInt(m));
        if (monthComment) {
          sections.push(`\n  ${monthComment}\n`);
        }
      }

      // 전체 기록 통계 요약
      const totalDays = care.length;
      const allMoods = care.map((r) => r.mood).filter(Boolean);
      const positiveMoods = allMoods.filter((m) =>
        ['매우 좋음', '좋음', '행복함', '신남', '뿌듯함', '에너지 넘침', '즐거움', '의욕적임'].some(
          (pos) => m.includes(pos),
        ),
      );
      const positiveRate = allMoods.length > 0 ? Math.round((positiveMoods.length / allMoods.length) * 100) : 0;

      sections.push(
        `\n【 기록 요약 】\n\n` +
        `총 ${totalDays}일의 기록이 쌓였습니다. ` +
        (positiveRate > 0
          ? `그 중 ${positiveRate}%의 날이 긍정적인 감정으로 채워져 있었습니다. `
          : '') +
        `하루하루가 모여 한 학기, 한 해가 되었습니다.\n`,
      );
    } else {
      sections.push(
        `【 교직의 하루하루 】\n\n` +
        `크고 작은 수업 준비와 학생들과의 대화, 때로는 예상치 못한 상황을 함께 헤쳐나가며 ` +
        `${name}${role ? ` ${role}` : ''}의 하루는 채워졌습니다.\n`,
      );
    }

    // ── 학생 이야기 ─────────────────────────────────────────────────────
    if (students.length > 0) {
      const nameList = students
        .slice(0, 10)
        .map((s) => s.name)
        .filter(Boolean)
        .join(', ');
      const more = students.length > 10 ? ` 외 ${students.length - 10}명` : '';

      sections.push(
        `【 학생들 이야기 】\n\n` +
        `${nameList}${more} — ` +
        `이름 하나하나에 저마다의 이야기가 담겨 있습니다.\n\n` +
        `어떤 날은 작은 발표 하나에 박수를 보내고, ` +
        `어떤 날은 조용히 앉아 있는 아이의 마음이 궁금해 슬며시 다가가기도 했습니다. ` +
        `학생들이 성장하는 모습을 가장 가까이에서 지켜볼 수 있다는 것, ` +
        `그것이 이 일을 계속하게 만드는 힘이었습니다.\n`,
      );
    }

    // ── 에필로그 ────────────────────────────────────────────────────────
    sections.push(
      `【 에필로그 】\n\n` +
      `교직은 단순히 지식을 전달하는 일이 아닙니다. ` +
      `매일 아이들 앞에 서는 것, 그 자체가 배움입니다.\n\n` +
      `${name}의 이야기는 여기서 끝나지 않습니다. ` +
      `내년에도, 또 그다음 해에도 새로운 학생들과 새로운 이야기가 시작될 것입니다.\n`,
    );

    return sections.join('\n');
  }

  // ─── 학생 자서전 ─────────────────────────────────────────────────────

  private generateStudentText(req: GenerateRequest): string {
    const name = req.student_name?.trim() || '학생';
    const src = req.source_data || {};
    const care = Array.isArray(src.careClassroom) ? src.careClassroom : [];
    const lifeRecords = Array.isArray(src.lifeRecords) ? src.lifeRecords : [];
    const prompt = req.prompt?.trim() || '';

    const sections: string[] = [];

    sections.push(
      `【 나의 학교생활 이야기 — ${name} 】\n\n` +
      (prompt ? `${prompt}\n\n` : ''),
    );

    if (care.length > 0) {
      const sorted = [...care].sort((a, b) => a.date.localeCompare(b.date));

      sections.push(`【 하루하루의 기록 】\n`);

      for (const rec of sorted.slice(0, 20)) {
        const dateLabel = this.formatDate(rec.date);
        const parts: string[] = [`  ${dateLabel}`];
        if (rec.mood) parts.push(`감정: ${rec.mood}`);
        if (rec.events?.trim()) parts.push(`특이사항: ${rec.events.trim()}`);
        sections.push(parts.join(' / '));
      }

      if (sorted.length > 20) {
        sections.push(`  ... 외 ${sorted.length - 20}일 기록\n`);
      }
    }

    if (lifeRecords.length > 0) {
      const keywords = lifeRecords
        .map((r: any) => r.keyword)
        .filter(Boolean)
        .slice(0, 5)
        .join(', ');
      sections.push(
        `\n【 나를 표현하는 말 】\n\n${keywords}\n`,
      );
    }

    sections.push(
      `\n【 마치며 】\n\n` +
      `${name}의 이야기는 아직 진행 중입니다. ` +
      `앞으로의 하루하루도 지금처럼 열심히, 그리고 즐겁게 채워나가겠습니다.\n`,
    );

    return sections.join('\n');
  }

  // ─── 유틸 ─────────────────────────────────────────────────────────────

  private formatDate(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    } catch {
      return dateStr;
    }
  }

  private buildMonthComment(moods: string[], month: number): string {
    if (moods.length === 0) return '';

    const positive = moods.filter((m) =>
      ['좋음', '행복', '신남', '뿌듯', '에너지', '즐거', '의욕'].some((k) => m.includes(k)),
    ).length;
    const negative = moods.filter((m) =>
      ['슬픔', '화남', '걱정', '불안', '힘듦', '지침', '외로'].some((k) => m.includes(k)),
    ).length;

    const seasonMap: Record<number, string> = {
      3: '봄이 시작되는',
      4: '벚꽃이 피는',
      5: '신록이 짙어지는',
      6: '초여름의',
      7: '뜨거운 여름',
      8: '한여름',
      9: '풍요로운 가을',
      10: '단풍이 드는',
      11: '바람이 차가워지는',
      12: '한 해를 마무리하는',
      1: '새해가 시작되는',
      2: '겨울의 끝자락',
    };

    const season = seasonMap[month] || '';

    if (positive > negative) {
      return `${season} ${month}월, 교실은 대체로 밝고 활기찬 에너지로 가득했습니다.`;
    } else if (negative > positive) {
      return `${season} ${month}월, 쉽지 않은 날들도 있었지만 그 안에서 함께 성장했습니다.`;
    }
    return `${season} ${month}월의 기록이 차분히 쌓였습니다.`;
  }
}
