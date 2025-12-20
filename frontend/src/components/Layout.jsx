import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';


function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';

  const [isWorkGroupOpen, setIsWorkGroupOpen] = useState(true);
  const [isStudentGroupOpen, setIsStudentGroupOpen] = useState(true);
  const [isParentGroupOpen, setIsParentGroupOpen] = useState(true);



  // Track sidebar clicks for quick access tabs
  const handleSidebarClick = (tabId) => {
    const savedCounts = localStorage.getItem('tabClickCounts');
    const counts = savedCounts ? JSON.parse(savedCounts) : {};
    counts[tabId] = (counts[tabId] || 0) + 1;
    localStorage.setItem('tabClickCounts', JSON.stringify(counts));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navBase =
    'flex items-center px-4 py-2 text-[17px] font-medium rounded-md';
  const navChild = `${navBase} pl-9`;

  if (isLoginPage) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full z-10 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="flex flex-col leading-tight">
              <span className="font-bold" style={{ fontSize: '27px', color: '#7c3aed' }}>On1yTeaching</span>
              <span className="font-medium" style={{ fontSize: '15px', color: '#6b7280' }}>오직 가르치기만 하십시오.</span>
            </div>
            <span className="text-xs font-semibold text-white bg-primary-500 px-2 py-1 rounded-full">홈</span>
          </Link>
        </div>
        <nav className="p-4 space-y-[2.25rem] flex-1 overflow-y-auto pb-6">
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsWorkGroupOpen(!isWorkGroupOpen)}
              className={`${navBase} text-[18px] w-full justify-start gap-3 ${
                isWorkGroupOpen ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-3xl leading-none">{isWorkGroupOpen ? '▾' : '▸'}</span>
              <span className="flex items-center whitespace-nowrap">
                <span className="border-b-4 border-yellow-300 pb-0.5 mr-1">행정</span>
                <span>업무 도우미</span>
              </span>
            </button>
            {isWorkGroupOpen && (
              <div className="space-y-1">
                <Link
                  to="/schedule"
                  onClick={() => handleSidebarClick('schedule')}
                  className={`${navChild} ${
                    location.pathname === '/schedule'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">📅</span>
                  학사일정
                </Link>
                <Link
                  to="/student-records"
                  onClick={() => handleSidebarClick('student-records')}
                  className={`${navChild} ${
                    location.pathname === '/student-records'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">👥</span>
                  학생명부
                </Link>
                <Link
                  to="/neis"
                  onClick={() => handleSidebarClick('neis')}
                  className={`${navChild} ${
                    location.pathname === '/neis'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">💼</span>
                  NEIS 업무
                </Link>

                <Link
                  to="/life-records"
                  onClick={() => handleSidebarClick('life-records')}
                  className={`${navChild} ${
                    location.pathname === '/life-records'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">📝</span>
                  생활기록부
                </Link>
                <Link
                  to="/subject-evaluation"
                  onClick={() => handleSidebarClick('subject-evaluation')}
                  className={`${navChild} ${
                    location.pathname === '/subject-evaluation'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">📊</span>
                  교과평가
                </Link>
                <Link
                  to="/creative-activities"
                  onClick={() => handleSidebarClick('creative-activities')}
                  className={`${navChild} ${
                    location.pathname === '/creative-activities'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">🎨</span>
                  창의적 체험활동
                </Link>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsStudentGroupOpen(!isStudentGroupOpen)}
              className={`${navBase} text-[18px] w-full justify-start gap-3 ${
                isStudentGroupOpen ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-3xl leading-none">{isStudentGroupOpen ? '▾' : '▸'}</span>
              <span className="flex items-center whitespace-nowrap">
                <span className="border-b-4 border-blue-300 pb-0.5 mr-1">학생</span>
                <span>생활 업무 도우미</span>
              </span>
            </button>
            {isStudentGroupOpen && (
              <div className="space-y-1">

                <Link
                  to="/counseling"
                  onClick={() => handleSidebarClick('counseling')}
                  className={`${navChild} ${
                    location.pathname === '/counseling'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">🗨️</span>
                  상담기록 작성/정리
                </Link>
                <Link
                  to="/exam-grading"
                  onClick={() => handleSidebarClick('exam-grading')}
                  className={`${navChild} ${
                    location.pathname === '/exam-grading'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">✏️</span>
                  시험지 채점
                </Link>

              </div>
            )}
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsParentGroupOpen(!isParentGroupOpen)}
              className={`${navBase} text-[18px] w-full justify-start gap-3 ${
                isParentGroupOpen ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-3xl leading-none">{isParentGroupOpen ? '▾' : '▸'}</span>
              <span className="flex items-center whitespace-nowrap">
                <span className="border-b-4 border-amber-700 pb-0.5 mr-1">학부모</span>
                <span>관련 업무 도우미</span>
              </span>
            </button>
            {isParentGroupOpen && (
              <div className="space-y-1">
                <Link
                  to="/newsletter"
                  onClick={() => handleSidebarClick('newsletter')}
                  className={`${navChild} ${
                    location.pathname === '/newsletter'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">📋</span>
                  가정통신문
                </Link>
                <Link
                  to="/absence-report"
                  onClick={() => handleSidebarClick('absence-report')}
                  className={`${navChild} ${
                    location.pathname === '/absence-report'
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">📄</span>
                  결석신고서
                </Link>
              </div>
            )}
          </div>
        </nav>
        <div className="w-full p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
          >
            로그아웃 (Logout)
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
