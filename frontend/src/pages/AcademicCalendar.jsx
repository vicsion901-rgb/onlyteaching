import { useState } from "react";
import { motion } from "framer-motion";

/**
 * OnlyTeaching 초등 학사일정 (2026)
 * - 날짜 선택
 * - 학년별 필수 행사 추가
 */

/* 🔑 ESLint 규칙 대응: 대문자 변수로 감싸기 */
const Motion = motion;

// 학년별 필수 행사 DB
const GRADE_EVENTS = {
  "1": ["입학식", "기초학력 진단", "현장체험학습"],
  "2": ["수행평가", "독서행사", "현장체험학습"],
  "3": ["수행평가", "과학체험", "안전교육"],
  "4": ["공개수업", "진로체험", "현장체험학습"],
  "5": ["수련회", "성교육", "수행평가"],
  "6": ["수학여행", "졸업식", "진로교육"],
};

export default function ElementaryCalendar2026() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedGrade, setSelectedGrade] = useState("1");
  const [calendarEvents, setCalendarEvents] = useState({});

  const makeDateKey = (day) => `2026-01-${String(day).padStart(2, "0")}`;

  // 날짜 클릭
  const handleDateClick = (dateKey) => {
    setSelectedDate(dateKey);
  };

  // 행사 추가
  const addEventToCalendar = (event) => {
    if (!selectedDate) return;

    setCalendarEvents((prev) => ({
      ...prev,
      [selectedDate]: [...(prev[selectedDate] || []), event],
    }));
  };

  return (
    <Motion.div
      className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* 달력 영역 */}
      <div className="lg:col-span-2 bg-white border rounded-xl shadow-sm">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-3">2026년 1월 학사일정</h2>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const dateKey = makeDateKey(day);
              const isSelected = selectedDate === dateKey;
              const events = calendarEvents[dateKey] || [];

              return (
                <Motion.div
                  key={day}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleDateClick(dateKey)}
                  className={`border rounded-lg p-2 cursor-pointer transition ${
                    isSelected
                      ? "bg-blue-50 border-blue-500"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="font-semibold">{day}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {events.join(", ")}
                  </div>
                </Motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 사이드 패널 */}
      <div className="flex flex-col gap-4">
        {/* 학년별 행사 */}
        <div className="bg-white border rounded-xl shadow-sm">
          <div className="p-4 space-y-3">
            <h3 className="font-bold">학년별 필수 행사</h3>

            <select
              className="border rounded p-2 w-full"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              {["1", "2", "3", "4", "5", "6"].map((g) => (
                <option key={g} value={g}>
                  초등 {g}학년
                </option>
              ))}
            </select>

            <div className="flex flex-wrap gap-2">
              {GRADE_EVENTS[selectedGrade].map((event) => (
                <button
                  key={event}
                  className={`px-3 py-1 text-sm rounded border ${
                    selectedDate
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  onClick={() => addEventToCalendar(event)}
                  disabled={!selectedDate}
                >
                  {event}
                </button>
              ))}
            </div>

            {!selectedDate && (
              <p className="text-xs text-red-500">
                📌 날짜를 먼저 선택하세요
              </p>
            )}
          </div>
        </div>

        {/* 파일 업로드 기능 제거 (OCR/이미지 업로드 제거 정책) */}
      </div>
    </Motion.div>
  );
}