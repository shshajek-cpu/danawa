// Chat types and localStorage data layer for real-time chat consultation

export type ChatMessage = {
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

export type ChatRoom = {
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

// localStorage keys
const CHAT_ROOMS_KEY = "chat_rooms";
const getChatMessagesKey = (chatRoomId: string) => `chat_messages_${chatRoomId}`;
const getLastReadKey = (chatRoomId: string, userId: string) => `chat_last_read_${chatRoomId}_${userId}`;

// Helper to get all chat rooms from localStorage
function getAllChatRooms(): ChatRoom[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(CHAT_ROOMS_KEY);
  return data ? JSON.parse(data) : [];
}

// Helper to save all chat rooms to localStorage
function saveAllChatRooms(rooms: ChatRoom[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CHAT_ROOMS_KEY, JSON.stringify(rooms));
}

// Helper to update a specific chat room
function updateChatRoom(roomId: string, updates: Partial<ChatRoom>): void {
  const rooms = getAllChatRooms();
  const index = rooms.findIndex(r => r.id === roomId);
  if (index !== -1) {
    rooms[index] = { ...rooms[index], ...updates };
    saveAllChatRooms(rooms);
  }
}

// Get all chat rooms for a customer (by phone)
export function getCustomerChatRooms(customerPhone: string): ChatRoom[] {
  return getAllChatRooms().filter(room => room.customerId === customerPhone);
}

// Get all chat rooms for a partner (by agent id)
export function getPartnerChatRooms(agentId: string): ChatRoom[] {
  return getAllChatRooms().filter(room => room.agentId === agentId);
}

// Get or create a chat room between customer and partner for a specific quote
export function getOrCreateChatRoom(
  quoteId: string,
  customerPhone: string,
  customerName: string,
  agentId: string,
  agentName: string,
  agentCompany: string
): ChatRoom {
  const chatRoomId = `chat_${quoteId}_${agentId}`;
  const rooms = getAllChatRooms();
  const existing = rooms.find(r => r.id === chatRoomId);

  if (existing) {
    return existing;
  }

  // Create new chat room
  const newRoom: ChatRoom = {
    id: chatRoomId,
    quoteId,
    customerId: customerPhone,
    customerName,
    agentId,
    agentName,
    agentCompany,
    isConfirmed: false,
    createdAt: new Date().toISOString(),
  };

  rooms.push(newRoom);
  saveAllChatRooms(rooms);

  return newRoom;
}

// Get messages for a chat room
export function getChatMessages(chatRoomId: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(getChatMessagesKey(chatRoomId));
  return data ? JSON.parse(data) : [];
}

// Helper to save messages for a chat room
function saveChatMessages(chatRoomId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(getChatMessagesKey(chatRoomId), JSON.stringify(messages));
}

// Send a text message
export function sendMessage(
  chatRoomId: string,
  senderId: string,
  senderType: "customer" | "partner",
  senderName: string,
  content: string
): ChatMessage {
  const messages = getChatMessages(chatRoomId);
  const newMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    chatRoomId,
    senderId,
    senderType,
    senderName,
    content,
    type: "text",
    createdAt: new Date().toISOString(),
  };

  messages.push(newMessage);
  saveChatMessages(chatRoomId, messages);

  // Update chat room's last message
  updateChatRoom(chatRoomId, {
    lastMessage: content,
    lastMessageAt: newMessage.createdAt,
  });

  return newMessage;
}

// Send a quote proposal (partner -> customer)
export function sendQuoteProposal(
  chatRoomId: string,
  agentId: string,
  agentName: string,
  proposal: ChatMessage["quoteProposal"]
): ChatMessage {
  if (!proposal) {
    throw new Error("Quote proposal data is required");
  }

  const messages = getChatMessages(chatRoomId);
  const newMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    chatRoomId,
    senderId: agentId,
    senderType: "partner",
    senderName: agentName,
    content: `견적 제안: ${proposal.carName} ${proposal.trimName} - 월 ${proposal.estimatedMonthly.toLocaleString()}원`,
    type: "quote_proposal",
    quoteProposal: proposal,
    createdAt: new Date().toISOString(),
  };

  messages.push(newMessage);
  saveChatMessages(chatRoomId, messages);

  // Update chat room's last message
  updateChatRoom(chatRoomId, {
    lastMessage: newMessage.content,
    lastMessageAt: newMessage.createdAt,
  });

  return newMessage;
}

// Confirm a quote (customer action)
export function confirmQuote(chatRoomId: string, messageId: string): void {
  const messages = getChatMessages(chatRoomId);
  const proposalMessage = messages.find(m => m.id === messageId && m.type === "quote_proposal");

  if (!proposalMessage) {
    throw new Error("Quote proposal message not found");
  }

  // Create confirmation message
  const confirmationMessage: ChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    chatRoomId,
    senderId: "system",
    senderType: "customer",
    senderName: "시스템",
    content: "고객님이 견적을 확정하셨습니다.",
    type: "quote_confirmed",
    createdAt: new Date().toISOString(),
  };

  messages.push(confirmationMessage);
  saveChatMessages(chatRoomId, messages);

  // Update chat room
  updateChatRoom(chatRoomId, {
    isConfirmed: true,
    confirmedQuoteId: messageId,
    lastMessage: confirmationMessage.content,
    lastMessageAt: confirmationMessage.createdAt,
  });
}

// Get unread count for a chat room (based on last read timestamp)
export function getUnreadCount(chatRoomId: string, userId: string): number {
  if (typeof window === "undefined") return 0;

  const lastReadStr = localStorage.getItem(getLastReadKey(chatRoomId, userId));
  const lastReadTime = lastReadStr ? new Date(lastReadStr).getTime() : 0;

  const messages = getChatMessages(chatRoomId);
  return messages.filter(m => {
    const messageTime = new Date(m.createdAt).getTime();
    return messageTime > lastReadTime && m.senderId !== userId;
  }).length;
}

// Mark messages as read
export function markAsRead(chatRoomId: string, userId: string): void {
  if (typeof window === "undefined") return;
  const now = new Date().toISOString();
  localStorage.setItem(getLastReadKey(chatRoomId, userId), now);
}
