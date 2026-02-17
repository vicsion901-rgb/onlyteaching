import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

function CreativeActivities() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [activities, setActivities] = useState([]);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const selectAllRef = useRef(null);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);

  // Button styles: force visible text regardless of parent/global text styles.
  // Tailwind "!" modifier ensures the color/leading are not overridden by surrounding styles.
  const actionBtnBase =
    'inline-flex items-center justify-center gap-1 rounded-md shadow-sm font-semibold text-sm leading-[1.2] ' +
    '!text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'disabled:opacity-60 disabled:cursor-not-allowed disabled:!text-white';

  const nowYear = useMemo(() => new Date().getFullYear(), []);
  const [form, setForm] = useState({
    student_id: '',
    school_year: nowYear,
    grade: 3,
    semester: 1,
    activity_type: '자율',
    title: '',
    activity_date: '',
    hours: '',
    teacher_observation: '',
    detail: {},
  });

  const fetchStudents = async () => {
    setIsLoadingStudents(true);
    setErrorMsg('');
    try {
      const res = await client.get('/student-records/list');
      const list = Array.isArray(res.data) ? res.data : [];
      const cleaned = list
        .filter((s) => s && typeof s.id !== 'undefined')
        .map((s) => ({
          id: s.id,
          number: s.number,
          name: s.name || '',
        }))
        .sort((a, b) => Number(a.number) - Number(b.number));
      setStudents(cleaned);
      if (!selectedStudentId && cleaned.length > 0) {
        setSelectedStudentId(String(cleaned[0].id));
      }
    } catch (e) {
      console.error(e);
      setErrorMsg('학생 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const fetchActivities = async (studentId) => {
    if (!studentId) return;
    setIsLoadingActivities(true);
    setErrorMsg('');
    try {
      const res = await client.get(`/creative-activities/student/${studentId}`);
      setActivities(res.data?.activities || []);
    } catch (e) {
      console.error(e);
      setErrorMsg('창의적 체험활동 목록을 불러오지 못했습니다.');
      setActivities([]);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      fetchActivities(selectedStudentId);
      setForm((prev) => ({ ...prev, student_id: Number(selectedStudentId) }));
    }
  }, [selectedStudentId]);

  const setDetail = (patch) => {
    setForm((prev) => ({ ...prev, detail: { ...(prev.detail || {}), ...patch } }));
  };

  const saveActivity = async () => {
    setErrorMsg('');

    if (!form.student_id) {
      setErrorMsg('학생을 선택해주세요.');
      return;
    }
    if (!form.school_year || !form.grade) {
      setErrorMsg('학년도/학년을 입력해주세요.');
      return;
    }
    if (!form.activity_type) {
      setErrorMsg('활동 유형을 선택해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...form,
        student_id: Number(form.student_id),
        school_year: Number(form.school_year),
        grade: Number(form.grade),
        semester: form.semester === '' ? null : Number(form.semester),
        hours: form.hours === '' ? null : Number(form.hours),
      };
      const res = await client.post('/creative-activities', payload);
      if (!res.data?.success) throw new Error(res.data?.error || '저장 실패');

      // reset minimal fields, keep student/year/grade/semester/type
      setForm((prev) => ({
        ...prev,
        title: '',
        activity_date: '',
        hours: '',
        teacher_observation: '',
        detail: {},
      }));
      await fetchActivities(String(form.student_id));
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await saveActivity();
  };

  const toggleSelected = (id) => {
    setSelectedActivityIds((prev) => {
      const n = Number(id);
      const set = new Set(prev.map(Number));
      if (set.has(n)) set.delete(n);
      else set.add(n);
      return Array.from(set);
    });
  };

  const clearSelected = () => setSelectedActivityIds([]);

  const allActivityIds = useMemo(() => activities.map((a) => Number(a.id)).filter((n) => Number.isFinite(n)), [activities]);
  const selectedSet = useMemo(() => new Set(selectedActivityIds.map(Number)), [selectedActivityIds]);
  const selectedCountInList = useMemo(
    () => allActivityIds.reduce((acc, id) => (selectedSet.has(id) ? acc + 1 : acc), 0),
    [allActivityIds, selectedSet],
  );
  const isAllSelected = allActivityIds.length > 0 && selectedCountInList === allActivityIds.length;
  const isSomeSelected = selectedCountInList > 0 && selectedCountInList < allActivityIds.length;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = isSomeSelected;
  }, [isSomeSelected]);

  useEffect(() => {
    // 목록이 바뀌면(학생 변경/새로고침/삭제 후) 현재 목록에 없는 선택값은 제거
    setSelectedActivityIds((prev) => prev.map(Number).filter((id) => allActivityIds.includes(id)));
  }, [allActivityIds]);

  const toggleSelectAll = () => {
    setSelectedActivityIds((prev) => {
      const prevSet = new Set(prev.map(Number));
      const next = new Set(prevSet);
      if (isAllSelected) {
        // 전체 해제: 현재 목록에 있는 것만 해제
        allActivityIds.forEach((id) => next.delete(id));
      } else {
        // 전체 선택: 현재 목록의 id를 모두 포함
        allActivityIds.forEach((id) => next.add(id));
      }
      return Array.from(next);
    });
  };

  const handleDeleteSelected = async () => {
    if (!selectedActivityIds || selectedActivityIds.length === 0) return;
    const count = selectedActivityIds.length;
    if (!window.confirm(`선택한 활동 ${count}건을 삭제할까요?`)) return;

    setIsDeleting(true);
    setErrorMsg('');
    try {
      for (const id of selectedActivityIds) {
        const res = await client.delete(`/creative-activities/${id}`);
        if (!res.data?.success) throw new Error(res.data?.error || '삭제 실패');
      }
      clearSelected();
      await fetchActivities(selectedStudentId);
    } catch (e) {
      console.error(e);
      setErrorMsg(e?.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const activityTypeLabel = form.activity_type;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">🎨 창의적 체험활동</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium"
        >
          &larr; 홈으로 돌아가기
        </button>
      </div>
      <div className="bg-white shadow rounded-lg p-6 text-gray-700">
        창의적 체험활동을 계획·정리하는 페이지입니다. 아래에서 학생을 선택하고 활동 기록을 추가하면 바로 저장됩니다.
      </div>

      {errorMsg ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm">{errorMsg}</div>
      ) : null}

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="w-full md:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">학생 선택</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              disabled={isLoadingStudents}
            >
              {students.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.number ? `${s.number}번 ` : ''}{s.name || '(이름 없음)'}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => {
              const hasInput = form.title || form.activity_date || form.hours || form.teacher_observation || Object.values(form.detail || {}).some(v => v);
              if (hasInput) {
                setShowRefreshConfirm(true);
              } else {
                fetchActivities(selectedStudentId);
              }
            }}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50"
            disabled={!selectedStudentId || isLoadingActivities}
          >
            {isLoadingActivities ? '불러오는 중...' : '목록 새로고침'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학년도</label>
              <input
                value={form.school_year}
                onChange={(e) => setForm((p) => ({ ...p, school_year: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학년</label>
              <select
                value={String(form.grade)}
                onChange={(e) => setForm((p) => ({ ...p, grade: Number(e.target.value) }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              >
                <option value="1">1학년</option>
                <option value="2">2학년</option>
                <option value="3">3학년</option>
                <option value="4">4학년</option>
                <option value="5">5학년</option>
                <option value="6">6학년</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">학기</label>
              <select
                value={form.semester}
                onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              >
                <option value="1">1학기</option>
                <option value="2">2학기</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
              <select
                value={form.activity_type}
                onChange={(e) => setForm((p) => ({ ...p, activity_type: e.target.value, detail: {} }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
              >
                <option value="자율">자율</option>
                <option value="동아리">동아리</option>
                <option value="봉사">봉사</option>
                <option value="진로">진로</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">활동명</label>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                placeholder="예: 학교 환경정화"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">활동일</label>
              <input
                value={form.activity_date}
                onChange={(e) => setForm((p) => ({ ...p, activity_date: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                placeholder="YYYY-MM-DD"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시간(시)</label>
              <input
                value={form.hours}
                onChange={(e) => setForm((p) => ({ ...p, hours: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                inputMode="decimal"
                placeholder="예: 2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">교사 관찰/기록</label>
              <input
                value={form.teacher_observation}
                onChange={(e) => setForm((p) => ({ ...p, teacher_observation: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                placeholder="예: 성실히 참여함"
              />
            </div>
          </div>

          {/* Detail fields per type (minimal) */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="text-sm font-semibold text-gray-800 mb-3">세부 정보 ({activityTypeLabel})</div>

            {activityTypeLabel === '자율' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">활동 주제</label>
                  <input
                    value={form.detail?.activity_theme || ''}
                    onChange={(e) => setDetail({ activity_theme: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">참여 역할</label>
                  <input
                    value={form.detail?.participation_role || ''}
                    onChange={(e) => setDetail({ participation_role: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>
            ) : null}

            {activityTypeLabel === '동아리' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">동아리명</label>
                  <input
                    value={form.detail?.club_name || ''}
                    onChange={(e) => setDetail({ club_name: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">활동 분야</label>
                  <input
                    value={form.detail?.activity_field || ''}
                    onChange={(e) => setDetail({ activity_field: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                  <input
                    value={form.detail?.role || ''}
                    onChange={(e) => setDetail({ role: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>
            ) : null}

            {activityTypeLabel === '봉사' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">봉사 장소</label>
                  <input
                    value={form.detail?.service_place || ''}
                    onChange={(e) => setDetail({ service_place: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">봉사 내용</label>
                  <input
                    value={form.detail?.service_content || ''}
                    onChange={(e) => setDetail({ service_content: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">인정 시간</label>
                  <input
                    value={form.detail?.recognized_hours || ''}
                    onChange={(e) => setDetail({ recognized_hours: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                    inputMode="decimal"
                  />
                </div>
              </div>
            ) : null}

            {activityTypeLabel === '진로' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">진로 주제</label>
                  <input
                    value={form.detail?.career_theme || ''}
                    onChange={(e) => setDetail({ career_theme: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">관련 직업/멘토</label>
                  <input
                    value={form.detail?.related_job || ''}
                    onChange={(e) => setDetail({ related_job: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">학습 내용</label>
                  <input
                    value={form.detail?.learning_content || ''}
                    onChange={(e) => setDetail({ learning_content: e.target.value })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className={`${actionBtnBase} px-4 py-2 bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500`}
              disabled={isSaving}
              aria-label="창의적 체험활동 저장"
              aria-disabled={isSaving}
              aria-busy={isSaving}
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">활동 목록</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveActivity}
              className={`${actionBtnBase} px-3 py-2 bg-gray-800 hover:bg-gray-900 focus-visible:ring-gray-800`}
              disabled={isSaving || isDeleting}
              title="현재 입력된 내용을 추가(저장)합니다."
              aria-label="활동 추가 저장"
              aria-disabled={isSaving || isDeleting}
              aria-busy={isSaving}
            >
              {isSaving ? '추가 중...' : '추가'}
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className={`${actionBtnBase} px-3 py-2 bg-red-600 hover:bg-red-700 focus-visible:ring-red-600`}
              disabled={selectedActivityIds.length === 0 || isSaving || isDeleting}
              title="목록에서 선택한 항목을 삭제합니다."
              aria-label={`선택된 활동 삭제 (${selectedActivityIds.length}건)`}
              aria-disabled={selectedActivityIds.length === 0 || isSaving || isDeleting}
              aria-busy={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
            <div className="text-sm text-gray-500 ml-2">
              {isLoadingActivities ? '불러오는 중...' : `${activities.length}건`}
            </div>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="text-sm text-gray-500">저장된 활동이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 border-b">
                  <th className="py-2 pr-3 w-16">
                    <div className="flex items-center gap-2">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4"
                        aria-label="전체 선택"
                      />
                      <span>선택</span>
                    </div>
                  </th>
                  <th className="py-2 pr-3">영역</th>
                  <th className="py-2 pr-3">활동명</th>
                  <th className="py-2 pr-3">일자</th>
                  <th className="py-2 pr-3">시간</th>
                  <th className="py-2 pr-3">기록</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr
                    key={a.id}
                    className={[
                      'border-b last:border-b-0 cursor-pointer',
                      selectedActivityIds.map(Number).includes(Number(a.id)) ? 'bg-primary-50' : 'hover:bg-gray-50',
                    ].join(' ')}
                    onClick={() => toggleSelected(a.id)}
                    title="삭제할 항목은 체크(선택) 후 삭제 버튼을 누르세요."
                  >
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selectedActivityIds.map(Number).includes(Number(a.id))}
                        onChange={() => toggleSelected(a.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4"
                        aria-label="삭제 선택"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      {a.area === 'autonomous' ? '자율' : null}
                      {a.area === 'club' ? '동아리' : null}
                      {a.area === 'volunteer' ? '봉사' : null}
                      {a.area === 'career' ? '진로' : null}
                    </td>
                    <td className="py-2 pr-3 font-medium text-gray-900">{a.title || '-'}</td>
                    <td className="py-2 pr-3">{a.start_date || '-'}</td>
                    <td className="py-2 pr-3">{typeof a.hours === 'number' ? a.hours : (a.hours || '-')}</td>
                    <td className="py-2 pr-3 text-gray-700">{a.content || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Refresh Confirmation Modal */}
      {showRefreshConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">확인</h3>
            <p className="text-sm text-gray-600 mb-6">입력되어 있는 내용들을 삭제하시겠습니까?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRefreshConfirm(false)}
                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                아니오
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(prev => ({
                    ...prev,
                    title: '',
                    activity_date: '',
                    hours: '',
                    teacher_observation: '',
                    detail: {},
                  }));
                  setShowRefreshConfirm(false);
                  fetchActivities(selectedStudentId);
                }}
                className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                네
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreativeActivities;

