import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';


function LifeRecords() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');
  const [hoveredKeywordId, setHoveredKeywordId] = useState(null);
  const [suggestionsByKeyword, setSuggestionsByKeyword] = useState({});
  const [suggestionLoading, setSuggestionLoading] = useState({});
  
  // Keyword Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [studentName, setStudentName] = useState('');
  
  // Student List State
  const [students, setStudents] = useState([]);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await client.get('/api/students', { params: { userId: localStorage.getItem('userId') || '' } });
        setStudents(res.data || []);
      } catch (error) {
        console.error("Failed to fetch students", error);
      }
    };
    fetchStudents();
  }, []);

  // Handle keyword search
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    
    try {
      const res = await client.get(`/api/liferecords?action=keywords&query=${query}`);
      setSearchResults(res.data);
    } catch (error) {
      console.error("Failed to search keywords", error);
    }
  };

  const fetchKeywordSuggestions = async (keywordObj) => {
    if (!keywordObj?.keyword_id) return;
    const key = keywordObj.keyword_id;
    if (suggestionsByKeyword[key] || suggestionLoading[key]) return;
    setSuggestionLoading((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await client.get(`/api/liferecords?action=comments&keyword=${encodeURIComponent(keywordObj.keyword)}`);
      setSuggestionsByKeyword((prev) => ({ ...prev, [key]: res.data || [] }));
    } catch (error) {
      console.error("Failed to load suggestions", error);
    } finally {
      setSuggestionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleUseSuggestion = async (suggestion) => {
    if (!suggestion) return;
    setPrompt((prev) => prev ? `${prev}\n${suggestion.content}` : suggestion.content);
    try {
      const res = await client.post(`/api/liferecords?action=use&commentId=${suggestion.comment_id}`);
      // Update local cache with new usage_count
      setSuggestionsByKeyword((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((k) => {
          updated[k] = updated[k].map((item) =>
            item.comment_id === res.data.comment_id ? res.data : item
          );
        });
        return updated;
      });
    } catch (error) {
      console.error("Failed to update usage count", error);
    }
  };

  // Add keyword to selection
  const addKeyword = (keyword) => {
    if (!selectedKeywords.find(k => k.keyword_id === keyword.keyword_id)) {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  // Remove keyword from selection
  const removeKeyword = (keywordId) => {
    setSelectedKeywords(selectedKeywords.filter(k => k.keyword_id !== keywordId));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    const keywordTexts = selectedKeywords.map((k) => k.keyword);
    const typedKeyword = searchQuery.trim();
    const additionalContext = prompt.trim();
    const studentNameText = studentName.trim();

    if (keywordTexts.length === 0 && typedKeyword) {
      keywordTexts.push(typedKeyword);
    }

    if (keywordTexts.length === 0 && !additionalContext) {
      alert("키워드를 선택하거나 내용을 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      if (keywordTexts.length > 0 || studentNameText) {
        const res = await client.post('/api/liferecords?action=generate', {
          selected_keywords: keywordTexts,
          student_name: studentNameText,
          additional_context: additionalContext,
          ai_model: selectedModel
        });
        setResponse(res.data.generated_text);
        setUsedModel(res.data.ai_model);
      } else {
        const res = await client.post('/api/prompts', { 
          content: additionalContext,
          ai_model: selectedModel 
        });
        setResponse(res.data.generated_document);
        setUsedModel(res.data.ai_model);
      }
    } catch (error) {
      console.error("Failed to generate", error);
      setResponse("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderResponse = () => {
    if (!response) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <svg className="h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <p>키워드를 선택하고 생성하기 버튼을 눌러주세요.</p>
        </div>
      );
    }

    const lines = response.split('\n').map((l) => l.trim()).filter(Boolean);
    const bulletLines = lines.filter((l) => l.startsWith('- '));
    const otherLines = lines.filter((l) => !l.startsWith('- '));
    const combinedParagraph = bulletLines.map((l) => l.replace(/^- /, '')).join(' ');

    return (
      <div className="space-y-3">
        {otherLines.map((line, idx) => (
          <p key={`other-${idx}`} className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {line}
          </p>
        ))}

        {bulletLines.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900">추천 문장 예시:</div>
            <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
              {bulletLines.map((line, idx) => (
                <li key={`bullet-${idx}`}>{line.replace(/^- /, '')}</li>
              ))}
            </ul>
            <div className="pt-2">
              <div className="text-xs font-semibold text-gray-900 mb-1">종합 문단</div>
              <p className="text-sm text-gray-800 leading-relaxed bg-white border border-gray-200 rounded-md p-3">
                {combinedParagraph}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📝 생활기록부</h1>
          <p className="mt-1 text-sm text-gray-500">키워드를 기반으로 생활기록부를 자동으로 생성합니다</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium"
        >
          &larr; 홈으로
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input and Search */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">입력 설정</h2>
            
            <div className="space-y-4">
              {/* Student Name */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">학생 이름</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    setShowStudentDropdown(true);
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                  placeholder="학생 이름을 검색하거나 선택하세요"
                />
                {showStudentDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white shadow-xl max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-gray-200">
                    {students
                      .filter(s => s.name && s.name.includes(studentName))
                      .map((student) => (
                      <div
                        key={student.student_id || student.id}
                        onMouseDown={() => {
                          setStudentName(student.name);
                          setShowStudentDropdown(false);
                        }}
                        className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 transition-colors duration-150"
                      >
                        <span className="font-medium text-gray-900">{student.number}번 {student.name}</span>
                      </div>
                    ))}
                    {students.filter(s => s.name && s.name.includes(studentName)).length === 0 && (
                      <div className="py-2 pl-3 text-gray-500 text-sm">검색 결과가 없습니다</div>
                    )}
                  </div>
                )}
              </div>

              {/* Keyword Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">키워드 검색</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                  placeholder="예: 성실, 창의력, 협력..."
                />
                
                {/* Search Results Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute z-[100] mt-1 w-full bg-white shadow-xl max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-gray-200">
                    {searchResults.map((result) => (
                      <button
                        key={result.keyword_id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault(); // Prevent input blur
                          addKeyword(result);
                        }}
                        onMouseEnter={() => {
                          setHoveredKeywordId(result.keyword_id);
                          fetchKeywordSuggestions(result);
                        }}
                        onMouseLeave={() => setHoveredKeywordId(null)}
                        className="w-full text-left cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 flex justify-between items-center transition-colors duration-150 focus:bg-blue-50 focus:outline-none"
                      >
                        <span className="font-medium text-gray-900">{result.keyword}</span>
                        <span className="text-blue-600 text-xs font-semibold bg-blue-100 rounded-full px-2 py-0.5">{result.category}</span>

                        {hoveredKeywordId === result.keyword_id && (
                          <div className="absolute left-0 top-full mt-1 w-full bg-white shadow-2xl border border-gray-200 rounded-md z-[120] max-h-64 overflow-auto p-2 space-y-2">
                            {suggestionLoading[result.keyword_id] && (
                              <div className="text-xs text-gray-500 px-2 py-1">불러오는 중...</div>
                            )}
                            {!suggestionLoading[result.keyword_id] && (suggestionsByKeyword[result.keyword_id]?.length || 0) === 0 && (
                              <div className="text-xs text-gray-400 px-2 py-1">관련 문장이 없습니다.</div>
                            )}
                            {!suggestionLoading[result.keyword_id] && (suggestionsByKeyword[result.keyword_id] || []).map((s) => (
                              <button
                                key={s.comment_id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleUseSuggestion(s);
                                }}
                                className="w-full text-left text-xs bg-gray-50 hover:bg-blue-50 border border-gray-100 rounded p-2 flex justify-between items-center gap-2"
                              >
                                <span className="text-gray-800 leading-snug">{s.content}</span>
                                <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${ (s.usage_count || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                  +{s.usage_count || 0}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">선택된 키워드</label>
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-gray-200 rounded-md bg-gray-50">
                  {selectedKeywords.length === 0 && (
                    <span className="text-gray-400 text-sm">키워드를 검색하여 추가해주세요.</span>
                  )}
                  {selectedKeywords.map((kw) => (
                    <span 
                      key={kw.keyword_id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {kw.keyword}
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw.keyword_id)}
                        className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500 focus:outline-none"
                      >
                        <span className="sr-only">Remove</span>
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Additional Context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">추가 요청사항</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                  placeholder="추가적으로 반영하고 싶은 내용을 입력하세요."
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleGenerate(e);
                    }
                  }}
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isLoading ? 'bg-gray-400' : 'bg-white hover:bg-gray-50 border-gray-300'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400`}
                >
                  {isLoading ? '생성 중...' : '생활기록부 생성하기 (Ctrl + Enter)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Result */}
        <div className="bg-white shadow rounded-lg p-6 flex flex-col">
          <h2 className="text-lg font-medium text-gray-900 mb-4">생성 결과</h2>
          
          <div className="flex-1 bg-gray-50 rounded-md border border-gray-200 p-4 min-h-[400px]">
            <div className="flex justify-end mb-2">
              {usedModel && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  OnlyTeaching DB
                </span>
              )}
            </div>
            {renderResponse()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LifeRecords;
