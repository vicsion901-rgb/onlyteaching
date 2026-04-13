import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { hashPassword } from '../api/hash';

function AccountSettings() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId') || '';

  const [info, setInfo] = useState({ email: '', name: '', phone: '', schoolName: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // 비밀번호 변경
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // 이름 변경
  const [newName, setNewName] = useState('');

  // 전화번호 변경
  const [newPhone, setNewPhone] = useState('');

  // 회원 탈퇴
  const [deletePw, setDeletePw] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const formatPhone = (raw) => {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length < 4) return digits;
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  useEffect(() => {
    if (!userId) { navigate('/login'); return; }
    client.get('/api/account', { params: { userId } })
      .then(res => {
        setInfo(res.data);
        setNewName(res.data.name);
        setNewPhone(res.data.phone);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const showMsg = (msg) => { setMessage(msg); setError(''); setTimeout(() => setMessage(''), 3000); };
  const showErr = (msg) => { setError(msg); setMessage(''); };

  const handleChangePw = async (e) => {
    e.preventDefault();
    setError('');
    if (newPw.length < 9 || !/[a-zA-Z]/.test(newPw) || !/[0-9]/.test(newPw) || !/[^a-zA-Z0-9]/.test(newPw)) {
      return showErr('비밀번호는 9자 이상이며, 영문·숫자·특수문자를 모두 포함해야 합니다.');
    }
    if (newPw !== confirmPw) return showErr('새 비밀번호가 일치하지 않습니다.');
    try {
      const hashedCurrent = await hashPassword(currentPw);
      const hashedNew = await hashPassword(newPw);
      const res = await client.post('/api/account', { userId, action: 'changePassword', currentPassword: hashedCurrent, newPassword: hashedNew, hashed: true });
      showMsg(res.data.message);
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      showErr(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const handleChangeName = async (e) => {
    e.preventDefault();
    setError('');
    if (!newName || newName.trim().length < 2) return showErr('이름을 2자 이상 입력해주세요.');
    try {
      const res = await client.post('/api/account', { userId, action: 'changeName', name: newName.trim() });
      showMsg(res.data.message);
      setInfo(prev => ({ ...prev, name: newName.trim() }));
    } catch (err) {
      showErr(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const handleChangePhone = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPhone || !/^01[016789]-?\d{3,4}-?\d{4}$/.test(newPhone.replace(/\s/g, ''))) {
      return showErr('올바른 전화번호를 입력해주세요.');
    }
    try {
      const res = await client.post('/api/account', { userId, action: 'changePhone', phone: newPhone });
      showMsg(res.data.message);
      setInfo(prev => ({ ...prev, phone: newPhone }));
    } catch (err) {
      showErr(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setError('');
    if (!deletePw) return showErr('비밀번호를 입력해주세요.');
    if (!window.confirm('정말 탈퇴하시겠습니까? 모든 데이터가 즉시 삭제됩니다.')) return;
    try {
      const hashedDeletePw = await hashPassword(deletePw);
      await client.delete('/api/account', { data: { userId, password: hashedDeletePw, hashed: true } });
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      showErr(err.response?.data?.message || '오류가 발생했습니다.');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">불러오는 중...</div>;

  return (
    <div className="max-w-2xl mx-auto py-6 px-3 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">계정 관리</h1>
        <button onClick={() => navigate('/dashboard')} className="text-sm text-gray-500 hover:text-gray-800">← 대시보드</button>
      </div>

      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-sm">{message}</div>}
      {error && <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 text-sm">{error}</div>}

      {/* 현재 정보 */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">내 정보</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500">이메일 (로그인 ID)</dt>
          <dd className="text-gray-900">{info.email}</dd>
          <dt className="text-gray-500">이름</dt>
          <dd className="text-gray-900">{info.name || '-'}</dd>
          <dt className="text-gray-500">전화번호</dt>
          <dd className="text-gray-900">{info.phone || '-'}</dd>
          <dt className="text-gray-500">학교</dt>
          <dd className="text-gray-900">{info.schoolName || '-'}</dd>
        </dl>
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">비밀번호 변경</h2>
        <form onSubmit={handleChangePw} className="space-y-3">
          <input type="password" placeholder="현재 비밀번호" value={currentPw} onChange={e => setCurrentPw(e.target.value)} required
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <input type="password" placeholder="새 비밀번호 (9자 이상, 영문+숫자+특수문자)" value={newPw} onChange={e => setNewPw(e.target.value)} required minLength={9}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <input type="password" placeholder="새 비밀번호 확인" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required minLength={9}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm">변경</button>
        </form>
      </div>

      {/* 이름 변경 */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">이름 변경</h2>
        <form onSubmit={handleChangeName} className="flex gap-3">
          <input type="text" placeholder="새 이름" value={newName} onChange={e => setNewName(e.target.value)} required minLength={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm">변경</button>
        </form>
      </div>

      {/* 전화번호 변경 */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">전화번호 변경</h2>
        <form onSubmit={handleChangePhone} className="flex gap-3">
          <input type="tel" placeholder="010-0000-0000" value={newPhone} onChange={e => setNewPhone(formatPhone(e.target.value))} required maxLength={13}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm">변경</button>
        </form>
      </div>

      {/* 회원 탈퇴 */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <button type="button" onClick={() => setShowDelete(!showDelete)}
          className="text-sm text-red-500 hover:text-red-700">
          {showDelete ? '취소' : '회원 탈퇴'}
        </button>
        {showDelete && (
          <form onSubmit={handleDelete} className="mt-3 space-y-3">
            <p className="text-xs text-red-500">탈퇴 시 모든 개인정보가 즉시 삭제되며 복구할 수 없습니다.</p>
            <input type="password" placeholder="비밀번호 입력" value={deletePw} onChange={e => setDeletePw(e.target.value)} required
              className="w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-sm">탈퇴하기</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default AccountSettings;
