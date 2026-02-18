# 기아 차량 데이터 수정 필요 항목

## 🔴 우선순위 높음 (배포 전 필수)

### 1. 차량명 불일치 수정
**파일**: `src/constants/generated-cars.json`
**차량 ID**: 4689
**현재**: "더 뉴 레이"
**수정 필요**: "더 뉴 레이 FL" (generated-car-details.json과 일치시키기)

또는 반대로 generated-car-details.json을 "더 뉴 레이"로 수정

**다나와 사이트 확인 필요**: https://auto.danawa.com/newcar/model.php?modelId=4689

---

## 🟡 우선순위 중간 (사용자 경험 개선)

### 2. EV5 (ID: 4499) - grades 배열 추가
**파일**: `src/constants/generated-cars.json`
**현재 상태**: `"grades": []` 또는 grades 필드 없음
**추가해야 할 데이터**: 10개 트림

```json
"grades": [
  {"name": "에어 A/T", "price": 41530000},
  {"name": "에어 2WD A/T", "price": 45750000},
  {"name": "에어 4WD A/T", "price": 48000000},
  {"name": "어스 A/T", "price": 45280000},
  {"name": "어스 2WD A/T", "price": 49500000},
  {"name": "어스 4WD A/T", "price": 51750000},
  {"name": "GT-Line A/T", "price": 46380000},
  {"name": "GT-Line 2WD A/T", "price": 50600000},
  {"name": "GT-Line 4WD A/T", "price": 52860000},
  {"name": "GT A/T", "price": 56600000}
]
```

**시작 가격 확인**: `"startPrice": 41530000` (현재 값과 일치)

### 3. 디 올 뉴 셀토스 (ID: 4763) - grades 배열 추가
**파일**: `src/constants/generated-cars.json`
**현재 상태**: `"grades": []` 또는 grades 필드 없음
**추가해야 할 데이터**: 12개 트림

```json
"grades": [
  {"name": "트렌디 2WD A/T", "price": 24770000},
  {"name": "트렌디 4WD A/T", "price": 27790000},
  {"name": "트렌디 A/T", "price": 28980000},
  {"name": "프레스티지 2WD A/T", "price": 28400000},
  {"name": "프레스티지 4WD A/T", "price": 30350000},
  {"name": "프레스티지 A/T", "price": 32080000},
  {"name": "시그니처 2WD A/T", "price": 31010000},
  {"name": "시그니처 4WD A/T", "price": 32960000},
  {"name": "시그니처 A/T", "price": 34690000},
  {"name": "X-Line 2WD A/T", "price": 32170000},
  {"name": "X-Line 4WD A/T", "price": 34120000},
  {"name": "X-Line A/T", "price": 35840000}
]
```

**시작 가격 확인**: `"startPrice": 24770000` (현재 값과 일치)

---

## 🟢 우선순위 낮음 (상업용 차량, 선택적)

### 4. 봉고 3 (ID: 3772)
- **트림 개수**: 245개
- **권장사항**: 상업용 차량으로 트림이 너무 많아 grades 배열 추가는 선택적
- **대안**: UI에서 "상업용 차량 - 트림 245개" 등으로 표시

### 5. 봉고 3 EV (ID: 4404)
- **트림 개수**: 29개
- **권장사항**: 상업용 차량으로 선택적
- **대안**: UI에서 별도 처리

---

## 📋 검증 완료 차량 (18대)

다음 차량들은 모든 데이터가 정확하고 일관성 있게 구성되어 있습니다:

✅ EV3 (4647)
✅ EV4 (4712)
✅ EV9 (4128)
✅ PV5 (4714)
✅ 더 뉴 EV6 (4641)
✅ 더 뉴 K5 (4585)
✅ 더 뉴 K8 (4665)
✅ 더 뉴 K9 (4066)
✅ 더 뉴 모닝 (4554)
✅ 더 뉴 셀토스 (4391)
✅ 더 뉴 스포티지 (4684)
✅ 더 뉴 쏘렌토 (4563)
✅ 더 뉴 카니발 (4586)
✅ 더 레이 EV (4691)
✅ 디 올 뉴 니로 EV (4396)
✅ 디 올 뉴 니로 (4130)
✅ 타스만 (4686)
⚠️ 더 뉴 레이 (4689) - 차량명만 수정 필요

---

## 🔧 수정 방법

### Option 1: 수동 수정
`src/constants/generated-cars.json` 파일을 직접 편집

### Option 2: 스크립트 사용
generated-car-details.json의 trims 데이터를 기반으로 grades 배열을 자동 생성하는 스크립트 작성

---

**생성 일시**: 2026-02-16
**다음 단계**: Danawa 사이트 정상화 후 실시간 데이터와 재검증
