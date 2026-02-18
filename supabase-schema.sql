-- Supabase SQL Migration: 렌트제로 입찰 시스템
-- Supabase Dashboard > SQL Editor 에서 실행

-- 1. 고객 테이블
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 견적서 테이블
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  car_id TEXT NOT NULL,
  car_name TEXT NOT NULL,
  trim_id TEXT NOT NULL,
  trim_name TEXT NOT NULL,
  trim_price BIGINT NOT NULL,
  color_id TEXT,
  color_name TEXT,
  options JSONB DEFAULT '[]',
  total_price BIGINT NOT NULL,
  duration INTEGER NOT NULL,
  mileage INTEGER NOT NULL,
  deposit_rate INTEGER NOT NULL,
  estimated_monthly BIGINT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 영업사원 테이블
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  points INTEGER DEFAULT 5000,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 리드 구매 테이블
CREATE TABLE lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  points_used INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(quote_id, agent_id)
);

-- 5. 포인트 거래 내역 테이블
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT CHECK (type IN ('charge', 'purchase', 'refund', 'bonus')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 인덱스
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);
CREATE INDEX idx_lead_purchases_quote ON lead_purchases(quote_id);
CREATE INDEX idx_lead_purchases_agent ON lead_purchases(agent_id);
CREATE INDEX idx_point_transactions_agent ON point_transactions(agent_id);
CREATE INDEX idx_agents_user ON agents(user_id);

-- 7. Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_purchases;

-- 8. RLS (Row Level Security)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- 고객: 본인 데이터만 조회
CREATE POLICY "customers_select_own" ON customers FOR SELECT USING (true);
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (true);

-- 견적: 누구나 조회 가능 (영업사원이 봐야 하므로), 고객만 생성
CREATE POLICY "quotes_select_all" ON quotes FOR SELECT USING (true);
CREATE POLICY "quotes_insert" ON quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "quotes_update_own" ON quotes FOR UPDATE USING (true);

-- 영업사원: 인증된 사용자만
CREATE POLICY "agents_select" ON agents FOR SELECT USING (true);
CREATE POLICY "agents_insert" ON agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agents_update_own" ON agents FOR UPDATE USING (auth.uid() = user_id);

-- 리드 구매: 누구나 조회, 영업사원만 생성
CREATE POLICY "lead_purchases_select_all" ON lead_purchases FOR SELECT USING (true);
CREATE POLICY "lead_purchases_insert" ON lead_purchases FOR INSERT WITH CHECK (true);

-- 포인트 거래: 본인 거래만 조회, 시스템/본인만 생성
CREATE POLICY "point_transactions_select_own" ON point_transactions FOR SELECT USING (
  agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
);
CREATE POLICY "point_transactions_insert" ON point_transactions FOR INSERT WITH CHECK (true);
