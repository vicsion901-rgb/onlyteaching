import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

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
  const saveTimeoutRef = useRef(null);
  const hasFetchedRef = useRef(false);

  const withPlaceholders = (list) => {
    if (!list) return [];
    if (list.length >= 30) return list;
    const start = list.length;
    const placeholders = Array.from({ length: 30 - start }, (_, i) => ({
      id: `temp-${start + i + 1}`,
      number: start + i + 1,
      name: ''
    }));
    return [...list, ...placeholders];
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

  const buildPayload = (list) =>
    list
      .filter((s) => s.name && s.name.trim() !== '')
      .map((s) => ({
        number: s.number,
        name: s.name.trim(),
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

  const handleNameChange = (rowId, newName) => {
    const next = students.map(student => {
      const sid = student.student_id ?? student.id;
      return sid === rowId ? { ...student, name: newName } : student;
    });
    setStudents(next);
    triggerAutoSave(next);
  };

  const addRow = () => {
    const newId = students.length > 0 ? Math.max(...students.map(s => s.number)) + 1 : 1;
    setStudents([...students, {
      id: `temp-${newId}`,
      number: newId,
      name: ''
    }]);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">학생명부</h1>
          <p className="mt-1 text-sm text-gray-500">학생 번호와 이름을 관리합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 min-w-[110px] text-right">{saveMessage}</span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${isSaving ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors`}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            className="text-primary-600 hover:text-primary-900 font-medium"
          >
            &larr; 홈으로 돌아가기
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
          <span className="text-sm text-gray-700 font-medium">학생 이름 입력 후 저장을 눌러주세요.</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  번호
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이름
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.student_id || student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={student.name}
                      onChange={(e) => handleNameChange(student.student_id ?? student.id, e.target.value)}
                      className="w-full border-0 focus:ring-2 focus:ring-primary-500 rounded-md px-3 py-2 text-sm"
                      placeholder="이름 입력"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">학생명부 관련 무엇이든 물어보세요.</h2>
          
          <form onSubmit={handlePromptSubmit}>
            <div className="mb-2">
              <label htmlFor="prompt" className="sr-only">Prompt</label>
              <div className="relative">
                <textarea
                  id="prompt"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pb-10"
                  rows={12}
                  placeholder="학생명부 관련 무엇이든 물어보세요."
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

export default StudentRecords;
