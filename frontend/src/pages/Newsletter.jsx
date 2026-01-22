import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

function Newsletter() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedModel] = useState('claude-3-5-sonnet-20241022');
  const [usedModel, setUsedModel] = useState('');

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
          <h1 className="text-3xl font-bold text-gray-900">📋 가정통신문</h1>
          <p className="mt-1 text-sm text-gray-500">가정통신문, 안내문, 학급 소식지를 작성합니다</p>
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-900 font-medium"
        >
          &larr; 업무도우미로 돌아가기
        </button>
      </div>

      {/* AI Prompt Section */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium leading-6 text-gray-900 mb-4">가정통신문 관련 무엇이든 물어보세요.</h2>
          
          <form onSubmit={handlePromptSubmit}>
            <div className="mb-2">
              <label htmlFor="prompt" className="sr-only">Prompt</label>
              <div className="relative">
                <textarea
                  id="prompt"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md p-3 pb-10"
                  rows={12}
                  placeholder="가정통신문 관련 무엇이든 물어보세요."
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

export default Newsletter;
