import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

function SubjectEvaluation() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');
  const [achievements, setAchievements] = useState([]);
  const [achMeta, setAchMeta] = useState({ subjects: [], grade_groups: [], areas: [] });
  const [gradeFilter, setGradeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [isAchLoading, setIsAchLoading] = useState(false);

  useEffect(() => {
    fetchAchievementStandards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeFilter, subjectFilter, areaFilter]);

  const fetchAchievementStandards = async () => {
    setIsAchLoading(true);
    try {
      const res = await client.get('/achievement-standards', {
        params: {
          grade_group: gradeFilter || undefined,
          subject: subjectFilter || undefined,
          area: areaFilter || undefined,
        },
      });
      setAchievements(res.data?.items || []);
      setAchMeta(res.data?.meta || { subjects: [], grade_groups: [], areas: [] });
    } catch (error) {
      console.error("Failed to load achievement standards", error);
    } finally {
      setIsAchLoading(false);
    }
  };

  const handlePromptSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await client.post('/prompts/', { 
        content: prompt,
        ai_model: selectedModel 
      });
      setResponse(res.data.generated_document);
      setUsedModel(res.data.ai_model);
    } catch (error) {
      console.error("Failed to submit prompt", error);
      setResponse("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 교과평가</h1>
          <p className="mt-1 text-sm text-gray-500">교과별 평가 및 성적을 관리합니다</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium"
        >
          &larr; 업무도우미로 돌아가기
        </button>
      </div>

      {/* 성취기준 미리보기 */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">학년·과목별 성취기준</h2>
              <p className="text-sm text-gray-500 mt-1">필터를 선택하면 해당 학년군·교과의 성취기준과 임의입력 예시를 볼 수 있습니다.</p>
            </div>
            <button
              onClick={fetchAchievementStandards}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              확인
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={gradeFilter}
              onChange={(e) => {
                setGradeFilter(e.target.value);
                // 학년군이 바뀌면 기존 영역 선택은 불일치할 수 있으니 초기화
                setAreaFilter('');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">전체 학년군</option>
              {(achMeta.grade_groups || []).sort().map((g) => (
                <option key={g} value={g}>{g}학년군</option>
              ))}
            </select>
            <select
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value);
                // 과목이 바뀌면 영역 목록도 바뀌므로 초기화
                setAreaFilter('');
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">전체 교과</option>
              {(achMeta.subjects || []).sort().map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            >
              <option value="">전체 영역</option>
              {(achMeta.areas || []).sort().map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {isAchLoading && (
              <div className="text-sm text-gray-500">불러오는 중...</div>
            )}
            {!isAchLoading && achievements.length === 0 && (
              <div className="text-sm text-gray-500">표시할 성취기준이 없습니다.</div>
            )}
            {!isAchLoading && achievements.map((item) => (
              <div
                key={`${item.id}-${item.code}`}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50"
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">{item.subject} · {item.grade_group}학년군</div>
                    <div className="text-sm font-semibold text-gray-900">{item.standard}</div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div className="font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{item.area}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="text-xs font-semibold text-gray-700">임의입력 예시</div>
                  <div className="grid md:grid-cols-3 gap-2">
                    {(item.examples || []).map((ex) => (
                      <div
                        key={ex.level}
                        className="text-sm text-gray-800 bg-white border border-gray-200 rounded-md px-2 py-1"
                      >
                        <span className="font-medium text-gray-900 mr-1">[{ex.level}]</span>
                        {ex.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Prompt Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">교과평가 관련 무엇이든 물어보세요.</h2>
          
          <form onSubmit={handlePromptSubmit}>
            <div className="mb-2">
              <label htmlFor="prompt" className="sr-only">Prompt</label>
              <div className="relative">
                <textarea
                  id="prompt"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pb-10"
                  rows={12}
                  placeholder="교과평가 관련 무엇이든 물어보세요."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <div className="flex justify-end mt-3">
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${isLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                >
                  {isLoading ? '생성 중...' : '생성하기'}
                </button>
              </div>
            </div>
          </form>
          {response && (
            <div className="mt-6 bg-gray-50 rounded-md p-4 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
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
  );
}

export default SubjectEvaluation;
