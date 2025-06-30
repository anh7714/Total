-- 종합평가시스템 데이터베이스 스키마

DROP TABLE IF EXISTS evaluation_progress CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS evaluation_items CASCADE;
DROP TABLE IF EXISTS evaluation_categories CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;
DROP TABLE IF EXISTS evaluators CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;

-- 1. 시스템 설정 테이블
CREATE TABLE system_config (
  id SERIAL PRIMARY KEY,
  evaluation_title VARCHAR(200) NOT NULL DEFAULT '종합평가시스템',
  evaluation_period_start DATE,
  evaluation_period_end DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 관리자 테이블
CREATE TABLE admins (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  is_super_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 평가위원 테이블
CREATE TABLE evaluators (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  department VARCHAR(100),
  password VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. 평가 카테고리 테이블
CREATE TABLE evaluation_categories (
  id SERIAL PRIMARY KEY,
  category_code VARCHAR(10) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 평가 항목 테이블
CREATE TABLE evaluation_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES evaluation_categories(id) ON DELETE CASCADE,
  item_code VARCHAR(20) NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  description TEXT,
  max_score INTEGER NOT NULL DEFAULT 100,
  weight DECIMAL(5,2) DEFAULT 1.0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. 평가 대상자 테이블
CREATE TABLE candidates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100),
  position VARCHAR(100),
  category VARCHAR(50),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 7. 채점 결과 테이블
CREATE TABLE scores (
  id SERIAL PRIMARY KEY,
  evaluator_id INTEGER REFERENCES evaluators(id) ON DELETE CASCADE,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES evaluation_items(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL,
  max_score INTEGER NOT NULL,
  comments TEXT,
  is_final BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(evaluator_id, candidate_id, item_id)
);

-- 8. 채점 진행 상황 테이블
CREATE TABLE evaluation_progress (
  id SERIAL PRIMARY KEY,
  evaluator_id INTEGER REFERENCES evaluators(id) ON DELETE CASCADE,
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  total_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  is_submitted BOOLEAN DEFAULT false,
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(evaluator_id, candidate_id)
);

-- 초기 데이터 삽입
INSERT INTO system_config (evaluation_title) VALUES ('2025년 상반기 적극행정 우수공무원 선발');

INSERT INTO admins (username, password, name, email, is_super_admin) 
VALUES ('admin', 'admin123', '시스템 관리자', 'admin@example.com', true);

-- 샘플 데이터
INSERT INTO evaluation_categories (category_code, category_name, description, sort_order) VALUES
('A', '기술이해도', '통돌OS 사업 운영 관련 기술 이해 정도', 1),
('B', '창의성', '업무 처리의 창의적 접근과 혁신적 사고', 2),
('C', '적극성', '업무에 대한 적극적 자세와 책임감', 3);

INSERT INTO evaluation_items (category_id, item_code, item_name, max_score, sort_order) VALUES
(1, 'A1', '통돌OS 사업 운영 계획서 검토', 30, 1),
(1, 'A2', '서비스 개선안 도출', 30, 2),
(2, 'B1', '사업 운영 출발점 및 목적성의 적합성', 25, 1),
(3, 'C1', '배정의 타당성 (이용자 중심)', 15, 1);

INSERT INTO candidates (name, department, category, sort_order) VALUES
('최대상', '문화관광과', '최대상', 1),
('강대상', '문화관광과', '강대상', 2),
('조대상', '문화관광과', '조대상', 3);