import React, { useState } from 'react';
import client from '../api/client';

const GRADES = [1, 2, 3, 4, 5, 6];

export default function ProfileCompletionModal({ initial, onSaved, onClose }) {
  const [nickname, setNickname] = useState(initial?.nickname || '');
  const [gradeLevel, setGradeLevel] = useState(initial?.gradeLevel || '');
  const [classNumber, setClassNumber] = useState(initial?.classNumber || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const missingNickname = !nickname.trim();
  const missingGrade = !gradeLevel;
  const missingClass = !classNumber;
  const allFilled = !missingNickname && !missingGrade && !missingClass;

  const handleSave = async () => {
    setErrorMsg('');
    if (!allFilled) {
      setErrorMsg('세 항목을 모두 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) { setErrorMsg('로그인 정보가 없어요. 다시 로그인해 주세요.'); setSaving(false); return; }
      const res = await client.post('/api/account', {
        userId,
        action: 'updateProfile',
        nickname: nickname.trim(),
        gradeLevel: Number(gradeLevel),
        classNumber: Number(classNumber),
      });
      const data = res.data || {};
      try {
        if (data.nickname) localStorage.setItem('nickname', data.nickname);
        if (data.gradeLevel) localStorage.setItem('gradeLevel', String(data.gradeLevel));
        if (data.classNumber) localStorage.setItem('classNumber', String(data.classNumber));
      } catch {}
      onSaved?.({
        nickname: data.nickname || nickname.trim(),
        gradeLevel: data.gradeLevel || Number(gradeLevel),
        classNumber: data.classNumber || Number(classNumber),
      });
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || '저장 중 오류가 발생했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-indigo-700 uppercase">기본 정보 안내</p>
              <h2 className="mt-0.5 text-lg font-bold text-gray-900">프로필을 먼저 완성해 주세요</h2>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                교과평가, 창체, 학생 기록을 정확히 연결하려면 닉네임·담당 학년·담당 반 정보가 필요해요.
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="닫기"
              className="shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="flex items-center justify-between text-[11px] font-medium text-gray-600 mb-1">
                <span>닉네임</span>
                {missingNickname && <span className="text-[10px] font-semibold text-rose-500">입력 필요</span>}
              </label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                placeholder="예) 강민주 선생님" maxLength={20}
                className={`block w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 ${missingNickname ? 'border-rose-300 bg-rose-50/30' : 'border-gray-300'}`} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="flex items-center justify-between text-[11px] font-medium text-gray-600 mb-1">
                  <span>담당 학년</span>
                  {missingGrade && <span className="text-[10px] font-semibold text-rose-500">필요</span>}
                </label>
                <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}
                  className={`block w-full rounded-lg border px-2 py-2 text-sm focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 ${missingGrade ? 'border-rose-300 bg-rose-50/30' : 'border-gray-300'}`}>
                  <option value="">선택</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}학년</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center justify-between text-[11px] font-medium text-gray-600 mb-1">
                  <span>담당 반</span>
                  {missingClass && <span className="text-[10px] font-semibold text-rose-500">필요</span>}
                </label>
                <input type="number" min="1" max="30" value={classNumber} onChange={(e) => setClassNumber(e.target.value)}
                  placeholder="예) 3"
                  className={`block w-full rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 ${missingClass ? 'border-rose-300 bg-rose-50/30' : 'border-gray-300'}`} />
              </div>
            </div>

            {errorMsg && (
              <p className="rounded-md bg-rose-50 border border-rose-200 px-2.5 py-1.5 text-xs text-rose-700">{errorMsg}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">나중에</button>
              <button type="button" onClick={handleSave} disabled={saving || !allFilled}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60">
                {saving ? '저장 중...' : '저장하고 시작하기'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center pt-1">
              나중에 닫아도 다음 로그인 때 다시 안내해 드려요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
