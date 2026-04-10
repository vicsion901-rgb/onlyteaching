import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo-dashboard.png';
import { getTabsBySection } from '../config/tabRegistry';
import client from '../api/client';


function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';
  const isVerifyPage = location.pathname === '/teacher-verification';

  // 교사 인증 게이트 — 인증 안 됐으면 /teacher-verification 외 다른 탭 접근 차단
  const [verifyStatus, setVerifyStatus] = useState(null); // null=loading, 'VERIFIED', 'BLOCKED'
  useEffect(() => {
    if (isLoginPage) return;
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/login', { replace: true });
      return;
    }
    client
      .get('/teacher-verification/status', { params: { userId } })
      .then((res) => {
        const s = res.data?.verifyStatus;
        const expired =
          res.data?.expiresAt &&
          new Date(res.data.expiresAt).getTime() < Date.now();
        if (s === 'VERIFIED' && !expired) {
          setVerifyStatus('VERIFIED');
        } else {
          setVerifyStatus('BLOCKED');
          if (!isVerifyPage) navigate('/teacher-verification', { replace: true });
        }
      })
      .catch(() => {
        setVerifyStatus('BLOCKED');
        if (!isVerifyPage) navigate('/teacher-verification', { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const [isMotivationOpen, setIsMotivationOpen] = useState(false);
  const [isWorkTimeOpen, setIsWorkTimeOpen] = useState(false);
  const [isBreakTimeOpen, setIsBreakTimeOpen] = useState(false);
  const [isToolOpen, setIsToolOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isStudentOpen, setIsStudentOpen] = useState(false);

  // Mobile overlay sidebar
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Desktop: pinned (in-flow, pushes content) vs hover (floating overlay)
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleSidebarClick = (tabId, e) => {
    // 교사 인증 전에는 다른 탭 접근 차단
    if (verifyStatus !== 'VERIFIED' && tabId !== 'teacher-verification') {
      if (e) e.preventDefault();
      alert('교사 인증이 필요합니다. 먼저 교사 인증을 완료해주세요.');
      navigate('/teacher-verification');
      return;
    }
    setIsMobileOpen(false);
    if (!isPinned) setIsHovered(false);
    const now = Date.now();
    const saved = localStorage.getItem('tabUsage');
    const usage = saved ? JSON.parse(saved) : {};
    const current = usage[tabId] || { count: 0, lastUsed: 0 };
    usage[tabId] = { count: current.count + 1, lastUsed: now };
    localStorage.setItem('tabUsage', JSON.stringify(usage));
  };


  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('schoolCode');
    localStorage.removeItem('loginMessage');
    localStorage.removeItem('token');
    localStorage.removeItem('onlyteaching:session');
    navigate('/login');
  };

  const navBase =
    'flex items-center px-4 py-2 text-[17px] font-medium rounded-md';
  const navChild = `${navBase} pl-9`;
  const navSectionButton = 'flex items-center w-full px-4 pt-2 text-sm font-semibold text-gray-500 text-left';
  const motivationTabs = getTabsBySection('motivation');
  const adminTabs = getTabsBySection('admin');
  const studentTabs = getTabsBySection('student');
  const breakTabs = getTabsBySection('break');

  // Shared sidebar content
  const sidebarHeader = (onLogoClick) => (
    <div className="h-20 flex items-center pl-14 pr-3 border-b border-gray-200">
      <Link to="/dashboard" onClick={onLogoClick} className="flex w-full items-center gap-2 cursor-pointer transition-opacity hover:opacity-80">
        <img src={logo} alt="Logo" className="w-12 h-12 flex-shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col text-sm font-medium leading-tight text-gray-600">
          <span className="whitespace-nowrap">업무를 더 쉽게,</span>
          <span className="whitespace-nowrap text-right">교사를 더 자유롭게</span>
        </div>
        <span className="flex-shrink-0 rounded-full bg-primary-500 px-2 py-1 text-xs font-semibold text-white">홈</span>
      </Link>
    </div>
  );

  const sidebarNav = (
    <nav className="px-4 pt-5 pb-6 space-y-6 flex-1 overflow-y-auto">
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsMotivationOpen(!isMotivationOpen)}
          className={`${navBase} group text-[18px] w-full justify-start gap-3 ${
            isMotivationOpen ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-3xl leading-none">{isMotivationOpen ? '▾' : '▸'}</span>
          <span
            className={`whitespace-nowrap text-[18px] font-semibold tracking-[0.01em] ${
              isMotivationOpen ? 'text-primary-800' : 'text-gray-800 group-hover:text-gray-900'
            }`}
          >
            동기 유발
          </span>
        </button>
        {isMotivationOpen && (
          <div className="space-y-1">
            {motivationTabs.map((tab) => (
              <Link
                key={tab.id}
                to={tab.route}
                onClick={() => handleSidebarClick(tab.id)}
                className={`${navChild} ${location.pathname === tab.route ? 'bg-primary-50 text-primary-700' : 'text-gray-900 hover:bg-gray-50'}`}
              >
                <span className="mr-2">{tab.emoji}</span>{tab.title}
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsWorkTimeOpen(!isWorkTimeOpen)}
          className={`${navBase} group text-[18px] w-full justify-start gap-3 ${
            isWorkTimeOpen ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-3xl leading-none">{isWorkTimeOpen ? '▾' : '▸'}</span>
          <span
            className={`whitespace-nowrap text-[18px] font-semibold tracking-[0.01em] ${
              isWorkTimeOpen ? 'text-primary-800' : 'text-gray-800 group-hover:text-gray-900'
            }`}
          >
            업무 시간
          </span>
        </button>
        {isWorkTimeOpen && (
          <div className="space-y-3">
            <div className="space-y-1">
              <button type="button" onClick={() => setIsToolOpen(!isToolOpen)} className={navSectionButton}>
                <span className="mr-2 text-base leading-none">{isToolOpen ? '▾' : '▸'}</span>
                <span>수업 보조 도구</span>
              </button>
              {isToolOpen && (
                <>
                  <Link to="/presenter-picker" onClick={() => handleSidebarClick('presenter-picker')}
                    className={`${navChild} ${location.pathname === '/presenter-picker' ? 'bg-primary-50 text-primary-700' : 'text-gray-900 hover:bg-gray-50'}`}>
                    <span className="mr-2">🎤</span>발표자 정하기
                  </Link>
                  <Link to="/seat-arrangement" onClick={() => handleSidebarClick('seat-arrangement')}
                    className={`${navChild} ${location.pathname === '/seat-arrangement' ? 'bg-primary-50 text-primary-700' : 'text-gray-900 hover:bg-gray-50'}`}>
                    <span className="mr-2">🪑</span>자리 정하기
                  </Link>
                  <Link to="/role-assignment" onClick={() => handleSidebarClick('role-assignment')}
                    className={`${navChild} ${location.pathname === '/role-assignment' ? 'bg-primary-50 text-primary-700' : 'text-gray-900 hover:bg-gray-50'}`}>
                    <span className="mr-2">🎭</span>1인 1역 정하기
                  </Link>
                </>
              )}
            </div>
            <div className="space-y-1">
              <button type="button" onClick={() => setIsAdminOpen(!isAdminOpen)} className={navSectionButton}>
                <span className="mr-2 text-base leading-none">{isAdminOpen ? '▾' : '▸'}</span>
                <span>행정</span>
              </button>
              {isAdminOpen && (
                <>
                  {adminTabs.map((tab) => (
                    <Link key={tab.id} to={tab.route} onClick={() => handleSidebarClick(tab.id)}
                      className={`${navChild} ${location.pathname === tab.route ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <span className="mr-2">{tab.emoji}</span>{tab.title}
                    </Link>
                  ))}
                </>
              )}
            </div>
            <div className="space-y-1">
              <button type="button" onClick={() => setIsStudentOpen(!isStudentOpen)} className={navSectionButton}>
                <span className="mr-2 text-base leading-none">{isStudentOpen ? '▾' : '▸'}</span>
                <span>학생</span>
              </button>
              {isStudentOpen && (
                <>
                  <div className={`${navChild} text-gray-900`}>
                    <span className="mr-2">📻</span>라디오 사연 보내기
                  </div>
                  {studentTabs.map((tab) => (
                    <Link key={tab.id} to={tab.route} onClick={() => handleSidebarClick(tab.id)}
                      className={`${navChild} ${location.pathname === tab.route ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <span className="mr-2">{tab.emoji}</span>{tab.title}
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="mt-2 space-y-2 md:mt-4 lg:mt-6">
        <button
          type="button"
          onClick={() => setIsBreakTimeOpen(!isBreakTimeOpen)}
          className={`${navBase} group text-[18px] w-full justify-start gap-3 ${
            isBreakTimeOpen ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <span className="text-3xl leading-none">{isBreakTimeOpen ? '▾' : '▸'}</span>
          <span
            className={`whitespace-nowrap text-[18px] font-semibold tracking-[0.01em] ${
              isBreakTimeOpen ? 'text-primary-800' : 'text-gray-800 group-hover:text-gray-900'
            }`}
          >
            쉬는 시간
          </span>
        </button>
        {isBreakTimeOpen && (
          <div className="space-y-1">
            {breakTabs.map((tab) => (
              <Link key={tab.id} to={tab.route} onClick={() => handleSidebarClick(tab.id)}
                className={`${navChild} ${location.pathname === tab.route ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                <span className="mr-2">{tab.emoji}</span>{tab.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );

  const sidebarFooter = (
    <div className="w-full p-4 border-t border-gray-200 space-y-2">
      {verifyStatus === 'VERIFIED' ? (
        <div className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          ✅ 교사 인증 완료
        </div>
      ) : (
        <Link
          to="/teacher-verification"
          onClick={() => handleSidebarClick('teacher-verification')}
          className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            location.pathname === '/teacher-verification'
              ? 'bg-blue-100 text-blue-700'
              : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
          }`}
        >
          🎓 교사 인증
        </Link>
      )}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
      >
        로그아웃 (Logout)
      </button>
    </div>
  );

  if (isLoginPage) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ===== Desktop Hamburger (pin toggle) ===== */}
      <button
        type="button"
        className="hidden md:flex fixed top-4 left-4 z-[60] p-2 rounded-md bg-transparent text-gray-400 hover:text-gray-900 hover:bg-white/80 hover:shadow-md focus:outline-none transition-all duration-200"
        onClick={() => setIsPinned(!isPinned)}
        title={isPinned ? '사이드바 숨기기' : '사이드바 고정'}
      >
        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isPinned ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* ===== Mobile Hamburger ===== */}
      <button
        type="button"
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-white shadow-md text-gray-600 hover:text-gray-900 focus:outline-none"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <span className="sr-only">Toggle sidebar</span>
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* ===== Mobile Overlay ===== */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ===== Mobile Sidebar (fixed overlay) ===== */}
      <aside
        className={`md:hidden w-64 bg-white border-r border-gray-200 fixed h-full z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarHeader(() => setIsMobileOpen(false))}
        {sidebarNav}
        {sidebarFooter}
      </aside>

      {/* ===== Desktop: Hover trigger zone (only when NOT pinned and NOT hovered) ===== */}
      {!isPinned && !isHovered && (
        <div
          className="hidden md:block fixed left-0 top-0 w-4 h-full z-[55] cursor-pointer group"
          onMouseEnter={() => setIsHovered(true)}
        >
          <div className="absolute left-0 top-0 w-1 h-full bg-primary-400 opacity-0 group-hover:opacity-60 transition-opacity" />
        </div>
      )}

      {/* ===== Desktop: Floating sidebar (hover mode — overlay, no content shift) ===== */}
      {!isPinned && isHovered && (
        <>
          <aside
            className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed top-0 left-0 h-screen z-[55] shadow-2xl transition-transform duration-300 ease-in-out"
            onMouseLeave={() => setIsHovered(false)}
          >
            {sidebarHeader(null)}
            {sidebarNav}
            {sidebarFooter}
          </aside>
        </>
      )}

      {/* ===== Desktop: Pinned sidebar (in document flow, pushes content) ===== */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-gray-200 h-screen sticky top-0 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 ${
          isPinned ? 'w-64' : 'w-0'
        }`}
      >
        <div className="w-64 flex flex-col h-full flex-shrink-0">
          {sidebarHeader(null)}
          {sidebarNav}
          {sidebarFooter}
        </div>
      </aside>

      {/* ===== Main content ===== */}
      <main className="flex-1 min-w-0 p-2 sm:p-4 pt-16 md:p-8 md:pt-8 transition-all duration-300 overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full">
          {verifyStatus !== 'VERIFIED' && !isVerifyPage ? (
            <>{navigate('/teacher-verification', { replace: true }) && null}</>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

export default Layout;
