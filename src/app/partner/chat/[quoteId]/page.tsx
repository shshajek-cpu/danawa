"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { CARS, getCarDetail } from "@/constants/data";

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

type Quote = {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  car_id?: string;
  car_name: string;
  trim_name: string;
  trim_price: number;
  color_name?: string;
  options: { id: string; name: string; price: number }[];
  total_price: number;
  duration: number;
  mileage: number;
  deposit_rate: number;
  estimated_monthly: number | null;
};

type Agent = {
  id: string;
  name: string;
  company: string;
  points: number;
};

export default function PartnerChatPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.quoteId as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [showQuoteModal, setShowQuoteModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Quote proposal form state
  const [proposalTrimPrice, setProposalTrimPrice] = useState(0);
  const [proposalDuration, setProposalDuration] = useState(0);
  const [proposalMileage, setProposalMileage] = useState(0);
  const [proposalDepositRate, setProposalDepositRate] = useState(0);
  const [proposalEstimatedMonthly, setProposalEstimatedMonthly] = useState(0);
  const [proposalNote, setProposalNote] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mockAgent = localStorage.getItem("mockAgent");
    if (!mockAgent) {
      alert("로그인이 필요합니다.");
      router.push("/partner/login");
      return;
    }

    const agentData = JSON.parse(mockAgent);
    setAgent(agentData);

    const submittedQuotes = JSON.parse(
      localStorage.getItem("submitted_quotes") || "[]"
    );
    const foundQuote = submittedQuotes.find((q: Quote) => q.id === quoteId);

    if (!foundQuote) {
      alert("견적 정보를 찾을 수 없습니다.");
      router.push("/partner");
      return;
    }

    setQuote(foundQuote);

    const chatRooms: ChatRoom[] = JSON.parse(
      localStorage.getItem("chat_rooms") || "[]"
    );
    let room = chatRooms.find(
      (r) => r.quoteId === quoteId && r.agentId === agentData.id
    );

    if (!room) {
      room = {
        id: `chat_${quoteId}_${agentData.id}`,
        quoteId,
        customerId: foundQuote.customer_phone || foundQuote.customer_id,
        customerName: foundQuote.customer_name || "고객",
        agentId: agentData.id,
        agentName: agentData.name,
        agentCompany: agentData.company,
        isConfirmed: false,
        createdAt: new Date().toISOString(),
      };

      chatRooms.push(room);
      localStorage.setItem("chat_rooms", JSON.stringify(chatRooms));
    }

    setChatRoom(room);
    loadMessages(room.id);

    const roomId = room.id;
    pollIntervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;

      loadMessages(roomId);
      // Also refresh chat room state (to detect confirmation)
      const latestRooms: ChatRoom[] = JSON.parse(localStorage.getItem("chat_rooms") || "[]");
      const latestRoom = latestRooms.find((r) => r.id === roomId);
      if (latestRoom) setChatRoom(latestRoom);
    }, 2000);

    return () => {
      mountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [quoteId, router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const hasSentProposal = messages.some((m) => m.type === "quote_proposal");

  const loadMessages = (roomId: string) => {
    const messagesKey = `chat_messages_${roomId}`;
    const loadedMessages = JSON.parse(
      localStorage.getItem(messagesKey) || "[]"
    );
    setMessages(loadedMessages);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendTextMessage = () => {
    if (!messageInput.trim() || !chatRoom || !agent) return;

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      chatRoomId: chatRoom.id,
      senderId: agent.id,
      senderType: "partner",
      senderName: agent.name,
      content: messageInput.trim(),
      type: "text",
      createdAt: new Date().toISOString(),
    };

    const messagesKey = `chat_messages_${chatRoom.id}`;
    const currentMessages = JSON.parse(
      localStorage.getItem(messagesKey) || "[]"
    );
    currentMessages.push(newMessage);
    localStorage.setItem(messagesKey, JSON.stringify(currentMessages));

    const chatRooms: ChatRoom[] = JSON.parse(
      localStorage.getItem("chat_rooms") || "[]"
    );
    const roomIndex = chatRooms.findIndex((r) => r.id === chatRoom.id);
    if (roomIndex !== -1) {
      chatRooms[roomIndex].lastMessage = messageInput.trim();
      chatRooms[roomIndex].lastMessageAt = new Date().toISOString();
      localStorage.setItem("chat_rooms", JSON.stringify(chatRooms));
    }

    setMessages(currentMessages);
    setMessageInput("");
  };

  const openQuoteModal = () => {
    if (!quote) return;

    setProposalTrimPrice(quote.trim_price);
    setProposalDuration(quote.duration);
    setProposalMileage(quote.mileage);
    setProposalDepositRate(quote.deposit_rate);
    setProposalEstimatedMonthly(quote.estimated_monthly || 0);
    setProposalNote("");
    setShowQuoteModal(true);
  };

  const sendQuoteProposal = () => {
    if (!chatRoom || !agent || !quote) return;

    const optionsTotal = quote.options.reduce(
      (sum, opt) => sum + opt.price,
      0
    );
    const totalPrice = proposalTrimPrice + optionsTotal;

    // Look up car image by ID first, then by name
    const carDetail = quote.car_id ? getCarDetail(quote.car_id) : null;
    const carData = CARS.find((c) => c.id === quote.car_id) || CARS.find((c) => c.name === quote.car_name);
    const carImageUrl = quote.car_id ? `/cars/${quote.car_id}.png` : (carData?.imageUrl || "");

    const quoteProposal = {
      carName: quote.car_name,
      trimName: quote.trim_name,
      trimPrice: proposalTrimPrice,
      colorName: quote.color_name,
      carImageUrl,
      options: quote.options,
      totalPrice,
      duration: proposalDuration,
      mileage: proposalMileage,
      depositRate: proposalDepositRate,
      estimatedMonthly: proposalEstimatedMonthly,
      partnerNote: proposalNote,
    };

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      chatRoomId: chatRoom.id,
      senderId: agent.id,
      senderType: "partner",
      senderName: agent.name,
      content: "견적서를 보냈습니다.",
      type: "quote_proposal",
      quoteProposal,
      createdAt: new Date().toISOString(),
    };

    const messagesKey = `chat_messages_${chatRoom.id}`;
    const currentMessages = JSON.parse(
      localStorage.getItem(messagesKey) || "[]"
    );
    currentMessages.push(newMessage);
    localStorage.setItem(messagesKey, JSON.stringify(currentMessages));

    const chatRooms: ChatRoom[] = JSON.parse(
      localStorage.getItem("chat_rooms") || "[]"
    );
    const roomIndex = chatRooms.findIndex((r) => r.id === chatRoom.id);
    if (roomIndex !== -1) {
      chatRooms[roomIndex].lastMessage = "견적서를 보냈습니다.";
      chatRooms[roomIndex].lastMessageAt = new Date().toISOString();
      localStorage.setItem("chat_rooms", JSON.stringify(chatRooms));
    }

    setMessages(currentMessages);
    setShowQuoteModal(false);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("ko-KR");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "오후" : "오전";
    const displayHours = hours % 12 || 12;
    return `${ampm} ${displayHours}:${minutes.toString().padStart(2, "0")}`;
  };

  if (!agent || !quote || !chatRoom) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push(`/partner/quotes/${quoteId}`)}
          className="text-slate-600 hover:text-slate-900"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <div className="font-semibold text-slate-900">
            {chatRoom.customerName}
          </div>
          <div className="text-xs text-slate-500">
            {quote.car_name} {quote.trim_name}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-blue-400">description</span>
            </div>
            <p className="text-slate-500 text-sm font-medium mb-1">아직 견적서를 보내지 않았습니다</p>
            <p className="text-slate-500 text-xs">아래 버튼을 눌러 견적서를 보내주세요</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.senderType === "partner" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] ${
                msg.senderType === "partner" ? "items-end" : "items-start"
              } flex flex-col gap-1`}
            >
              {msg.type === "text" && (
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    msg.senderType === "partner"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-slate-900 border border-slate-200"
                  }`}
                >
                  {msg.content}
                </div>
              )}

              {msg.type === "quote_proposal" && msg.quoteProposal && (() => {
                const imgUrl = msg.quoteProposal!.carImageUrl
                  || CARS.find((c) => c.name === msg.quoteProposal!.carName)?.imageUrl
                  || (quote?.car_id ? getCarDetail(quote.car_id)?.imageUrl : "")
                  || "";
                return (
                <div className="bg-neutral-900 rounded-2xl overflow-hidden w-full shadow-xl">
                  {/* Header */}
                  <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-neutral-500 mb-0.5">Rent Zero</p>
                      <p className="text-sm font-bold text-white">공식 견적서</p>
                    </div>
                    <p className="text-[10px] text-neutral-500">{formatDate(msg.createdAt)}</p>
                  </div>

                  {/* Car Image */}
                  {imgUrl && (
                    <div className="px-5 py-2">
                      <div className="bg-neutral-800 rounded-xl p-4 flex items-center justify-center">
                        <img
                          src={imgUrl}
                          alt={msg.quoteProposal!.carName}
                          className="h-28 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Car Name & Trim */}
                  <div className="px-5 pt-2 pb-3">
                    <h3 className="text-lg font-black text-white">{msg.quoteProposal.carName}</h3>
                    <p className="text-sm text-neutral-400">{msg.quoteProposal.trimName}</p>
                    {msg.quoteProposal.colorName && (
                      <p className="text-xs text-neutral-500 mt-1">{msg.quoteProposal.colorName}</p>
                    )}
                  </div>

                  <div className="h-px bg-neutral-800 mx-5" />

                  {/* Price Breakdown */}
                  <div className="px-5 py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-400">차량 기본가</span>
                      <span className="text-white font-medium">{formatPrice(msg.quoteProposal.trimPrice)}원</span>
                    </div>
                    {msg.quoteProposal.options.length > 0 && msg.quoteProposal.options.map((opt) => (
                      <div key={opt.id} className="flex justify-between text-sm">
                        <span className="text-neutral-500">{opt.name}</span>
                        <span className="text-neutral-300">+{formatPrice(opt.price)}원</span>
                      </div>
                    ))}
                    <div className="h-px bg-neutral-800" />
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-400">총 차량가</span>
                      <span className="text-white font-bold">{formatPrice(msg.quoteProposal.totalPrice)}원</span>
                    </div>
                  </div>

                  <div className="h-px bg-neutral-800 mx-5" />

                  {/* Contract Terms */}
                  <div className="px-5 py-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xl font-black text-white">{msg.quoteProposal.duration}</p>
                      <p className="text-[10px] text-neutral-500">개월</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-white">{(msg.quoteProposal.mileage / 10000).toFixed(0)}만</p>
                      <p className="text-[10px] text-neutral-500">km/년</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-white">{msg.quoteProposal.depositRate}%</p>
                      <p className="text-[10px] text-neutral-500">선납금</p>
                    </div>
                  </div>

                  {/* Monthly Payment */}
                  <div className="mx-5 mb-3 bg-white rounded-xl p-4 text-center">
                    <p className="text-[10px] tracking-[0.15em] uppercase text-neutral-400 mb-1">월 납입금</p>
                    <p className="text-3xl font-black text-neutral-900">{formatPrice(msg.quoteProposal.estimatedMonthly)}<span className="text-sm font-medium text-neutral-400 ml-0.5">원</span></p>
                  </div>

                  {/* Partner Note */}
                  {msg.quoteProposal.partnerNote && (
                    <div className="mx-5 mb-4 bg-neutral-800 rounded-xl p-3">
                      <p className="text-[10px] text-neutral-500 mb-1">딜러 메모</p>
                      <p className="text-sm text-neutral-300">{msg.quoteProposal.partnerNote}</p>
                    </div>
                  )}

                  {!msg.quoteProposal.partnerNote && <div className="h-2" />}
                </div>
                ); })()}

              {msg.type === "quote_confirmed" && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 w-full">
                  <span className="material-symbols-outlined text-blue-600 text-3xl">
                    check_circle
                  </span>
                  <div>
                    <div className="font-semibold text-blue-900">
                      고객이 견적을 확정했습니다!
                    </div>
                    <div className="text-sm text-blue-700">
                      계약 진행을 위해 연락드리겠습니다.
                    </div>
                  </div>
                </div>
              )}

              <div
                className={`text-xs text-slate-500 ${
                  msg.senderType === "partner" ? "text-right" : "text-left"
                }`}
              >
                {formatDate(msg.createdAt)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Action Bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 space-y-2">
        {!hasSentProposal ? (
          /* Step 1: Must send quote first */
          <>
            <div className="text-center py-2">
              <p className="text-sm text-slate-500">고객에게 먼저 견적서를 보내주세요</p>
            </div>
            <button
              onClick={openQuoteModal}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">description</span>
              견적서 보내기
            </button>
          </>
        ) : !chatRoom?.isConfirmed ? (
          /* Step 2: Quote sent, waiting for confirmation */
          <>
            <div className="text-center py-2">
              <div className="flex items-center justify-center gap-2 text-amber-600">
                <span className="material-symbols-outlined text-lg">hourglass_top</span>
                <p className="text-sm font-medium">고객이 견적을 검토 중입니다</p>
              </div>
              <p className="text-xs text-slate-500 mt-1">고객이 견적을 확정하면 채팅이 가능합니다</p>
            </div>
            <button
              onClick={openQuoteModal}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">description</span>
              견적서 다시 보내기
            </button>
          </>
        ) : (
          /* Step 3: Confirmed - full chat enabled */
          <>
            <button
              onClick={openQuoteModal}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-base">description</span>
              견적서 다시 보내기
            </button>
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendTextMessage();
                  }
                }}
                placeholder="메시지를 입력하세요"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendTextMessage}
                disabled={!messageInput.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg"
              >
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Quote Proposal Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">견적서 작성</h2>
              <button
                onClick={() => setShowQuoteModal(false)}
                className="text-slate-500 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  차량 (읽기 전용)
                </label>
                <input
                  type="text"
                  value={`${quote.car_name} ${quote.trim_name}`}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                />
              </div>

              {quote.color_name && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    색상
                  </label>
                  <input
                    type="text"
                    value={quote.color_name}
                    disabled
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  트림 가격 (할인 가능)
                </label>
                <input
                  type="number"
                  value={proposalTrimPrice}
                  onChange={(e) => setProposalTrimPrice(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {quote.options.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    선택 옵션
                  </label>
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                    {quote.options.map((opt) => (
                      <div
                        key={opt.id}
                        className="flex justify-between text-sm"
                      >
                        <span>{opt.name}</span>
                        <span className="font-medium">
                          +{formatPrice(opt.price)}원
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  계약 기간 (개월)
                </label>
                <input
                  type="number"
                  value={proposalDuration}
                  onChange={(e) => setProposalDuration(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  주행거리 (km)
                </label>
                <input
                  type="number"
                  value={proposalMileage}
                  onChange={(e) => setProposalMileage(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  보증금 비율 (%)
                </label>
                <input
                  type="number"
                  value={proposalDepositRate}
                  onChange={(e) =>
                    setProposalDepositRate(Number(e.target.value))
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  예상 월 납입금 (원)
                </label>
                <input
                  type="number"
                  value={proposalEstimatedMonthly}
                  onChange={(e) =>
                    setProposalEstimatedMonthly(Number(e.target.value))
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  딜러 메모 (특별 할인, 조건 등)
                </label>
                <textarea
                  value={proposalNote}
                  onChange={(e) => setProposalNote(e.target.value)}
                  rows={3}
                  placeholder="특별 할인이나 추가 조건을 입력하세요"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={sendQuoteProposal}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium"
              >
                견적서 전송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
