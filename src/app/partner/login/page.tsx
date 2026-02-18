"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
// import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp" | "register">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [userType, setUserType] = useState<"individual" | "business">("individual");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/[^\d]/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
    setError("");
  };

  const handleSendOTP = async () => {
    setLoading(true);
    setError("");

    try {
      // TODO: Implement Supabase OTP
      // const { error: otpError } = await supabase.auth.signInWithOtp({
      //   phone: phone.replace(/[^\d]/g, ""),
      // });
      // if (otpError) throw otpError;

      // For development, simulate OTP send
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep("otp");
    } catch (err) {
      console.error("OTP send failed:", err);
      setError("인증번호 전송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setLoading(true);
    setError("");

    try {
      // TODO: Implement Supabase OTP verification
      // const { data, error: verifyError } = await supabase.auth.verifyOtp({
      //   phone: phone.replace(/[^\d]/g, ""),
      //   token: otp,
      //   type: "sms",
      // });
      // if (verifyError) throw verifyError;

      // Check if agent exists in database
      // const { data: agent, error: agentError } = await supabase
      //   .from("agents")
      //   .select("*")
      //   .eq("phone", phone.replace(/[^\d]/g, ""))
      //   .single();

      // if (agentError && agentError.code !== "PGRST116") throw agentError;

      // if (!agent) {
      //   setStep("register");
      //   return;
      // }

      // For development, simulate verification
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate checking if agent exists (for now, assume new user)
      setStep("register");
    } catch (err) {
      console.error("OTP verification failed:", err);
      setError("인증번호가 올바르지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file.name);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !company.trim()) {
      setError("모든 정보를 입력해주세요.");
      return;
    }

    if (!uploadedFile) {
      setError("서류를 업로드해주세요.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // TODO: Create agent in database
      // const { data: session } = await supabase.auth.getSession();
      // if (!session?.session?.user) throw new Error("No session");

      // const { error: insertError } = await supabase.from("agents").insert({
      //   user_id: session.session.user.id,
      //   phone: phone.replace(/[^\d]/g, ""),
      //   name: name.trim(),
      //   company: company.trim(),
      //   is_active: true,
      // });

      // if (insertError) throw insertError;

      // For development, store in localStorage
      localStorage.setItem(
        "mockAgent",
        JSON.stringify({
          id: "mock-agent-id",
          phone: phone.replace(/[^\d]/g, ""),
          name: name.trim(),
          company: company.trim(),
          userType: userType,
          document: uploadedFile,
        })
      );

      router.push("/partner");
    } catch (err) {
      console.error("Registration failed:", err);
      setError("가입에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = () => {
    // Development test login
    localStorage.setItem(
      "mockAgent",
      JSON.stringify({
        id: "test-agent-id",
        phone: "01012345678",
        name: "테스트 영업사원",
        company: "테스트 렌트",
      })
    );
    router.push("/partner");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">렌트제로 Pro</h1>
          <p className="text-slate-600">영업사원 전용</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          {/* Phone Input Step */}
          {step === "phone" && (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">로그인</h2>
                <p className="text-sm text-slate-600">
                  휴대폰 번호로 간편하게 로그인하세요
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  휴대폰 번호
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="010-0000-0000"
                  maxLength={13}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleSendOTP}
                disabled={loading || phone.length !== 13}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "전송 중..." : "인증번호 받기"}
              </button>

              <div className="text-center">
                <p className="text-sm text-slate-600">
                  처음 이용하시나요?{" "}
                  <button
                    onClick={() => {
                      if (phone.length === 13) {
                        handleSendOTP();
                      } else {
                        setError("휴대폰 번호를 먼저 입력해주세요.");
                      }
                    }}
                    className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
                  >
                    회원가입하기
                  </button>
                </p>
              </div>
            </>
          )}

          {/* OTP Verification Step */}
          {step === "otp" && (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  인증번호 입력
                </h2>
                <p className="text-sm text-slate-600">
                  {phone}로 전송된 인증번호를 입력하세요
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  인증번호 (6자리)
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d]/g, "");
                    setOtp(value);
                    setError("");
                  }}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "확인 중..." : "로그인"}
              </button>

              <button
                onClick={() => {
                  setStep("phone");
                  setOtp("");
                  setError("");
                }}
                className="w-full text-slate-600 text-sm hover:text-slate-900"
              >
                번호 다시 입력하기
              </button>
            </>
          )}

          {/* Registration Step */}
          {step === "register" && (
            <>
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  회원 정보 입력
                </h2>
                <p className="text-sm text-slate-600">
                  처음 이용하시는군요! 정보를 입력해주세요
                </p>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">회원 유형</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setUserType("individual")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      userType === "individual"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    개인
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType("business")}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      userType === "business"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    사업자
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                  placeholder="홍길동"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  소속 회사
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    setError("");
                  }}
                  placeholder="렌트제로"
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {userType === "individual" ? "명함 업로드" : "사업자등록증 업로드"}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <label className="flex flex-col items-center justify-center w-full py-8 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                  {uploadedFile ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <span className="material-symbols-outlined">check_circle</span>
                      <span className="text-sm font-medium">{uploadedFile}</span>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-3xl text-slate-500 mb-2">cloud_upload</span>
                      <p className="text-sm text-slate-500">
                        {userType === "individual" ? "명함 이미지를 업로드하세요" : "사업자등록증을 업로드하세요"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">JPG, PNG (최대 10MB)</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleRegister}
                disabled={loading || !name.trim() || !company.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "가입 중..." : "가입 완료"}
              </button>
            </>
          )}

          {/* Development Test Login */}
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={handleTestLogin}
              className="w-full text-sm text-slate-500 hover:text-slate-700 py-2"
            >
              개발용 테스트 로그인
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-6">
          로그인 시 개인정보 처리방침에 동의하는 것으로 간주됩니다
        </p>
      </div>
    </div>
  );
}
