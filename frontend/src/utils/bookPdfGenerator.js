function generateBookPdf({ bookType, title, subtitle, author, items, growthStats }) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('팝업 차단을 해제해 주세요.');
    return;
  }

  const coverBg = {
    poem: '#fef3c7',
    story: '#dbeafe',
    essay: '#fce7f3',
    growth: '#d1fae5',
  }[bookType] || '#f3f4f6';

  const coverAccent = {
    poem: '#92400e',
    story: '#1e40af',
    essay: '#9d174d',
    growth: '#065f46',
  }[bookType] || '#374151';

  const bookEmoji = {
    poem: '📜',
    story: '📖',
    essay: '✍️',
    growth: '🌱',
  }[bookType] || '📕';

  const pages = [];

  pages.push(`
    <div class="page cover" style="background:${coverBg};">
      <div class="cover-content">
        <div class="cover-emoji">${bookEmoji}</div>
        <h1 style="color:${coverAccent}">${esc(title)}</h1>
        ${subtitle ? `<p class="subtitle">${esc(subtitle)}</p>` : ''}
        <p class="author">글쓴이: ${esc(author || '나')}</p>
        <p class="date">${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}</p>
      </div>
    </div>
  `);

  if (items && items.length > 0) {
    const tocItems = items.map((item, i) =>
      `<div class="toc-item"><span class="toc-num">${i + 1}.</span> ${esc(item.title || `글 ${i + 1}`)}</div>`
    ).join('');
    pages.push(`
      <div class="page">
        <h2 class="section-title">목차</h2>
        <div class="toc">${tocItems}</div>
      </div>
    `);
  }

  if (items && items.length > 0) {
    items.forEach((item, i) => {
      const content = (item.content || '').trim();
      if (!content) return;
      const feelingHtml = item.feeling ? `<p class="piece-feeling">"${esc(item.feeling)}"</p>` : '';
      const sourceHtml = (bookType === 'poem' && item.sourceAuthor) ? `<p class="piece-source">원작: ${esc(item.sourceAuthor)} — ${esc(item.sourceTitle || '')}</p>` : '';
      pages.push(`
        <div class="page">
          <div class="piece-header">
            <span class="piece-num">${i + 1}</span>
            <h3 class="piece-title">${esc(item.title || `글 ${i + 1}`)}</h3>
            ${item.typeLabel ? `<span class="piece-type">${esc(item.typeLabel)}</span>` : ''}
          </div>
          <div class="piece-body ${bookType === 'poem' ? 'poem-style' : ''}">${esc(content).replace(/\n/g, '<br>')}</div>
          ${feelingHtml}
          ${sourceHtml}
          ${item.createdAt ? `<p class="piece-date">${new Date(item.createdAt).toLocaleDateString('ko-KR')}</p>` : ''}
        </div>
      `);
    });
  }

  if (bookType === 'growth' && growthStats) {
    const typeList = Object.entries(growthStats.types || {})
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `<span class="stat-tag">${esc(k)} ${v}회</span>`)
      .join('');

    pages.push(`
      <div class="page">
        <h2 class="section-title">부록: 나의 성장 기록</h2>
        <div class="growth-stats">
          <div class="stat-row"><span class="stat-label">총 활동</span><span class="stat-value">${growthStats.total}개</span></div>
          <div class="stat-row"><span class="stat-label">제출 완료</span><span class="stat-value">${growthStats.submitted}개</span></div>
          ${growthStats.manuscriptCount > 0 ? `<div class="stat-row"><span class="stat-label">원고지 연습</span><span class="stat-value">${growthStats.manuscriptCount}회</span></div>` : ''}
          ${growthStats.avgAccuracy != null ? `<div class="stat-row"><span class="stat-label">평균 정확도</span><span class="stat-value">${growthStats.avgAccuracy}%</span></div>` : ''}
        </div>
        <div class="stat-tags">${typeList}</div>
      </div>
    `);
  }

  pages.push(`
    <div class="page colophon">
      <div class="colophon-content">
        <p class="colophon-title">${esc(title)}</p>
        <p>글쓴이: ${esc(author || '나')}</p>
        <p>발행일: ${new Date().toLocaleDateString('ko-KR')}</p>
        <p class="colophon-note">OnlyTeaching 온리티칭에서 만들었습니다</p>
      </div>
    </div>
  `);

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${esc(title)}</title>
<style>
@page { size: A5; margin: 15mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Pretendard', 'Noto Sans KR', -apple-system, sans-serif; color: #1f2937; line-height: 1.8; font-size: 12pt; }
.page { page-break-after: always; min-height: 100vh; padding: 20mm 15mm; position: relative; }
.page:last-child { page-break-after: auto; }

.cover { display: flex; align-items: center; justify-content: center; }
.cover-content { text-align: center; }
.cover-emoji { font-size: 64pt; margin-bottom: 20px; }
.cover h1 { font-size: 22pt; font-weight: 800; margin-bottom: 8px; }
.subtitle { font-size: 11pt; color: #6b7280; margin-bottom: 16px; }
.author { font-size: 11pt; color: #4b5563; margin-bottom: 6px; }
.date { font-size: 9pt; color: #9ca3af; }

.section-title { font-size: 14pt; font-weight: 700; color: #374151; margin-bottom: 20px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }

.toc { margin-top: 10px; }
.toc-item { font-size: 11pt; padding: 6px 0; border-bottom: 1px dotted #d1d5db; }
.toc-num { color: #6b7280; margin-right: 8px; }

.piece-header { margin-bottom: 16px; }
.piece-num { font-size: 9pt; color: #9ca3af; margin-right: 6px; }
.piece-title { font-size: 14pt; font-weight: 700; color: #1f2937; display: inline; }
.piece-type { font-size: 8pt; color: #9ca3af; margin-left: 8px; background: #f3f4f6; padding: 2px 6px; border-radius: 8px; }
.piece-body { font-size: 11pt; line-height: 2; white-space: pre-wrap; }
.poem-style { line-height: 2.2; font-style: italic; padding-left: 10mm; border-left: 2px solid #d1d5db; }
.piece-date { font-size: 8pt; color: #9ca3af; margin-top: 16px; text-align: right; }
.piece-feeling { font-size: 9pt; color: #7c3aed; font-style: italic; margin-top: 12px; padding-left: 8mm; border-left: 2px solid #c4b5fd; }
.piece-source { font-size: 8pt; color: #9ca3af; margin-top: 6px; }

.growth-stats { margin: 20px 0; }
.stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 11pt; }
.stat-label { color: #6b7280; }
.stat-value { font-weight: 700; color: #1f2937; }
.stat-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.stat-tag { font-size: 9pt; background: #d1fae5; color: #065f46; padding: 3px 10px; border-radius: 12px; }

.colophon { display: flex; align-items: flex-end; justify-content: center; }
.colophon-content { text-align: center; font-size: 9pt; color: #9ca3af; line-height: 2; }
.colophon-title { font-size: 11pt; font-weight: 700; color: #6b7280; margin-bottom: 8px; }
.colophon-note { margin-top: 20px; font-size: 8pt; }

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
${pages.join('\n')}
<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }<\/script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export { generateBookPdf };
