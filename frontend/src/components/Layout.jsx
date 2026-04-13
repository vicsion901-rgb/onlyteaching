import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/logo-dashboard.png';
import { getTabsBySection } from '../config/tabRegistry';
import client from '../api/client';


function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoginPage = location.pathname === '/login';
  const isResetPage = location.pathname === '/reset-password';
  const isPolicyPage = ['/terms', '/privacy', '/policy'].includes(location.pathname);
  const isVerifyPage = location.pathname === '/teacher-verification';

  // 교사 인증 게이트 — 인증 안 됐으면 /teacher-verification 외 다른 탭 접근 차단
  const [verifyStatus, setVerifyStatus] = useState(null); // null=loading, 'VERIFIED', 'BLOCKED'
  useEffect(() => {
    if (isLoginPage || isResetPage || isPolicyPage) return;
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
    // 교사 인증 전에는 다른 탭 접근 차단 — 조용히 교사인증 페이지로 이동
    if (verifyStatus !== 'VERIFIED' && tabId !== 'teacher-verification') {
      if (e) e.preventDefault();
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

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem('schoolCode') || '' : '';

  const sidebarFooter = (
    <div className="w-full px-4 pt-3 pb-2 border-t border-gray-200" />
  );

  const profileDropdown = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsProfileOpen(!isProfileOpen)}
        className="w-9 h-9 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold hover:bg-purple-700 transition focus:outline-none focus:ring-2 focus:ring-purple-400"
      >
        {userEmail ? userEmail[0].toUpperCase() : 'U'}
      </button>
      {isProfileOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 py-2">
            {/* 이메일 */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900 truncate">{userEmail}</p>
              {verifyStatus === 'VERIFIED' && (
                <p className="text-xs text-emerald-600 mt-0.5">✅ 교사 인증 완료</p>
              )}
            </div>
            {/* 메뉴 항목 */}
            <Link
              to="/teacher-verification"
              onClick={() => { setIsProfileOpen(false); handleSidebarClick('teacher-verification'); }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              🎓 교사 인증
            </Link>
            <Link
              to="/dashboard"
              onClick={() => setIsProfileOpen(false)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              🏠 대시보드
            </Link>
            {/* 로그아웃 */}
            <div className="border-t border-gray-100 mt-1">
              <button
                onClick={() => { setIsProfileOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              >
                🚪 로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (isLoginPage || isResetPage) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pb-12">{children}</div>
        <footer className="fixed bottom-0 left-0 w-full py-1.5 px-3 sm:px-6 z-[50]" style={{ backgroundColor: 'rgba(124, 58, 237, 0.4)' }}>
          <div className="flex flex-row items-center justify-between gap-1 max-w-7xl mx-auto">
            <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-sm whitespace-nowrap">
              <Link to="/terms" className="text-purple-900 hover:text-purple-600 transition">이용약관</Link>
              <span className="text-purple-400">|</span>
              <Link to="/privacy" className="text-purple-900 hover:text-purple-600 transition font-semibold">개인정보처리방침</Link>
              <span className="text-purple-400">|</span>
              <Link to="/policy" className="text-purple-900 hover:text-purple-600 transition">운영정책</Link>
            </div>
            <span className="hidden sm:inline text-xs text-white/80">© 2026 OnlyTeaching</span>
            <div className="flex items-center gap-2 sm:gap-4">
              <a href="https://www.instagram.com/orti.t_/" target="_blank" rel="noopener noreferrer" className="text-purple-800 hover:text-purple-600 transition" aria-label="Instagram">
                <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="#" className="text-purple-800 hover:text-purple-600 transition" aria-label="X">
                <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="#" className="text-purple-800 hover:text-purple-600 transition" aria-label="Threads">
                <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.042 1.259-1.233 1.878-2.786 1.9-4.753-.025-2.4-.9-4.265-2.6-5.556-1.477-1.12-3.376-1.714-5.474-1.745a9.584 9.584 0 00-.614.003c-1.36.058-2.54.427-3.507 1.095-1.122.775-1.8 1.883-1.91 3.117-.088 1.003.198 1.96.805 2.692.577.696 1.457 1.15 2.477 1.279.95.12 1.885.006 2.693-.33a3.58 3.58 0 001.676-1.397c.336-.556.498-1.199.468-1.858a2.937 2.937 0 00-.842-1.912c-.554-.548-1.286-.838-2.117-.838-.377 0-.748.064-1.103.19l-.672-1.888c.55-.196 1.13-.3 1.725-.31h.094c1.378.013 2.614.507 3.48 1.392.87.89 1.348 2.09 1.384 3.473.046 1.064-.2 2.078-.71 2.94a5.61 5.61 0 01-2.69 2.197c-1.142.474-2.432.659-3.75.538-1.59-.163-2.97-.83-3.884-1.882-.917-1.052-1.37-2.442-1.274-3.908.15-1.77 1.073-3.29 2.597-4.343 1.265-.874 2.79-1.36 4.536-1.446a11.66 11.66 0 01.756-.004c2.488.038 4.736.756 6.503 2.098 1.998 1.516 3.083 3.78 3.116 6.535-.028 2.467-.824 4.473-2.37 5.964C18.02 23.2 15.862 23.972 12.186 24z"/></svg>
              </a>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (isPolicyPage) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="bg-purple-800 text-white py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
              <Link to="/terms" className="hover:text-purple-200 transition">이용약관</Link>
              <span className="text-purple-400">|</span>
              <Link to="/privacy" className="hover:text-purple-200 transition font-semibold">개인정보처리방침</Link>
              <span className="text-purple-400">|</span>
              <Link to="/policy" className="hover:text-purple-200 transition">운영정책</Link>
            </div>
            <div className="text-center mt-4">
              <p className="text-sm text-purple-200">ONLY TEACHING — 오직 가르치기만 하십시오</p>
              <p className="text-xs text-purple-400 mt-1">© 2026 OnlyTeaching. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
    <div className="flex">

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

      {/* ===== Profile Button (top-right) ===== */}
      <div className="fixed top-4 right-4 z-[60]">
        {profileDropdown}
      </div>

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
      <main className="flex-1 min-w-0 p-2 sm:p-4 pt-16 md:p-8 md:pt-8 pb-12 transition-all duration-300 overflow-x-hidden">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>

    {/* ===== Footer Bar (전체 너비, 사이드바 포함 꽉 채움) ===== */}
    <footer className="fixed bottom-0 left-0 w-full py-2 px-6 z-[50]" style={{ backgroundColor: 'rgba(124, 58, 237, 0.4)' }}>
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-1 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 text-sm">
          <Link to="/terms" className="text-purple-900 hover:text-purple-600 transition">이용약관</Link>
          <span className="text-purple-400">|</span>
          <Link to="/privacy" className="text-purple-900 hover:text-purple-600 transition font-semibold">개인정보처리방침</Link>
          <span className="text-purple-400">|</span>
          <Link to="/policy" className="text-purple-900 hover:text-purple-600 transition">운영정책</Link>
        </div>
        <span className="text-xs text-white/80">© 2026 OnlyTeaching</span>
        <div className="flex items-center gap-4">
          <a href="https://www.instagram.com/orti.t_/" target="_blank" rel="noopener noreferrer" className="text-purple-800 hover:text-purple-600 transition" aria-label="OnlyTeaching 인스타그램으로 이동">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          </a>
          <a href="#" className="text-purple-800 hover:text-purple-600 transition" aria-label="X">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          </a>
          <a href="#" className="text-purple-800 hover:text-purple-600 transition" aria-label="Threads">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.042 1.259-1.233 1.878-2.786 1.9-4.753-.025-2.4-.9-4.265-2.6-5.556-1.477-1.12-3.376-1.714-5.474-1.745a9.584 9.584 0 00-.614.003c-1.36.058-2.54.427-3.507 1.095-1.122.775-1.8 1.883-1.91 3.117-.088 1.003.198 1.96.805 2.692.577.696 1.457 1.15 2.477 1.279.95.12 1.885.006 2.693-.33a3.58 3.58 0 001.676-1.397c.336-.556.498-1.199.468-1.858a2.937 2.937 0 00-.842-1.912c-.554-.548-1.286-.838-2.117-.838-.377 0-.748.064-1.103.19l-.672-1.888c.55-.196 1.13-.3 1.725-.31h.094c1.378.013 2.614.507 3.48 1.392.87.89 1.348 2.09 1.384 3.473.046 1.064-.2 2.078-.71 2.94a5.61 5.61 0 01-2.69 2.197c-1.142.474-2.432.659-3.75.538-1.59-.163-2.97-.83-3.884-1.882-.917-1.052-1.37-2.442-1.274-3.908.15-1.77 1.073-3.29 2.597-4.343 1.265-.874 2.79-1.36 4.536-1.446a11.66 11.66 0 01.756-.004c2.488.038 4.736.756 6.503 2.098 1.998 1.516 3.083 3.78 3.116 6.535-.028 2.467-.824 4.473-2.37 5.964C18.02 23.2 15.862 23.972 12.186 24z"/></svg>
          </a>
        </div>
      </div>
    </footer>
    </div>
  );
}

export default Layout;
