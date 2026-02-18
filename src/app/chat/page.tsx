"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ChatPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-500 text-sm">준비 중입니다...</p>
    </div>
  );
}
