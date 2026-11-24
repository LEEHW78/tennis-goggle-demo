# 테니스 고글 데모 페이지 (틀)

포스터 5번 칸의 '데모' QR이 가리킬 정적 페이지다. 빌드 과정 없이 GitHub Pages에 그대로 올린다.

## 구성
- `index.html`: 페이지 구조. 논문식 제목과 abstract는 두지 않았다.
- `static/js/data.js`: 상태, 수치 카드, 파이프라인 단계별 지연(ms), 측정 조건. **글과 수치는 이 파일만 고친다.** 값이 `null`이면 화면에 '—' 또는 '작성 예정'으로 나온다.
- `static/js/site.js`: data.js를 읽어 화면을 그린다. 단계 지연이 다섯 개 모두 들어가면 '임팩트에서 신호음까지' 막대와 1초 목표선이 그려진다.
- `static/css/site.css`: 색·간격·모서리는 `poster_ref/DESIGN_SYSTEM.md`의 Project Page · Editorial 값을 따른다. 그 시스템의 글꼴에는 한글이 없어 포스터와 같은 42dot Sans를 쓴다.
- `static/media/`: 데모 영상 자리. 아래 파일명으로 넣으면 자동으로 보인다. 파일이 없으면 점선 자리 표시가 남는다.

| 자리 | 파일명 (앞의 것을 먼저 찾음) | 내용 |
|---|---|---|
| 첫 화면 | `hero.mp4` 또는 `hero.gif` | 대표 데모 |
| 영상 1 | `detect.mp4` 또는 `detect.gif` | 30 fps 영상에서 공 검출 |
| 영상 2 | `impact.mp4` 또는 `impact.gif` | 임팩트 순간 타점 복원 |
| 영상 3 | `feedback.mp4` 또는 `feedback.gif` | 판정과 신호음 |

영상은 GIF보다 MP4(H.264, 소리 없음)를 권한다. 같은 길이에서 용량이 수십 분의 일이고, 휴대폰에서도 자동 재생·반복된다(페이지가 `muted autoplay loop playsinline`으로 넣는다). 16:9 비율, 5~10초, 2 MB 이하를 목표로 한다.

## 로컬에서 보기
`index.html`을 브라우저로 바로 열어도 된다.

## GitHub Pages에 올리기
1. GitHub에서 공개 저장소를 만든다(예: `tennis-goggle-demo`).
2. 이 폴더의 내용을 저장소 맨 위에 올린다(`.nojekyll` 포함).
3. 저장소 Settings → Pages → Branch를 `main`, 폴더를 `/ (root)`로 저장한다.
4. 1~2분 뒤 `https://<GitHub 아이디>.github.io/tennis-goggle-demo/`에서 열린다. 포스터 QR은 이 주소를 가리킨다.

주소(아이디와 저장소 이름)는 포스터 QR에 인쇄되므로 정한 뒤에는 바꾸지 않는다. 내용은 언제든 바꿔도 QR은 그대로 쓸 수 있다.
