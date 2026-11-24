// 데모 페이지에 들어가는 글과 수치는 여기서만 고친다.
// 값이 null이면 화면에 '—' 또는 '측정 예정'으로 보인다. 근거 없는 수치는 넣지 않는다.
window.DEMO = {
  status: '준비 중',                       // 예: '측정 완료 (2026-12-01)'
  refsUrl: 'https://docs.google.com/document/d/1kMlc_bKT2qU10QjpsPrCPan1Yiwdge09Nvi5vBsQoP4/edit?usp=sharing',

  heroCaption: null,                      // 예: '<strong>대표 데모.</strong> 30 fps 경기 영상에서 …'

  // 핵심 수치 카드 4장
  stats: [
    { label: '피드백 지연', value: null, unit: '초', desc: '임팩트 → 신호음. 포스터 예상 0.7초' },
    { label: '입력 프레임', value: '30', unit: 'fps', desc: '고글 카메라와 같은 프레임률' },
    { label: '공 검출', value: null, unit: '%', desc: '검출률 (측정 예정)' },
    { label: '타점 오차', value: null, unit: 'cm', desc: '기준값 대비 (측정 예정)' }
  ],

  // 파이프라인 단계와 단계별 지연(ms). 측정 전에는 ms: null
  stages: [
    { where: '고글', name: '타구음으로 임팩트 시각 감지', desc: '타구음 분류 모델이 임팩트 순간을 찾습니다.', ms: null },
    { where: '고글 → 스마트폰', name: '임팩트 전후 프레임만 전송', desc: '최근 1초 분량만 유지하고, 임팩트 전후 프레임만 보냅니다.', ms: null },
    { where: '스마트폰', name: '공 검출', desc: '각 프레임에서 공의 위치와 크기를 찾습니다.', ms: null },
    { where: '스마트폰', name: '타점 복원과 판정', desc: '궤적으로 임팩트 순간의 공 위치를 추정하고 개인 기준과 비교합니다.', ms: null },
    { where: '스마트폰 → 고글', name: '신호음 출력', desc: '가장 크게 벗어난 지표 하나만 짧은 신호음으로 알립니다.', ms: null }
  ],
  budgetMs: 1000,                         // 포스터 목표: 1초 이내

  // 측정 조건 (proxy 실험의 장비·영상·모델)
  conditions: [
    { k: '실행 장비', v: null },
    { k: '입력 영상', v: null },
    { k: '모델', v: null },
    { k: '반복 횟수', v: null },
    { k: '실제 고글과 다른 점', v: null }
  ]
};
