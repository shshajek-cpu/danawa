# 다나와 색상 데이터 누락 차량 UI 확인 결과

## 실행 일시
2026-02-16

## 확인 대상
색상 데이터가 없는 10대 차량의 다나와 견적 페이지

## 결과 요약

**총 10대 차량 모두 다나와에서 색상 선택 UI를 제공하지 않음**

모든 차량의 견적 페이지에 다음 메시지가 표시됨:
```html
<div class="estimate__blank">색상과 옵션을 선택 할 수 없는 차량입니다.</div>
```

## 확인된 차량 목록

| ID | 브랜드 | 차량명 | URL | 상태 |
|---|---|---|---|---|
| 4629 | 벤츠 | G-클래스 | [링크](https://auto.danawa.com/newcar/?Work=estimate&Model=4629) | 색상 UI 미제공 ✗ |
| 4566 | 벤츠 | The New AMG GT | [링크](https://auto.danawa.com/newcar/?Work=estimate&Model=4566) | 색상 UI 미제공 ✗ |
| 4072 | BMW | X4 | [링크](https://auto.danawa.com/newcar/?Work=estimate&Model=4072) | 색상 UI 미제공 ✗ |
| 4171 | BMW | 8시리즈 | [링크](https://auto.danawa.com/newcar/?Work=estimate&Model=4171) | 색상 UI 미제공 ✗ |
| 3803 | BMW | 2시리즈 | [링크](https://auto.danawa.com/newcar/?Work=estimate&Model=3803) | 색상 UI 미제공 ✗ |
| 4073 | BMW | X4 M | [링크](https://auto.danawa.com/newcar/?Work=estimate&Model=4073) | 색상 UI 미제공 ✗ |
| 4436 | 아우디 | Q8 e-tron | [링크](https://auto.danawa.com/newcar/?Work=estimate&Model=4436) | 색상 UI 미제공 ✗ |
| 4119 | 랜드로버 | 레인지로버 | [링크](https://auto.danawa.com/newcar/?Work=estimate&Model=4119) | 색상 UI 미제공 ✗ |
| 4472 | 랜드로버 | 레인지로버 벨라 | [링크](https://auto.danawa.com/newcar/?Work=estimate&Model=4472) | 색상 UI 미제공 ✗ |
| 3825 | 테슬라 | Cybertruck | [링크](https://auto.danawa.com/newcar/?Work=estimate&Model=3825) | 색상 UI 미제공 ✗ |

## 상세 분석

### 공통 패턴
모든 페이지에서 발견된 "색상" 관련 요소:
1. **네비게이션 메뉴**: `<span>색상/옵션</span>`
2. **섹션 제목**: `<h3 class="title">2. 옵션 및 색상을 선택하세요.</h3>`
3. **안내 메시지**: `<div class="estimate__blank">색상과 옵션을 선택 할 수 없는 차량입니다.</div>`

### 결론
- ✓ "색상" 텍스트는 페이지에 존재함 (메뉴, 제목)
- ✗ 실제 색상 선택 UI는 없음
- ✓ 명시적 안내 메시지로 색상/옵션 선택 불가능함을 고지

## 권장 조치

1. **DB 정리**: 해당 10개 차량은 다나와에서 색상 데이터를 제공하지 않으므로, DB에 색상 데이터가 없는 것이 정상임
2. **프론트엔드 처리**: 색상 데이터가 없는 차량에 대해 "제조사 문의" 또는 "색상 정보 없음" 메시지 표시
3. **대안 데이터 소스**: 필요시 제조사 공식 웹사이트나 다른 API 활용 검토

## 검증 방법

스크립트: `/Users/heejunkim/Desktop/danawa/scripts/check-missing-colors.js`
- Puppeteer를 사용하여 실제 페이지 접속
- DOM에서 색상 선택 UI 요소 탐색
- "색상" 텍스트 인스턴스 및 주변 HTML 캡처
- 결과를 JSON으로 저장: `color-ui-check-results.json`
