"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { CARS } from "@/constants/data";
import BottomNav from "@/components/BottomNav";

type ChatMessage = {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderType: "customer" | "partner";
  senderName: string;
  content: string;
  type: "text" | "quote_proposal" | "quote_confirmed";
  quoteProposal?: {
    carName: string;
    trimName: string;
    trimPrice: number;
    colorName?: string;
    carImageUrl?: string;
    options: { id: string; name: string; price: number }[];
    totalPrice: number;
    duration: number;
    mileage: number;
    depositRate: number;
    estimatedMonthly: number;
    partnerNote?: string;
  };
  createdAt: string;
};

type ChatRoom = {
  id: string;
  quoteId: string;
  customerId: string;
  customerName: string;
  agentId: string;
  agentName: string;
  agentCompany: string;
  lastMessage?: string;
  lastMessageAt?: string;
  isConfirmed: boolean;
  confirmedQuoteId?: string;
  createdAt: string;
};

type SubmittedQuote = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  selectedCar: {
    name: string;
    price: number;
    trim?: string;
    color?: string;
    options: string[];
  };
  duration: number;
  mileage: number;
  depositRate: number;
  estimatedMonthly: number;
  status: "pending" | "contacted" | "completed";
  createdAt: string;
};

export default function ConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.quoteId as string;

  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmingProposal, setConfirmingProposal] = useState<ChatMessage | null>(null);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const submittedQuotes: SubmittedQuote[] = JSON.parse(
      localStorage.getItem("submitted_quotes") || "[]"
    );

    const myQuote = submittedQuotes.find((q) => q.id === quoteId);
    if (!myQuote) {
      router.push("/my-quotes");
      return;
    }

    loadChatRooms();
  }, [quoteId, router]);

  useEffect(() => {
    mountedRef.current = true;
    if (selectedRoom) {
      loadMessages(selectedRoom.id);
      pollIntervalRef.current = setInterval(() => {
        if (!mountedRef.current) return;

        loadMessages(selectedRoom.id);
        // Refresh room state (to detect confirmation from customer side)
        const rooms: ChatRoom[] = JSON.parse(localStorage.getItem("chat_rooms") || "[]");
        const updated = rooms.find((r) => r.id === selectedRoom.id);
        if (updated && updated.isConfirmed !== selectedRoom.isConfirmed) {
          setSelectedRoom(updated);
        }
      }, 2000);
    }

    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatRooms = () => {
    const rooms: ChatRoom[] = JSON.parse(localStorage.getItem("chat_rooms") || "[]");
    const myRooms = rooms.filter((r) => r.quoteId === quoteId);
    setChatRooms(myRooms);

    if (myRooms.length === 1) {
      setSelectedRoom(myRooms[0]);
    }
  };

  const loadMessages = (chatRoomId: string) => {
    const msgs: ChatMessage[] = JSON.parse(
      localStorage.getItem(`chat_messages_${chatRoomId}`) || "[]"
    );
    setMessages(msgs);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = () => {
    if (!selectedRoom || !inputText.trim()) return;

    const customerPhone = localStorage.getItem("customer_phone") || "";
    const customerName = selectedRoom.customerName;

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      chatRoomId: selectedRoom.id,
      senderId: customerPhone,
      senderType: "customer",
      senderName: customerName,
      content: inputText.trim(),
      type: "text",
      createdAt: new Date().toISOString(),
    };

    const existingMessages: ChatMessage[] = JSON.parse(
      localStorage.getItem(`chat_messages_${selectedRoom.id}`) || "[]"
    );
    existingMessages.push(newMessage);
    localStorage.setItem(
      `chat_messages_${selectedRoom.id}`,
      JSON.stringify(existingMessages)
    );

    const rooms: ChatRoom[] = JSON.parse(localStorage.getItem("chat_rooms") || "[]");
    const roomIndex = rooms.findIndex((r) => r.id === selectedRoom.id);
    if (roomIndex !== -1) {
      rooms[roomIndex].lastMessage = inputText.trim();
      rooms[roomIndex].lastMessageAt = new Date().toISOString();
      localStorage.setItem("chat_rooms", JSON.stringify(rooms));
    }

    setMessages(existingMessages);
    setInputText("");
  };

  const handleConfirmQuote = (message: ChatMessage) => {
    setConfirmingProposal(message);
    setShowConfirmModal(true);
  };

  const confirmQuote = () => {
    if (!selectedRoom || !confirmingProposal) return;

    const rooms: ChatRoom[] = JSON.parse(localStorage.getItem("chat_rooms") || "[]");
    const roomIndex = rooms.findIndex((r) => r.id === selectedRoom.id);
    if (roomIndex !== -1) {
      rooms[roomIndex].isConfirmed = true;
      rooms[roomIndex].confirmedQuoteId = confirmingProposal.id;
      localStorage.setItem("chat_rooms", JSON.stringify(rooms));
    }

    const systemMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      chatRoomId: selectedRoom.id,
      senderId: "system",
      senderType: "customer",
      senderName: "시스템",
      content: `${selectedRoom.customerName}님이 견적을 확정했습니다`,
      type: "quote_confirmed",
      createdAt: new Date().toISOString(),
    };

    const existingMessages: ChatMessage[] = JSON.parse(
      localStorage.getItem(`chat_messages_${selectedRoom.id}`) || "[]"
    );
    existingMessages.push(systemMessage);
    localStorage.setItem(
      `chat_messages_${selectedRoom.id}`,
      JSON.stringify(existingMessages)
    );

    setMessages(existingMessages);
    setShowConfirmModal(false);
    setConfirmingProposal(null);
    setShowSuccessAnimation(true);

    setTimeout(() => {
      setShowSuccessAnimation(false);
    }, 3000);

    loadChatRooms();
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString();
  };

  if (!selectedRoom && chatRooms.length > 1) {
    return (
      <div className="min-h-screen bg-slate-50 pb-20">
        <div className="mx-auto max-w-[430px] bg-white min-h-screen">
          <header className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => router.push("/my-quotes")}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-slate-700">
                arrow_back
              </span>
            </button>
            <h1 className="text-lg font-semibold text-slate-900">
              상담 중인 딜러
            </h1>
          </header>

          <div className="p-4 space-y-3">
            {chatRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-300 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {room.agentName}
                      </h3>
                      {room.isConfirmed && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          확정
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{room.agentCompany}</p>
                  </div>
                  {room.lastMessageAt && !room.isConfirmed && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  )}
                </div>
                {room.lastMessage && (
                  <p className="text-sm text-slate-600 line-clamp-1 mb-1">
                    {room.lastMessage}
                  </p>
                )}
                {room.lastMessageAt && (
                  <p className="text-xs text-slate-500">
                    {formatTime(room.lastMessageAt)}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>

        <BottomNav />
      </div>
    );
  }

  if (!selectedRoom) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-300">
            chat_bubble_outline
          </span>
          <p className="mt-4 text-slate-500">상담 중인 딜러가 없습니다</p>
        </div>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="mx-auto max-w-[430px] bg-white min-h-screen flex flex-col">
        <header className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 z-10">
          <button
            onClick={() => {
              if (chatRooms.length > 1) {
                setSelectedRoom(null);
              } else {
                router.push("/my-quotes");
              }
            }}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-slate-700">
              arrow_back
            </span>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-slate-900">
              {selectedRoom.agentName}
            </h1>
            <p className="text-sm text-slate-500">{selectedRoom.agentCompany}</p>
          </div>
          {selectedRoom.isConfirmed && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
              확정
            </span>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-amber-400">hourglass_top</span>
              </div>
              <p className="text-slate-500 text-sm font-medium mb-1">딜러의 견적서를 기다리고 있습니다</p>
              <p className="text-slate-500 text-xs">곧 견적서가 도착할 예정입니다</p>
            </div>
          )}
          {messages.map((message) => {
            if (message.type === "quote_confirmed") {
              return (
                <div key={message.id} className="flex justify-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-full px-4 py-2">
                    <p className="text-sm text-blue-700 font-medium">
                      {message.content}
                    </p>
                  </div>
                </div>
              );
            }

            if (message.type === "quote_proposal") {
              const proposal = message.quoteProposal!;
              const carData = CARS.find((c) => c.name === proposal.carName);
              const imgUrl = carData?.imageUrl || proposal.carImageUrl || "";
              return (
                <div key={message.id} className="flex justify-start">
                  <div className="max-w-[90%] w-full">
                    <div className="bg-neutral-900 rounded-2xl overflow-hidden shadow-xl">
                      {/* Header */}
                      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-0.5">Rent Zero</p>
                          <p className="text-sm font-bold text-white">공식 견적서</p>
                        </div>
                        <p className="text-[10px] text-neutral-500">{selectedRoom.agentCompany}</p>
                      </div>

                      {/* Car Image */}
                      {imgUrl && (
                        <div className="px-5 py-2">
                          <div className="bg-neutral-800 rounded-xl p-4 flex items-center justify-center">
                            <img
                              src={imgUrl}
                              alt={proposal.carName}
                              className="h-28 object-contain"
                            />
                          </div>
                        </div>
                      )}

                      {/* Car Name & Trim */}
                      <div className="px-5 pt-2 pb-3">
                        <h3 className="text-lg font-black text-white">{proposal.carName}</h3>
                        <p className="text-sm text-neutral-400">{proposal.trimName}</p>
                        {proposal.colorName && (
                          <p className="text-xs text-neutral-500 mt-1">{proposal.colorName}</p>
                        )}
                      </div>

                      <div className="h-px bg-neutral-800 mx-5" />

                      {/* Price Breakdown */}
                      <div className="px-5 py-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-neutral-400">차량 기본가</span>
                          <span className="text-white font-medium">{formatPrice(proposal.trimPrice)}원</span>
                        </div>
                        {proposal.options.length > 0 && proposal.options.map((opt) => (
                          <div key={opt.id} className="flex justify-between text-sm">
                            <span className="text-neutral-500">{opt.name}</span>
                            <span className="text-neutral-300">+{formatPrice(opt.price)}원</span>
                          </div>
                        ))}
                        <div className="h-px bg-neutral-800" />
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-400">총 차량가</span>
                          <span className="text-white font-bold">{formatPrice(proposal.totalPrice)}원</span>
                        </div>
                      </div>

                      <div className="h-px bg-neutral-800 mx-5" />

                      {/* Contract Terms */}
                      <div className="px-5 py-3 grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xl font-black text-white">{proposal.duration}</p>
                          <p className="text-[10px] text-neutral-500">개월</p>
                        </div>
                        <div>
                          <p className="text-xl font-black text-white">{(proposal.mileage / 10000).toFixed(0)}만</p>
                          <p className="text-[10px] text-neutral-500">km/년</p>
                        </div>
                        <div>
                          <p className="text-xl font-black text-white">{proposal.depositRate}%</p>
                          <p className="text-[10px] text-neutral-500">선납금</p>
                        </div>
                      </div>

                      {/* Monthly Payment */}
                      <div className="mx-5 mb-3 bg-white rounded-xl p-4 text-center">
                        <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-400 mb-1">월 납입금</p>
                        <p className="text-3xl font-black text-neutral-900">{formatPrice(proposal.estimatedMonthly)}<span className="text-sm font-medium text-neutral-400 ml-0.5">원</span></p>
                      </div>

                      {/* Partner Note */}
                      {proposal.partnerNote && (
                        <div className="mx-5 mb-4 bg-neutral-800 rounded-xl p-3">
                          <p className="text-[10px] text-neutral-500 mb-1">딜러 메모</p>
                          <p className="text-sm text-neutral-300">{proposal.partnerNote}</p>
                        </div>
                      )}

                      {/* Action Button */}
                      {!selectedRoom.isConfirmed && (
                        <div className="px-5 pb-5">
                          <button
                            onClick={() => handleConfirmQuote(message)}
                            className="w-full bg-white hover:bg-neutral-100 text-neutral-900 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            <span>이 견적으로 확정하기</span>
                          </button>
                        </div>
                      )}

                      {selectedRoom.isConfirmed && selectedRoom.confirmedQuoteId === message.id && (
                        <div className="mx-5 mb-5 bg-blue-600 text-white font-bold py-3 rounded-xl text-center flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined">verified</span>
                          <span>확정된 견적</span>
                        </div>
                      )}

                      {!proposal.partnerNote && !selectedRoom.isConfirmed && <div />}
                      {!proposal.partnerNote && selectedRoom.isConfirmed && selectedRoom.confirmedQuoteId !== message.id && <div className="h-3" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 ml-2">
                      {formatTime(message.createdAt)}
                    </p>
                  </div>
                </div>
              );
            }

            const isCustomer = message.senderType === "customer";
            return (
              <div
                key={message.id}
                className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] ${isCustomer ? "items-end" : "items-start"} flex flex-col`}>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isCustomer
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 mx-2">
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200">
          <div className="mx-auto max-w-[430px] p-4">
            {selectedRoom.isConfirmed ? (
              <div className="flex items-end gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="메시지를 입력하세요..."
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim()}
                  className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-2xl transition-colors flex-shrink-0"
                >
                  <span className="material-symbols-outlined">send</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-slate-500">견적을 확정하면 딜러와 채팅할 수 있습니다</p>
              </div>
            )}
          </div>
        </div>

        {showConfirmModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-white">
                    check_circle
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 text-center mb-2">
                견적을 확정하시겠습니까?
              </h3>
              <p className="text-sm text-slate-600 text-center mb-6">
                이 딜러의 견적을 최종 확정합니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setConfirmingProposal(null);
                  }}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={confirmQuote}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
                >
                  확정하기
                </button>
              </div>
            </div>
          </div>
        )}

        {showSuccessAnimation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 pointer-events-none">
            <div className="bg-white rounded-2xl p-8 text-center animate-bounce">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-5xl text-blue-600">
                  verified
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                견적 확정 완료!
              </h3>
              <p className="text-slate-600">
                딜러가 곧 연락드릴 예정입니다
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
