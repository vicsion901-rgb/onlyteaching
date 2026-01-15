import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

const EXTRA_FIELDS = [
  { key: 'residentNumber', label: '주민등록번호' },
  { key: 'address', label: '주소' },
  { key: 'sponsor', label: '전액자' },
  { key: 'remark', label: '비고' },
  { key: 'none', label: '사용 안함' },
];

const ADDABLE_FIELD_KEYS = EXTRA_FIELDS.filter((f) => f.key !== 'none').map((f) => f.key);

const getFieldWidthClass = () => 'w-32 min-w-[130px]';

function StudentRecords() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');
  const [selectedFields, setSelectedFields] = useState(['residentNumber', 'address', 'sponsor']);
  const saveTimeoutRef = useRef(null);
  const hasFetchedRef = useRef(false);
  const scrollRef = useRef(null);
  const topScrollRef = useRef(null);
  const isSyncingScroll = useRef(false);
  const [scrollWidth, setScrollWidth] = useState(1200);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const withPlaceholders = (list) => {
    if (!list) return [];
    const sorted = [...list].sort((a, b) => Number(a.number) - Number(b.number));
    const maxNum = Math.max(30, sorted.length > 0 ? Number(sorted[sorted.length - 1].number) : 0, 30);
    const rows = [];
    for (let num = 1; num <= maxNum; num += 1) {
      const found = sorted.find((s) => Number(s.number) === num);
      if (found) {
        rows.push({
          ...found,
          residentNumber: found.residentNumber || '',
          address: found.address || '',
          sponsor: found.sponsor || '',
          remark: found.remark || '',
        });
      } else if (rows.length < 30) {
        rows.push({
          id: `temp-${num}`,
          number: num,
          name: '',
          residentNumber: '',
          address: '',
          sponsor: '',
          remark: '',
        });
      }
    }
    // Ensure at least 30 rows
    while (rows.length < 30) {
      const num = rows.length + 1;
      rows.push({
        id: `temp-${num}`,
        number: num,
        name: '',
        residentNumber: '',
        address: '',
        sponsor: '',
        remark: '',
      });
    }
    return rows;
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await client.get('/student-records/list');
        const list = res.data && res.data.length > 0 ? res.data : [];
        setStudents(withPlaceholders(list));
        hasFetchedRef.current = true;
      } catch (error) {
        console.error("Failed to fetch students", error);
        // Fallback to empty rows
        setStudents(withPlaceholders([]));
        hasFetchedRef.current = true;
      }
    };
    fetchStudents();
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Include existing rows even if name is cleared, so 번호 stays.
  const buildPayload = (list) =>
    list
      .filter((s) => {
        const hasNumber = s.number && Number(s.number) > 0;
        const hasAnyField =
          (s.name && s.name.trim() !== '') ||
          (s.residentNumber && s.residentNumber.trim() !== '') ||
          (s.address && s.address.trim() !== '') ||
          (s.sponsor && s.sponsor.trim() !== '') ||
          (s.remark && s.remark.trim() !== '');
        return hasNumber && hasAnyField;
      })
      .map((s) => ({
        number: s.number,
        name: (s.name || '').trim(),
        residentNumber: (s.residentNumber || '').trim(),
        address: (s.address || '').trim(),
        sponsor: (s.sponsor || '').trim(),
        remark: (s.remark || '').trim(),
      }));

  const saveStudents = async (list, mode = 'manual') => {
    setIsSaving(true);
    setSaveMessage(mode === 'auto' ? '자동 저장 중...' : '저장 중...');
    try {
      const payload = buildPayload(list);
      const res = await client.post('/student-records/bulk', payload);
      const savedList = Array.isArray(res.data) ? res.data : [];
      setStudents(withPlaceholders(savedList));
      setSaveMessage(mode === 'auto' ? '자동 저장되었습니다.' : '저장되었습니다.');
    } catch (error) {
      console.error("Failed to save students", error);
      setSaveMessage('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerAutoSave = (nextList) => {
    if (!hasFetchedRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveMessage('자동 저장 대기 중...');
    saveTimeoutRef.current = setTimeout(() => {
      saveStudents(nextList, 'auto');
    }, 1200);
  };

  const handleFieldChange = (rowId, key, value) => {
    const next = students.map((student) => {
      const sid = student.student_id ?? student.id;
      return sid === rowId ? { ...student, [key]: value } : student;
    });
    setStudents(next);
    triggerAutoSave(next);
  };

  const handleFieldSelectChange = (idx, value) => {
    setSelectedFields((prev) => {
      const next = [...prev];
      if (value === 'none') {
        next.splice(idx, 1); // remove when selecting "사용 안함"
      } else {
        next[idx] = value;
      }
      return next;
    });
  };

  // Keep stable indexing back into selectedFields even if it already contains "none" entries
  // (e.g. from a previous session/hot-reload), so selecting "사용 안함" always removes the correct column.
  const visibleFieldEntries = selectedFields
    .map((field, originalIdx) => ({ field, originalIdx }))
    .filter(({ field }) => field !== 'none');

  const addRow = () => {
    const newId = students.length > 0 ? Math.max(...students.map((s) => s.number)) + 1 : 1;
    setStudents([
      ...students,
      {
        id: `temp-${newId}`,
        number: newId,
        name: '',
        residentNumber: '',
        address: '',
        sponsor: '',
        remark: '',
      },
    ]);
  };

  const handleSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    await saveStudents(students, 'manual');
  };

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        if (prompt) formData.append('prompt', prompt);
        formData.append('ai_model', selectedModel);
        
        res = await client.post('/prompts/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        setResponse(res.data.generated_document || JSON.stringify(res.data, null, 2));
        setUsedModel(res.data.ai_model || selectedModel);
      } else {
        res = await client.post('/prompts/', { 
          content: prompt,
          ai_model: selectedModel 
        });
        setResponse(res.data.generated_document);
        setUsedModel(res.data.ai_model);
      }
    } catch (error) {
      console.error("Failed to submit prompt", error);
      setResponse("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const syncScrollPositions = (source, target, left) => {
    if (!source.current || !target.current) return;
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    target.current.scrollLeft = left;
    // Allow the other handler to run after this frame
    setTimeout(() => {
      isSyncingScroll.current = false;
    }, 0);
  };

  const handleTopScroll = () => {
    if (!topScrollRef.current) return;
    syncScrollPositions(topScrollRef, scrollRef, topScrollRef.current.scrollLeft);
  };

  const handleBottomScroll = () => {
    if (!scrollRef.current) return;
    syncScrollPositions(scrollRef, topScrollRef, scrollRef.current.scrollLeft);
  };

  useEffect(() => {
    const updateWidth = () => {
      if (scrollRef.current) {
        setScrollWidth(scrollRef.current.scrollWidth || 1200);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      setScrollWidth(scrollRef.current.scrollWidth || 1200);
    }
  }, [selectedFields, students]);

  const scrollByAmount = (delta) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    dragStartX.current = e.pageX;
    dragScrollLeft.current = scrollRef.current.scrollLeft;
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    const walk = dragStartX.current - e.pageX;
    scrollRef.current.scrollLeft = dragScrollLeft.current + walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">학생명부</h1>
          <p className="mt-1 text-sm text-gray-500">학생 번호와 이름을 관리합니다</p>
        </div>
        <div className="flex items-start gap-3 ml-auto">
          <span className="text-sm text-gray-600 min-w-[130px] text-right pt-2">{saveMessage}</span>
          <div className="flex flex-col items-end gap-2 mt-8">
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-primary-600 hover:text-primary-900 font-medium"
            >
              &larr; 홈으로 돌아가기
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isSaving ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors`}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="bg-white shadow rounded-lg overflow-hidden h-full flex flex-col lg:w-1/2">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center sticky top-0 z-10">
            <span className="text-sm text-gray-700 font-medium">학생 이름 입력 후 저장을 눌러주세요.</span>
          </div>
          {/* Top horizontal scrollbar */}
          <div className="bg-gray-50 px-6 py-2 border-b border-gray-200">
            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              className="overflow-x-auto w-full h-3"
            >
              <div style={{ width: `${scrollWidth}px` }} className="h-2 rounded-full bg-gray-200" />
            </div>
          </div>
          <div className="relative">
            <div
              className="overflow-x-auto w-full cursor-grab active:cursor-grabbing"
              ref={scrollRef}
              onScroll={handleBottomScroll}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Flex-based "table" layout (no table/grid/colgroup/space-between) */}
              <div className="inline-flex w-max flex-col" data-sr-gapref>
                {/* Header row */}
                <div className="bg-gray-50 border-b border-gray-200 px-2 py-3">
                  <div className="flex items-center justify-start" data-sr-header-parent>
                    {/* Left group: 번호 + 이름 (fixed group, gap-only) */}
                    <div className="flex items-center gap-3 whitespace-nowrap flex-shrink-0" data-sr-left>
                      <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[44px]">
                        번호
                      </div>
                      <div className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        <span data-sr-name>이름</span>
                      </div>
                    </div>

                    {/* Right group: selectable tabs accumulate to the right with a single fixed margin-left */}
                    <div className="flex items-center gap-3 whitespace-nowrap" data-sr-tabs>
                      {visibleFieldEntries.map(({ field, originalIdx }) => (
                        <div
                          key={`h-${field}-${originalIdx}`}
                          className={getFieldWidthClass(field)}
                          data-sr-field={field}
                        >
                          <select
                            value={field}
                            onChange={(e) => handleFieldSelectChange(originalIdx, e.target.value)}
                            className="text-xs border rounded px-2 py-1 bg-white w-full"
                          >
                            {EXTRA_FIELDS.map((opt) => (
                              <option key={opt.key} value={opt.key}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFields((prev) => {
                            const used = new Set(prev);
                            const nextKey = ADDABLE_FIELD_KEYS.find((k) => !used.has(k)) || 'residentNumber';
                            return [...prev, nextKey];
                          })
                        }
                        className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 text-sm"
                        title="필드 추가"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Body rows */}
                <div className="bg-white">
                  {students.map((student) => (
                    <div
                      key={student.student_id || student.id}
                      className="flex items-center border-b border-gray-200 hover:bg-gray-50 px-2"
                    >
                      {/* Left group cells */}
                      <div className="flex items-center gap-3 whitespace-nowrap py-2 flex-shrink-0" data-sr-left>
                        <div className="w-[44px] text-sm font-medium text-gray-900">
                          {student.number}
                        </div>
                        <div className="w-[180px]">
                          <input
                            type="text"
                            value={student.name}
                            onChange={(e) =>
                              handleFieldChange(student.student_id ?? student.id, 'name', e.target.value)
                            }
                            className="w-full min-w-0 border-0 focus:ring-2 focus:ring-primary-500 rounded-md px-0 py-2 text-sm"
                            placeholder=""
                          />
                        </div>
                      </div>

                      {/* Right group cells */}
                      <div className="flex items-center gap-3 whitespace-nowrap py-2" data-sr-tabs>
                        {visibleFieldEntries.map(({ field, originalIdx }) => (
                          <div key={`c-${student.id}-${field}-${originalIdx}`} className={getFieldWidthClass(field)}>
                            {field ? (
                              <input
                                type="text"
                                value={student[field] || ''}
                                onChange={(e) =>
                                  handleFieldChange(student.student_id ?? student.id, field, e.target.value)
                                }
                                className="w-full border-0 focus:ring-2 focus:ring-primary-500 rounded-md px-3 py-2 text-sm"
                                placeholder=""
                              />
                            ) : null}
                          </div>
                        ))}
                        {/* Spacer so rows match header height even if right group empty */}
                        <div className="w-8" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <style>{`
                /* Use 번호–이름 "실제 간격"을 기준값으로 삼아 이름–주민등록번호 간격에 그대로 복제 */
                [data-sr-gapref] {
                  --sr-gap: 12px;
                }
                /* Force header spacing between '이름' and '주민등록번호' regardless of layout changes */
                [data-sr-header-parent] {
                  justify-content: flex-start !important;
                  gap: 0 !important;
                }
                [data-sr-tabs] {
                  margin-left: var(--sr-gap) !important;
                }
                [data-sr-left] {
                  gap: var(--sr-gap) !important;
                }
                [data-sr-field="residentNumber"] {
                  width: auto !important;
                  min-width: unset !important;
                  flex: 0 0 auto !important;
                }
                [data-sr-field="residentNumber"] select {
                  width: auto !important;
                  min-width: unset !important;
                  flex: 0 0 auto !important;
                }
              `}</style>
            </div>
          </div>
          <div className="w-full flex justify-center py-4 border-t border-gray-200">
            <button
              onClick={addRow}
              className="inline-flex items-center px-4 py-2 border border-black text-sm font-medium rounded-md text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              학생 추가
            </button>
          </div>
        </div>

        {/* AI Prompt Section */}
        <div className="bg-white overflow-hidden shadow rounded-lg h-full flex flex-col lg:w-1/2">
          <div className="px-4 py-5 sm:p-6 flex-1 flex flex-col">
            <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">학생명부 관련해서 무엇이든 물어보세요.</h2>
            
            <form onSubmit={handlePromptSubmit} className="flex-1 flex flex-col">
              <div className="mb-2 flex flex-col" style={{ minHeight: '480px' }}>
                <label htmlFor="prompt" className="sr-only">Prompt</label>
                <div className="relative">
                  <textarea
                    id="prompt"
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pb-10 min-h-[400px] max-h-[560px] whitespace-nowrap"
                    rows={12}
                    placeholder="학생명부가 담긴 한글 문서, 엑셀 파일, 이미지 파일을 드래그해 주시면 자동 반영됩니다."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                  <div className="absolute bottom-2 left-2">
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files[0])}
                      />
                      <label
                        htmlFor="file-upload"
                        className={`cursor-pointer inline-flex items-center p-1.5 rounded-full hover:bg-gray-100 transition-colors ${file ? 'text-primary-600 bg-primary-50' : 'text-gray-400'}`}
                        title="이미지 업로드"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                        </svg>
                        {file && <span className="ml-1 text-xs font-medium">{file.name}</span>}
                      </label>
                    </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                  >
                    {isSubmitting ? '생성 중...' : '생성하기'}
                  </button>
                </div>
              </div>
            </form>
            {response && (
              <div className="mt-6 bg-gray-50 rounded-md p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-gray-900">결과:</h3>
                  {usedModel && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      usedModel.startsWith('claude') ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {usedModel.startsWith('claude') ? '🤖 Claude' : 
                       usedModel === 'gpt-4o-mini' ? '⚡ GPT-4o Mini' : '🧠 GPT-4o'}
                    </span>
                  )}
                </div>
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-white p-3 rounded border border-gray-200">{response}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentRecords;
