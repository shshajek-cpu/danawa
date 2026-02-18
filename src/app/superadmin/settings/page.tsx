"use client";

import { useState, useEffect } from "react";

interface AdminSettings {
  viewCost: number;
  defaultPoints: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({
    viewCost: 500,
    defaultPoints: 5000,
  });
  const [password, setPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [stats, setStats] = useState({
    storageUsed: 0,
    totalQuotes: 0,
    totalChatRooms: 0,
    totalMessages: 0,
  });

  useEffect(() => {
    loadSettings();
    loadStats();
    loadPassword();
  }, []);

  function loadSettings() {
    const saved = localStorage.getItem("admin_settings");
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }

  function loadPassword() {
    const saved = localStorage.getItem("admin_password");
    setPassword(saved || "admin1234");
  }

  function loadStats() {
    // Calculate localStorage usage (approximate)
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || "";
        totalSize += key.length + value.length;
      }
    }
    const storageUsed = Math.round(totalSize / 1024); // KB

    // Count quotes
    const quotes = JSON.parse(localStorage.getItem("submitted_quotes") || "[]");
    const totalQuotes = quotes.length;

    // Count chat rooms
    const rooms = JSON.parse(localStorage.getItem("chat_rooms") || "[]");
    const totalChatRooms = rooms.length;

    // Count messages
    let totalMessages = 0;
    rooms.forEach((room: { id: string }) => {
      const messages = JSON.parse(localStorage.getItem(`chat_messages_${room.id}`) || "[]");
      totalMessages += messages.length;
    });

    setStats({
      storageUsed,
      totalQuotes,
      totalChatRooms,
      totalMessages,
    });
  }

  function saveSettings() {
    localStorage.setItem("admin_settings", JSON.stringify(settings));
    alert("설정이 저장되었습니다");
  }

  function clearQuoteData() {
    if (!confirm("모든 견적 데이터와 채팅 데이터를 삭제합니다.\n이 작업은 되돌릴 수 없습니다.\n계속하시겠습니까?")) {
      return;
    }

    // Clear quotes
    localStorage.removeItem("submitted_quotes");
    localStorage.removeItem("purchasedLeads");

    // Clear chat rooms and messages
    const rooms = JSON.parse(localStorage.getItem("chat_rooms") || "[]");
    const keysToRemove: string[] = [];
    rooms.forEach((room: { id: string }) => {
      localStorage.removeItem(`chat_messages_${room.id}`);

      // Collect chat_last_read_* keys for this room
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`chat_last_read_${room.id}`)) {
          keysToRemove.push(key);
        }
      }
    });
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.removeItem("chat_rooms");

    loadStats();
    alert("견적 데이터가 초기화되었습니다");
  }

  function clearPartnerData() {
    if (!confirm("모든 파트너 데이터를 삭제합니다.\n이 작업은 되돌릴 수 없습니다.\n계속하시겠습니까?")) {
      return;
    }

    // Clear partner data
    localStorage.removeItem("mockAgent");
    localStorage.removeItem("all_partners");

    // Clear point history
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("point_history_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    loadStats();
    alert("파트너 데이터가 초기화되었습니다");
  }

  function clearAllData() {
    if (!confirm("모든 데이터를 삭제합니다.\n관리자 설정과 비밀번호는 유지됩니다.\n이 작업은 되돌릴 수 없습니다.\n계속하시겠습니까?")) {
      return;
    }

    const adminPassword = localStorage.getItem("admin_password");
    const adminSettings = localStorage.getItem("admin_settings");
    const superadminAuth = localStorage.getItem("superadmin_auth");

    // Clear everything
    localStorage.clear();

    // Restore admin data
    if (adminPassword) localStorage.setItem("admin_password", adminPassword);
    if (adminSettings) localStorage.setItem("admin_settings", adminSettings);
    if (superadminAuth) localStorage.setItem("superadmin_auth", superadminAuth);

    loadStats();
    alert("모든 데이터가 초기화되었습니다");
  }

  function handlePasswordChange() {
    setPasswordError("");

    if (!newPassword || newPassword.length < 4) {
      setPasswordError("비밀번호는 최소 4자 이상이어야 합니다");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다");
      return;
    }

    localStorage.setItem("admin_password", newPassword);
    setPassword(newPassword);
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordForm(false);
    alert("비밀번호가 변경되었습니다");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">설정</h1>
        <p className="text-slate-600">시스템 설정 및 데이터 관리</p>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8 space-y-6">
        {/* Section 1: System Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-blue-600 text-2xl">
              settings
            </span>
            <h2 className="text-xl font-bold text-slate-900">시스템 설정</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                열람 비용 (포인트)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={settings.viewCost}
                  onChange={(e) =>
                    setSettings({ ...settings, viewCost: parseInt(e.target.value) || 0 })
                  }
                  className="flex-1 max-w-xs px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-slate-600 font-medium">P</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                파트너가 견적 1건을 열람할 때 차감되는 포인트
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                기본 지급 포인트
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={settings.defaultPoints}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultPoints: parseInt(e.target.value) || 0 })
                  }
                  className="flex-1 max-w-xs px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <span className="text-sm text-slate-600 font-medium">P</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                신규 파트너 가입 시 지급되는 포인트
              </p>
            </div>

            <button
              onClick={saveSettings}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              설정 저장
            </button>
          </div>
        </div>

        {/* Section 2: Data Management */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-orange-600 text-2xl">
              database
            </span>
            <h2 className="text-xl font-bold text-slate-900">데이터 관리</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-red-600 text-xl">
                  warning
                </span>
                <div>
                  <p className="text-sm font-medium text-red-900 mb-1">주의사항</p>
                  <p className="text-xs text-red-700">
                    데이터 초기화는 되돌릴 수 없습니다. 신중하게 진행하세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">견적 데이터 초기화</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    모든 견적 요청, 채팅방, 메시지를 삭제합니다
                  </p>
                </div>
                <button
                  onClick={clearQuoteData}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                >
                  초기화
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-slate-900">파트너 데이터 초기화</p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    모든 파트너 정보와 포인트 내역을 삭제합니다
                  </p>
                </div>
                <button
                  onClick={clearPartnerData}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                >
                  초기화
                </button>
              </div>

              <div className="flex items-center justify-between p-4 border border-red-300 rounded-lg bg-red-50">
                <div>
                  <p className="text-sm font-medium text-red-900">전체 초기화</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    모든 데이터를 삭제합니다 (관리자 설정 제외)
                  </p>
                </div>
                <button
                  onClick={clearAllData}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  전체 초기화
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Data Statistics */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-purple-600 text-2xl">
              analytics
            </span>
            <h2 className="text-xl font-bold text-slate-900">데이터 통계</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 mb-1">localStorage 사용량</p>
              <p className="text-2xl font-bold text-slate-900">{stats.storageUsed} KB</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600 mb-1">총 견적 수</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalQuotes}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-xs text-green-600 mb-1">총 채팅방 수</p>
              <p className="text-2xl font-bold text-green-900">{stats.totalChatRooms}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-600 mb-1">총 메시지 수</p>
              <p className="text-2xl font-bold text-purple-900">{stats.totalMessages}</p>
            </div>
          </div>
        </div>

        {/* Section 4: Admin Account */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-slate-600 text-2xl">
              admin_panel_settings
            </span>
            <h2 className="text-xl font-bold text-slate-900">관리자 계정</h2>
          </div>

          {!showPasswordForm ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  현재 비밀번호
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="password"
                    value={password}
                    readOnly
                    className="flex-1 max-w-xs px-4 py-2.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900"
                  />
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    비밀번호 변경
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  새 비밀번호
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호를 입력하세요"
                  className="w-full max-w-xs px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="w-full max-w-xs px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handlePasswordChange}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  변경 완료
                </button>
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError("");
                  }}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
