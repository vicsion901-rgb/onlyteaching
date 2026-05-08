import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const BOOK_TYPES = [
  { id: 'poem', emoji: '📜', label: '내 시집', desc: '내가 필사하고 쓴 시를 모은 시집' },
  { id: 'story', emoji: '📖', label: '내 이야기책', desc: '이어쓰기로 완성한 이야기 모음' },
  { id: 'essay', emoji: '✍️', label: '내 에세이집', desc: '일기, 감상문, 편지 모음' },
  { id: 'growth', emoji: '🌱', label: '내 성장 기록집', desc: '한 학기 동안의 성장 기록' },
];

function MyBook() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [bookType, setBookType] = useState(null);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookSubtitle, setBookSubtitle] = useState('');
  const [authorName, setAuthorName] = useState('');

  const collections = useMemo(() => JSON.parse(localStorage.getItem('creative_collections') || '[]'), []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📕 내 책 만들기</h1>
          <p className="mt-1 text-sm text-gray-500">내가 쓴 글을 한 권의 책으로 만들어보세요</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="text-primary-600 hover:text-primary-900 font-medium">← 홈으로</button>
      </div>

      {/* 단계 표시 */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        {['책 종류', '글 선택', '책 정보', '미리보기'].map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span>→</span>}
            <span className={`px-2 py-1 rounded-full ${step === i + 1 ? 'bg-purple-600 text-white font-semibold' : 'bg-gray-100'}`}>{s}</span>
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: 책 종류 */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          {BOOK_TYPES.map(bt => (
            <button key={bt.id} onClick={() => { setBookType(bt); setStep(2); }}
              className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition text-center">
              <span className="text-4xl">{bt.emoji}</span>
              <span className="text-base font-semibold text-gray-800">{bt.label}</span>
              <span className="text-xs text-gray-400">{bt.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: 글 선택 */}
      {step === 2 && (
        <div className="bg-white shadow rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">포함할 글 묶음을 선택하세요</h2>
          {collections.length > 0 ? (
            <div className="space-y-2">
              {collections.map((c, i) => (
                <label key={i} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${selectedCollection === i ? 'border-purple-400 bg-purple-50' : 'border-gray-100'}`}>
                  <input type="radio" name="collection" checked={selectedCollection === i} onChange={() => setSelectedCollection(i)} />
                  <div>
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.items?.length || 0}개 글</p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>아직 묶음이 없습니다</p>
              <button onClick={() => navigate('/creative-studio')} className="mt-2 text-purple-600 text-sm underline">편찬실에서 묶음 만들기</button>
            </div>
          )}
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="text-sm text-gray-400">← 이전</button>
            <button onClick={() => setStep(3)} disabled={selectedCollection === null} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg disabled:bg-gray-300">다음 →</button>
          </div>
        </div>
      )}

      {/* Step 3: 책 정보 */}
      {step === 3 && (
        <div className="bg-white shadow rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">책 정보를 입력하세요</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
            <input type="text" value={bookTitle} onChange={e => setBookTitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder={bookType?.label || '내 책'} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">부제 (선택)</label>
            <input type="text" value={bookSubtitle} onChange={e => setBookSubtitle(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="예: 2026년 봄, 나의 이야기" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">저자 이름</label>
            <input type="text" value={authorName} onChange={e => setAuthorName(e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" placeholder="내 이름" />
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="text-sm text-gray-400">← 이전</button>
            <button onClick={() => setStep(4)} className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg">미리보기 →</button>
          </div>
        </div>
      )}

      {/* Step 4: 미리보기 */}
      {step === 4 && (
        <div className="bg-white shadow rounded-xl p-6 space-y-6">
          <div className="text-center py-8 bg-amber-50 rounded-xl border-2 border-amber-200">
            <span className="text-5xl">{bookType?.emoji}</span>
            <h2 className="text-xl font-bold text-gray-900 mt-3">{bookTitle || bookType?.label}</h2>
            {bookSubtitle && <p className="text-sm text-gray-500 mt-1">{bookSubtitle}</p>}
            <p className="text-sm text-gray-600 mt-2">글쓴이: {authorName || '나'}</p>
            <p className="text-xs text-gray-400 mt-2">{selectedCollection !== null ? `${collections[selectedCollection]?.items?.length || 0}편 수록` : ''}</p>
          </div>

          {selectedCollection !== null && collections[selectedCollection]?.items && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">목차</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                {collections[selectedCollection].items.map((item, i) => (
                  <li key={i}>{item.title || `글 ${i + 1}`}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(3)} className="text-sm text-gray-400">← 이전</button>
            <button onClick={() => alert('PDF 생성 기능은 준비 중입니다!')} className="px-6 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700">📄 PDF 다운로드</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyBook;
