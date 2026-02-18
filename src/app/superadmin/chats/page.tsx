"use client";

import { useState, useEffect } from "react";

interface ChatRoom {
  id: string;
  quoteId: string;
  customerId: string;
  customerName: string;
  agentId: string;
  agentName: string;
  agentCompany: string;
  lastMessage: string;
  lastMessageAt: string;
  isConfirmed: boolean;
  confirmedQuoteId?: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderType: "customer" | "agent";
  content: string;
  type: "text" | "quote_proposal" | "quote_confirmed";
  proposalData?: {
    monthlyPayment: number;
    duration: number;
    deposit: number;
    notes: string;
  };
  createdAt: string;
}

type FilterTab = "all" | "active" | "confirmed";

export default function ChatsPage() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [isMobile, setIsMobile] = useState(false);
  const [showRoomList, setShowRoomList] = useState(true);

  useEffect(() => {
    loadChatRooms();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
    }
  }, [selectedRoom]);

  function loadChatRooms() {
    const rooms: ChatRoom[] = JSON.parse(localStorage.getItem("chat_rooms") || "[]");
    setChatRooms(rooms);
  }

  function loadMessages(roomId: string) {
    const msgs: ChatMessage[] = JSON.parse(localStorage.getItem(`chat_messages_${roomId}`) || "[]");
    setMessages(msgs);
  }

  function selectRoom(room: ChatRoom) {
    setSelectedRoom(room);
    if (isMobile) {
      setShowRoomList(false);
    }
  }

  function handleBackToList() {
    setShowRoomList(true);
    setSelectedRoom(null);
  }

  const filteredRooms = chatRooms.filter((room) => {
    if (filterTab === "all") return true;
    if (filterTab === "active") return !room.isConfirmed;
    if (filterTab === "confirmed") return room.isConfirmed;
    return true;
  });

  const stats = {
    total: chatRooms.length,
    active: chatRooms.filter((r) => !r.isConfirmed).length,
    confirmed: chatRooms.filter((r) => r.isConfirmed).length,
  };

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "방금 전";
    if (diffMins < 60) return `${diffMins}분 전`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}시간 전`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}일 전`;

    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatMessageTime(dateString: string) {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "오후" : "오전";
    const displayHours = hours % 12 || 12;

    return `${ampm} ${displayHours}:${minutes}`;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">상담 관리</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-600 mb-1">총 상담</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-xs text-blue-600 mb-1">활성 상담</p>
            <p className="text-2xl font-bold text-blue-700">{stats.active}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-xs text-green-600 mb-1">계약 확정</p>
            <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="flex h-[calc(100vh-300px)] md:h-[600px]">
            {/* Room List Panel */}
            {(!isMobile || showRoomList) && (
              <div className="w-full md:w-96 border-r border-slate-200 flex flex-col">
                {/* Filter Tabs */}
                <div className="border-b border-slate-200 px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterTab("all")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterTab === "all"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      전체 ({stats.total})
                    </button>
                    <button
                      onClick={() => setFilterTab("active")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterTab === "active"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      진행중 ({stats.active})
                    </button>
                    <button
                      onClick={() => setFilterTab("confirmed")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        filterTab === "confirmed"
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      계약확정 ({stats.confirmed})
                    </button>
                  </div>
                </div>

                {/* Room List */}
                <div className="flex-1 overflow-y-auto">
                  {filteredRooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-16 px-4">
                      <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
                        chat_bubble_outline
                      </span>
                      <p className="text-slate-500 text-center">아직 상담 내역이 없습니다</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {filteredRooms.map((room) => (
                        <div
                          key={room.id}
                          onClick={() => selectRoom(room)}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedRoom?.id === room.id
                              ? "bg-blue-50 border-l-4 border-blue-600"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {room.customerName}
                              </p>
                              <p className="text-xs text-slate-600 truncate">
                                {room.agentName} · {room.agentCompany}
                              </p>
                            </div>
                            {room.isConfirmed && (
                              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full flex-shrink-0">
                                확정
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 mb-1">
                            {room.lastMessage}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatTime(room.lastMessageAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages Panel */}
            {(!isMobile || !showRoomList) && (
              <div className="flex-1 flex flex-col">
                {selectedRoom ? (
                  <>
                    {/* Chat Header */}
                    <div className="border-b border-slate-200 px-4 md:px-6 py-4 bg-slate-50">
                      <div className="flex items-center gap-3">
                        {isMobile && (
                          <button
                            onClick={handleBackToList}
                            className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined text-slate-600">
                              arrow_back
                            </span>
                          </button>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {selectedRoom.customerName}
                            </p>
                            <span className="material-symbols-outlined text-slate-400 text-sm">
                              arrow_forward
                            </span>
                            <p className="text-sm font-semibold text-slate-900">
                              {selectedRoom.agentName}
                            </p>
                          </div>
                          <p className="text-xs text-slate-600">
                            {selectedRoom.agentCompany}
                          </p>
                        </div>
                        {selectedRoom.isConfirmed && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            계약 확정
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.senderType === "customer" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[80%] md:max-w-md ${
                              message.senderType === "customer" ? "items-end" : "items-start"
                            }`}
                          >
                            {/* Sender Name */}
                            <p
                              className={`text-xs text-slate-600 mb-1 px-1 ${
                                message.senderType === "customer" ? "text-right" : "text-left"
                              }`}
                            >
                              {message.senderName}
                            </p>

                            {/* Message Content */}
                            {message.type === "text" && (
                              <div
                                className={`px-4 py-2.5 rounded-2xl ${
                                  message.senderType === "customer"
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 text-slate-900"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                            )}

                            {message.type === "quote_proposal" && message.proposalData && (
                              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="material-symbols-outlined text-blue-600 text-xl">
                                    description
                                  </span>
                                  <p className="text-sm font-bold text-blue-900">견적 제안</p>
                                </div>
                                <div className="space-y-2 mb-3">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-blue-700">월 납입금</span>
                                    <span className="text-lg font-bold text-blue-900">
                                      {message.proposalData.monthlyPayment.toLocaleString()}원
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-blue-700">계약기간</span>
                                    <span className="text-sm font-medium text-blue-900">
                                      {message.proposalData.duration}개월
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs text-blue-700">선수금</span>
                                    <span className="text-sm font-medium text-blue-900">
                                      {message.proposalData.deposit.toLocaleString()}원
                                    </span>
                                  </div>
                                </div>
                                {message.proposalData.notes && (
                                  <div className="pt-3 border-t border-blue-200">
                                    <p className="text-xs text-blue-800 whitespace-pre-wrap">
                                      {message.proposalData.notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {message.type === "quote_confirmed" && (
                              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-green-600 text-xl">
                                    check_circle
                                  </span>
                                  <p className="text-sm font-bold text-green-900">계약이 확정되었습니다</p>
                                </div>
                                {message.content && (
                                  <p className="text-xs text-green-700 mt-2">{message.content}</p>
                                )}
                              </div>
                            )}

                            {/* Timestamp */}
                            <p
                              className={`text-xs text-slate-400 mt-1 px-1 ${
                                message.senderType === "customer" ? "text-right" : "text-left"
                              }`}
                            >
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Read-only notice */}
                    <div className="border-t border-slate-200 px-4 md:px-6 py-4 bg-slate-50">
                      <div className="flex items-center gap-2 justify-center text-slate-500">
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <p className="text-sm">관리자 모니터링 모드 (읽기 전용)</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center py-16 px-4">
                      <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">
                        chat
                      </span>
                      <p className="text-slate-500">좌측에서 상담을 선택하세요</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
