import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo-dashboard.png';


function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';

  const [isWorkGroupOpen, setIsWorkGroupOpen] = useState(true);
  const [isStudentGroupOpen, setIsStudentGroupOpen] = useState(true);
  const [isParentGroupOpen, setIsParentGroupOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  // Track sidebar clicks for quick access tabs (same format as Dashboard)
  const handleSidebarClick = (tabId) => {
    setIsSidebarOpen(false);
    const now = Date.now();
    const saved = localStorage.getItem('tabUsage');
    const usage = saved ? JSON.parse(saved) : {};
    const current = usage[tabId] || { count: 0, lastUsed: 0 };
    usage[tabId] = { count: current.count + 1, lastUsed: now };
    localStorage.setItem('tabUsage', JSON.stringify(usage));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navBase =
    'flex items-center px-4 py-2 text-[17px] font-medium rounded-md';
  const navChild = `${navBase} pl-9`;

  if (isLoginPage) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Hamburger Button */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-white shadow-md text-gray-600 hover:text-gray-900 focus:outline-none"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <span className="sr-only">Toggle sidebar</span>
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Desktop: invisible hover trigger zone on left edge */}
      <div
        className="hidden md:block fixed left-0 top-0 w-4 h-full z-40"
        onMouseEnter={() => setIsSidebarHovered(true)}
      />

      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r border-gray-200 fixed h-full z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarHovered ? 'md:translate-x-0' : 'md:-translate-x-full'}`}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
      >
        <div className="h-20 flex items-center px-4 border-b border-gray-200">
    <Link to="/dashboard" onClick={() => setIsSidebarOpen(false)} className="flex items-center cursor-pointer hover:opacity-80 transition-opacity w-full">
            <img
              src={logo}
              alt="Logo"
              className="w-14 h-14 flex-shrink-0"
            />
            <div className="ml-2 flex flex-col text-sm text-gray-600 font-medium flex-1">
              <span>업무를 더 쉽게,</span>
              <span className="text-right">교사를 더 자유롭게</span>
            </div>
            <span className="ml-2 text-xs font-semibold text-white bg-primary-500 px-2 py-1 rounded-full flex-shrink-0">홈</span>
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

      {/* Overlay when sidebar is hovered on desktop */}
      {isSidebarHovered && (
        <div 
          className="hidden md:block fixed inset-0 bg-black/20 z-40 transition-opacity"
          onMouseEnter={() => setIsSidebarHovered(false)}
        />
      )}

      <main className="flex-1 p-4 pt-20 md:p-8 md:pt-8 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
