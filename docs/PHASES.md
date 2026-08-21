# PHASES.md — 개발 로드맵 (SDD 기반)

> 이 문서는 "지금 어느 단계까지 왔고, 다음이 뭔지"를 큰 그림에서 관리합니다.
> Day가 아닌 **Phase**로만 구분합니다 (실제 작업 소요일과 Phase 번호는 무관).
> 세부 규칙은 `SPEC.md`, 매 세션 작업 로그는 `CLAUDE.md`를 참고하세요.
> 각 Phase는 "완료 조건"을 충족해야 다음 Phase로 넘어갑니다.

> ⚠️ **운영 참고**: Supabase 무료 플랜 프로젝트는 **7일간 활동이 없으면 자동 일시정지**됩니다. 게임이 비동기로 여러 날에 걸쳐 이어지는 특성상, 개발 중이든 배포 후든 **최소 주 1회는 프로젝트에 접속**해서 일시정지를 방지해야 합니다.

> 🔄 **우선순위 변경 (v0.11)**: 배포(구 Phase 7)를 **최후순위로 이동**. 여러 세부 기능/룰 변경/채팅/UI를 먼저 완성한 뒤 마지막에 배포한다.

---

## 진행 현황 요약

| Phase | 이름 | 우선순위 | 상태 |
|---|---|---|---|
| 0 | 스펙 정의 | 🟢 핵심 | ✅ 완료 |
| 1 | 사진 업로드 | 🟢 핵심 | 🟡 진행 중 (이미지 압축만 남음) |
| 2 | 정답 등록 | 🟢 핵심 | ✅ 완료 |
| 3 | 사슬 조회 + Realtime 인프라 | 🟢 핵심 | ✅ 완료 |
| 4 | 맞히기 | 🟢 핵심 | ✅ 완료 |
| 5 | 다음 턴 연결 | 🟢 핵심 | ✅ 완료 |
| 5R | 턴 제출 통합 재작업 | 🟢 핵심 | ✅ 완료 |
| 6 | 신고/무효 처리 (실시간 즉석 동의) | 🟢 핵심 | 🟡 진행 중 (6-A/6-B 완료) |
| 7 | 룰 변경 — 오답 3회 제한 + 하트 UI | 🟢 핵심 | ⬜ 예정 |
| 8 | 게임 종료 + 재시작 (다시 플레이하기) | 🟢 핵심 | ⬜ 예정 |
| 9 | 방 관리 — 방 삭제 / 나가기 | 🟢 핵심 | ⬜ 예정 |
| 10 | 편의 기능 (엔터 제출 / 클립보드 붙여넣기) | 🟡 있으면 좋음 | ⬜ 예정 |
| 11 | 순수 채팅 (정답과 분리) | 🟡 있으면 좋음 | ⬜ 예정 |
| 12 | 상단 사진 사슬 UI (썸네일 스트립) | 🟡 있으면 좋음 | ⬜ 예정 |
| 13 | 점수/기록 + 비밀방 | 🟡 있으면 좋음 | ⬜ 예정 |
| 14 | 이미지 검색창 (검색 → 바로 업로드) | 🔴 여유되면 | ⬜ 예정 |
| 15 | 직접 그리기 캔버스 업로드 | 🔴 여유되면 | ⬜ 예정 |
| 16 | 초대 코드 + UI 다듬기 + README | 🔴 여유되면 | ⬜ 예정 |
| 17 | **배포 + 통합 테스트 (최후순위)** | 🟢 핵심 | ⬜ 예정 |

> Phase 3에 Realtime 인프라(Presence/Broadcast/Postgres Changes)가 추가됨 — 원래 채팅에서나 등장할 예정이었으나, Phase 6(신고)의 실시간 즉석 동의 방식이 이를 필요로 하여 앞당김.
> Phase 6(신고/투표)은 원래 최하위 우선순위였으나, "무한히 이어지는 게임이 품질 관리 없이 성립하지 않는다"는 기획 의도에 따라 승격함.
> 배포는 사용자 결정에 따라 모든 기능 완성 후 최후순위(Phase 17)로 이동함.
> 이미지 검색창(Phase 14)은 네이버 이미지 검색 성능 이슈로 하향 조정됨.

---

## Phase 0 — 스펙 정의 ✅ 완료

코드 변경 없음. 게임 규칙을 문서로 확정.

- [x] 턴 상태 머신 정의 (`OPEN` / `SOLVED` / `INVALID`)
- [x] 끝말 판정 규칙 (끝 글자 추출, 두음법칙 여부)
- [x] 맞히기 비교 규칙 (정규화, 공백, 대소문자)
- [x] 정답 노출(스포일러 방지) 규칙
- [x] 동시성 안전장치 원칙
- [x] 신고/무효 처리 규칙 확정 (실시간 즉석 동의 방식)
- [x] Realtime 기술 검증 (Presence/Broadcast가 이 설계에 적합함을 확인)

**산출물**: `SPEC.md`

---

## Phase 1 — 사진 업로드 (진행 중 — 이미지 압축만 남음)

- [x] Supabase Storage 버킷 생성 + 정책(RLS) 설정 — `turn-photos` 버킷(private), 인증 유저 INSERT/SELECT 정책. anon 업로드·다운로드 차단, `/object/public/` 우회 경로 없음까지 검증 완료
- [x] 업로드 UI (`TurnUploadForm.jsx`)
- [ ] **업로드 전 클라이언트에서 이미지 리사이즈/압축** (가로 1200px 내외, browser-image-compression) — 유일하게 남은 항목
- [x] `turns` 테이블에 사진 경로 기록 — `photo_url`에 버킷 내부 경로 저장, 표시 시마다 `createSignedUrl(s)`로 변환(유효기간 3600초)
- [x] 첫 턴/후속 턴 구분 — Phase 5R에서 `submit_turn`이 서버에서 turn_number를 계산하며 해결됨

**완료 조건**: 방에 사진을 올릴 수 있다, 업로드 전 압축이 적용된다.
**남은 것**: 이미지 압축만. (첫 턴/후속 턴 구분은 5R로 해결)

---

## Phase 2 — 정답 등록 ✅ 완료

- [x] 사진 하나에 정답 여러 개 입력하는 UI — 입력 필드 배열(`+`/`-`로 증감, 최소 1개 유지)
- [x] `answers` 테이블 저장 (SPEC.md 2절 "정답 등록 제약" 적용)
- [x] 정답 최소 1개 이상 등록 강제
- [x] 한글 음절로 끝나지 않는 정답 등록 차단 — `/[가-힣]$/`로 마지막 글자 검증
- [x] 동일 사진 내 중복 정답 문자열 차단

**완료 조건**: 사진 + 정답 여러 개를 한 세트로 등록할 수 있다. → 충족.
**참고**: 등록 순서상 첫 번째 정답이 "대표 정답"이 됨 (SPEC.md v0.8 2절). 현재는 배열 순서로 이미 보존되고 있으나, Phase 8(게임 종료/재시작)에서 이 순서에 의존하므로 유지 필요.

---

## Phase 3 — 사슬 조회 + Realtime 인프라 ✅ 완료

- [x] `room_feed` 뷰 활용해 방 안 사진들을 시간순 표시 (3-A)
- [x] RLS/쿼리 단에서 미공개 정답 차단 확인 (3-A)
- [x] `SOLVED` 턴은 채택된 정답만 노출, 나머지 후보는 비공개 유지 (3-A)
- [x] Supabase Realtime 채널 설정 — Postgres Changes 구독 (3-B), `room-${roomId}` 채널
- [x] Presence 트래킹 도입 (3-C) — `room-${roomId}-presence` 채널
- [x] Broadcast 채널 구성 (3-D) — `room-${roomId}-broadcast` 채널, `report_test` 골격
- [x] 탭 전환(visibilitychange) 시 Presence 재추적 방어 코드 (3-C)

**완료 조건 충족**: 방에 들어가면 사슬이 순서대로 보이고, 안 풀린 턴의 정답은 노출되지 않으며, 새 사진이 새로고침 없이 반영된다.
**점검 포인트**: Realtime을 쓰려면 대상 테이블이 `supabase_realtime` publication에 켜져 있어야 함 — `turns`는 `alter publication supabase_realtime add table turns;`로 추가함.

---

## Phase 4 — 맞히기 ⭐ 게임의 심장 ✅ 완료

- [x] 두음법칙 최종 결정 (SPEC.md v0.5, "적용함")
- [x] 답 입력 UI → SPEC.md 3절 비교 규칙으로 정답 목록과 대조
- [x] 통과 시 `matched_answer_id` 기록
- [x] `OPEN → SOLVED` 전이를 원자적으로 처리
- [x] 모든 시도 기록 (`turn_attempts`)

**완료 조건 충족**: 정답을 맞히면 통과 처리되고, 다음 시작 글자가 확정되어 나온다.
**참고**: 이 시점의 `submit_guess`/`GuessForm.jsx`는 Phase 5R에서 통합 폼으로 대체됨.

---

## Phase 5 — 정답 연결 + 다음 턴 생성 (순번제 통합) ✅ 완료 → ⚠️ 5R로 재작업됨

- [x] `submit_turn(p_room_id, p_photo_path, p_answers)` RPC 신설
- [x] `compute_start_chars`로 두음법칙 함수 재사용
- [x] `turns`에 `unique(room_id, turn_number)` 제약 추가
- [x] `get_allowed_start_chars` / `is_last_turn_solver` RPC

**⚠️ 사후 발견 문제**: Phase 5에서 `GuessForm.jsx`(맞히기 UI)를 삭제하면서 "이전 사진을 추측하는 입력 수단" 자체가 사라짐. `submit_turn`은 추측 파라미터 없이 "이미 SOLVED된 상태"를 전제로 동작하는데, 그 SOLVED를 만들어줄 호출부가 없어져 턴 1 이후 진행 불가. 또한 순번제(`room_members`/`get_turn_holder`)가 체크리스트엔 있었으나 실제로는 구현되지 않고 solver 기반으로 만들어져 있었음. → **Phase 5R로 전면 재작업.**

---

## Phase 5R — 턴 제출 통합 재작업 ✅ 완료

**문제 요약**: 추측 수단(GuessForm) 삭제로 게임이 진행 불가능했고, 순번제도 미구현 상태였음. SPEC.md 1-2절(원자적 통합) + 1-1절(고정 순번제)에 맞춰 재구현.

- [x] 5R-0: `room_members` 테이블(room_id, user_id, joined_at, 복합 PK) + RLS(본인 INSERT / 인증 SELECT, UPDATE·DELETE 없음) 신설
- [x] 5R-0: `get_turn_holder(p_room_id, p_turn_number)` — joined_at 오름차순 0-based 인덱싱 후 (turn_number-1) mod N 위치의 user_id 반환
- [x] 5R-A: `check_guess(p_room_id, p_guess)` RPC — 순번 검증 + 추측 대조(SPEC.md 3절) + turn_attempts 기록. 정답이어도 SOLVED 전이는 안 하고 결과+허용 시작 글자만 반환 (UX용 사전 검증)
- [x] 5R-B: `submit_turn` 시그니처를 `(p_room_id, p_guess, p_photo_path, p_answers)`로 개편 — 추측 재검증 → 직전 턴 SOLVED 전이 → 시작 글자 검증 → 새 턴/정답 insert를 단일 트랜잭션으로. 순번 판정을 solver 기반에서 `get_turn_holder` 고정 순번제로 교체
- [x] 5R-C: `RoomPage.jsx` 방 입장 시 `room_members` upsert(onConflict, ignoreDuplicates, joined_at 미갱신), `fetchTurns` 전에 완료. 폼 노출 조건을 `get_turn_holder` 기반으로 변경, realtime 콜백에서도 재계산
- [x] 5R-C: `TurnUploadForm.jsx` 2단계 폼 — 추측("확인"→check_guess) 통과 시에만 사진/정답 영역 활성화. Storage 업로드는 모든 검증 통과 후에만 수행(오답 시 고아 파일 방지)
- [x] 5R-C: `GuessForm.jsx` 삭제, `submit_guess`/`is_last_turn_solver`/`get_allowed_start_chars` 호출부 제거

**완료 조건 충족**: A(0번)가 사진을 올리면 B에게만 폼이 보이고, B가 맞혀야만 업로드 영역이 열리며, 시작 글자 규칙에 맞는 사진만 제출된다. 오답 시 Storage에 파일이 안 올라감. 제출 성공 후 폼이 C에게 넘어감. 사용자가 직접 플레이로 검증 완료.

---

## Phase 6 — 신고/무효 처리 (실시간 즉석 동의) 🟡 진행 중

> SPEC.md 5절 기준. "그 순간 접속자 전원의 10초 내 동의" 방식. 10초 판정은 서버 사이드 확정(v0.6).

- [x] **6-A: `reports` 테이블 보강** — `reported_user_id`/`status`/`required_voters`/`agreed_voters`/`expires_at` 컬럼 추가, 자기신고 CHECK 제약(`reported_by <> reported_user_id`), 턴당 pending 1건 부분 유니크 인덱스(`reports_one_pending_per_turn`), 구 `unique(turn_id, reported_by)` 제약 삭제(재시도 허용), 직접 INSERT 정책 제거(RPC 전용화)
- [x] **6-B: `start_report(p_turn_id, p_presence_snapshot)` RPC** — SOLVED 검증, 피신고자(turn_attempts의 solver) 조회, 자기신고 차단, 최소 인원 조건 재검증, 신고자 자동 동의 1표, expires_at = now()+10초. error_code: not_authenticated/turn_not_found/already_invalidated/not_solved/solver_not_found/cannot_report_self/not_enough_voters/report_already_pending
- [ ] 6-A/6-B 통합 검증 (5R 완료로 정상 게임 진행이 가능해졌으니 실제 신고 흐름으로 재검증)
- [ ] **6-C: `submit_report_vote(p_report_id)` / `resolve_report(p_report_id)` RPC** — 동의 제출(전원 동의 시 즉시 INVALID 전이) / 10초 경과 시 무산 처리. 지연 평가 방식(호출 시점 now()와 expires_at 비교), 별도 cron 불필요
- [ ] **6-D: 프론트 신고 UI** — "억지 신고" 버튼(최소 인원 미충족 시 비활성화), Broadcast(`room-${roomId}-broadcast` 재사용)로 전파, 10초 카운트다운 + "동의" 버튼, 신고자가 10초 뒤 resolve_report 호출
- [ ] **6-E: 무효 처리 후 분기** — `submit_turn`이 "마지막 턴"이 아니라 "마지막 유효 SOLVED 턴"(is_invalidated 건너뛰기) 기준으로 시작 글자를 계산하도록 수정
- [ ] **6-F: 다중 브라우저로 10초 타이머 실제 검증** (Presence 알려진 버그 대응 확인 포함)

**완료 조건**: 접속 중인 다른 참여자에게 신고가 실시간으로 뜨고, 10초 안에 전원 동의하면 즉시 무효 처리. 시간 내 전원 동의 실패 시 무산되고 재시도 가능.

**겪은 문제 & 해결 (6-A/6-B 진행 중)**:
- `turn_attempts_turn_id_fkey`에 `ON DELETE CASCADE`가 없어서 테스트 방 삭제 실패 → CASCADE로 재생성해 해결.
- `rooms` 삭제 시 Storage 사진 파일이 orphan으로 남는 문제 발견 → `turns` AFTER DELETE 트리거(`trg_delete_turn_photo`)로 `storage.objects`에서 대응 파일을 함께 삭제하도록 처리.

---

## Phase 7 — 룰 변경: 오답 3회 제한 + 하트 UI ⬜ 예정

> SPEC.md v0.8 1-3절 / 3절 기준.

- [ ] `check_guess` / `submit_turn`이 자기 턴 오답 횟수를 카운트하도록 수정 — `turn_attempts`에서 (현재 OPEN 턴, 본인, is_correct=false) 개수 집계
- [ ] 3회 소진 시 게임 종료 신호 반환 (별도 error_code 또는 game_over 플래그)
- [ ] 하트 UI — 남은 기회(3개) 시각화, 오답마다 하트 하나 사라지는 연출
- [ ] 게임 종료 상태를 DB에 기록할 방법 결정 (rooms에 status 컬럼 추가 등 — Phase 8과 함께 설계)

**완료 조건**: 자기 턴에서 3번 틀리면 더 이상 시도할 수 없고 게임 종료로 넘어간다. 하트가 화면에 보이고 오답마다 줄어든다.
**주의**: 하트 카운트는 각 사람의 각 턴마다 3개로 리셋 (누적 아님).

---

## Phase 8 — 게임 종료 + 재시작 (다시 플레이하기) ⬜ 예정

> SPEC.md v0.8 1-3절 기준. Phase 7과 밀접, 함께 설계 권장.

- [ ] `rooms`에 게임 상태 컬럼(예: `status`: playing/ended, `loser_id`, `revealed_answer_id` 등) 추가
- [ ] 게임 종료 시 못 맞힌 OPEN 턴의 **대표 정답(첫 번째 등록 정답) 공개** — 서버 사이드 통제(SPEC.md 4절 예외)
- [ ] 종료 화면 — 패배자/승리자 표시, 공개된 대표 정답 표시
- [ ] 방장에게만 "다시 플레이하기" 버튼 노출
- [ ] 재시작 RPC — 기존 사슬 유지, 패배자를 새 순번 0번으로 재배치, 공개된 대표 정답 끝 글자를 다음 시작 글자로 세팅
  - 순번 재배치 방법 결정: `room_members.joined_at`을 건드리지 않고 "패배자 오프셋"을 따로 저장할지, 아니면 재정렬용 별도 컬럼을 둘지 설계 필요
- [ ] 재시작 후 첫 제출이 대표 정답 끝 글자 규칙을 따르는지 검증

**완료 조건**: 오답 3회로 게임이 끝나면 대표 정답이 공개되고 패배자가 표시된다. 방장이 다시 플레이하기를 누르면 기존 사슬이 유지된 채 패배자부터, 공개된 정답 끝 글자로 이어서 게임이 재개된다.

---

## Phase 9 — 방 관리: 방 삭제 / 나가기 ⬜ 예정

> SPEC.md v0.8 6절 기준.

- [ ] 방장에게만 "방 삭제" 버튼 노출 (`rooms.created_by === 본인`)
- [ ] 방 삭제 시 `rooms` DELETE — CASCADE로 turns/answers/turn_attempts/reports/room_members 정리, Storage 사진은 trg_delete_turn_photo 트리거로 함께 삭제(Phase 6에서 이미 구축)
- [ ] 참여자 "나가기" 버튼 — 방에서 나가되 `room_members` joined_at 기록은 보존(순번 유지)
- [ ] 삭제/나가기 모두 명시적 버튼으로만 (Presence 이탈을 나감으로 간주하지 않음)
- [ ] 방이 삭제되면 그 방에 있던 다른 접속자를 로비로 안내 (realtime으로 rooms DELETE 감지 또는 조회 실패 시 리다이렉트)

**완료 조건**: 방장이 방을 삭제하면 방과 사진이 모두 정리되고 참여자는 로비로 돌아간다. 참여자는 나가기로 방을 떠날 수 있고, 다시 들어와도 순번이 유지된다.

---

## Phase 10 — 편의 기능 (엔터 제출 / 클립보드 붙여넣기) 🟡 있으면 좋음

- [ ] 정답(추측) 입력 후 **Enter 누르면 "확인"이 자동 제출**되도록 (check_guess 트리거)
- [ ] 사진 업로드 시 **Ctrl+V로 클립보드 이미지 붙여넣기** 지원 — paste 이벤트에서 이미지 blob 추출해 파일 선택과 동일하게 처리

**완료 조건**: 추측 입력 후 엔터로 바로 확인되고, 클립보드의 이미지를 Ctrl+V로 붙여 업로드할 수 있다.

---

## Phase 11 — 순수 채팅 (정답과 분리) 🟡 있으면 좋음

- [ ] `messages` 테이블 연동 — **정답/추측과 완전히 분리된 순수 잡담 채팅만**
- [ ] Phase 3에서 구축한 Realtime 채널 재사용 (신규 인프라 불필요)
- [ ] 채팅 UI — 방 화면에 사진 사슬과 별도 영역으로 표시(사슬에 섞지 않음)

**완료 조건**: 방 안에서 실시간 채팅을 주고받을 수 있고, 채팅은 게임 정답 흐름과 분리되어 있다.
**주의**: 초기 설계엔 room_feed에 채팅+사진턴을 시간순 통합하는 안도 있었으나, 사용자 결정으로 **정답과 분리된 순수 채팅**으로 확정.

---

## Phase 12 — 상단 사진 사슬 UI (썸네일 스트립) 🟡 있으면 좋음

- [ ] 게임 창 상단에 지금까지의 사진 끝말잇기 체인을 **가로 썸네일 스트립**으로 표시
- [ ] 각 썸네일 클릭 시 확대/정답 표시(SOLVED된 것만)
- [ ] 레퍼런스 이미지가 필요하면 사용자에게 요청 (없으면 가로 스크롤 썸네일 + 확대 패턴으로 시안 제작)

**완료 조건**: 방 상단에서 지금까지 이어진 사진 사슬을 한눈에 훑어볼 수 있다.

---

## Phase 13 — 점수/기록 + 비밀방 🟡 있으면 좋음

- [ ] 계정별 기록 표시 (턴 집계, 승/패 집계 — Phase 8 승패 결과 활용)
- [ ] 비밀방 (비밀번호 입장 + 초대 코드로 우회)

**완료 조건**: 사용자가 자기 기록을 볼 수 있고, 비밀방 생성/입장이 정상 동작한다.

---

## Phase 14 — 이미지 검색창 (검색 → 바로 업로드) 🔴 여유되면

> 하향 조정됨 — 네이버 이미지 검색 API 성능이 기대에 못 미친다는 판단. 핵심 루프에 영향 없음.

- [ ] Supabase Edge Function (네이버 API 키 숨김 중계)
- [ ] 검색창 컴포넌트 (끝말 시작 강제, 이미지 격자)
- [ ] **검색 결과에서 바로 업로드** — 검색된 이미지를 클릭하면 그 이미지를 그대로 턴 사진으로 업로드
- [ ] (검토) 네이버 API 대체/보완 옵션 필요 여부 재논의

**완료 조건**: 검색창으로 이미지를 찾아 클릭 한 번으로 턴에 업로드할 수 있다.

---

## Phase 15 — 직접 그리기 캔버스 업로드 🔴 여유되면

- [ ] 방 안에서 간단한 그리기 캔버스 제공 (브러시/색상/지우개 정도)
- [ ] 그린 그림을 이미지로 변환(canvas → blob)해 턴 사진으로 업로드
- [ ] 기존 Storage 업로드 경로 재사용(파일명 생성 로직 등)

**완료 조건**: 사진을 올리는 대신 직접 그린 그림으로 턴을 이어갈 수 있다.

---

## Phase 16 — 마무리 (초대 코드 + UI 다듬기 + README) 🔴 여유되면

- [ ] 초대 코드 입장 (Phase 13 비밀방과 연동)
- [ ] UI 전반 다듬기
- [ ] README 작성 (개발 과정, 기술 선택 이유, 겪은 난제 — 수업 요구사항)
- [ ] 미뤄둔 재검토 항목 최종 판단 (turns INSERT RLS 우회, 신고 쿨다운, 순번제 1명 방 한계 등 — SPEC.md 7절)

---

## Phase 17 — 배포 + 통합 테스트 (최후순위) ⬜ 예정

> 사용자 결정에 따라 모든 기능 완성 후 마지막에 배포.

- [ ] Vercel 배포
- [ ] 배포 환경에서 Supabase 연결 확인 (`.env` 환경변수 별도 설정)
- [ ] 배포된 URL에서 실제로 게임 한 판 처음부터 끝까지 테스트 (신고/무효/게임종료/재시작 포함)

**완료 조건**: 배포된 URL에서 다른 계정 두 개 이상으로 실제 게임이 정상 진행된다 (전 기능 포함).

---

## 문서 간 관계

```
SPEC.md    ← "이 기능이 정확히 어떻게 동작해야 하는가" (규칙, 거의 불변)
PHASES.md  ← "지금 이 문서" 무엇을 어떤 순서로 만들지 (로드맵, 진행률)
CLAUDE.md  ← 매 세션 "뭘 했고 뭐가 남았는지" (로그, 과거형)
```

새 세션 시작 시 클로드 코드에게: 지금 작업 중인 Phase에 해당하는 부분만 발췌해서 `CLAUDE.md` + `SPEC.md`와 함께 보여주면 충분합니다 (PHASES.md 전체를 매번 보여줄 필요는 없음 — 진행 현황 요약표만 봐도 큰 그림 파악 가능).

## 변경 이력

- v0.1 — Phase 0~6 초안 작성 (Day 기준 혼용).
- v0.2 — Day 구분 제거, Phase 단일 축으로 재구성. 진행 현황 요약표 추가. 신고/투표 배포 전으로 승격, 검색창 하향 조정.
- v0.3 — Phase 1에 업로드 전 이미지 압축 추가. Phase 3에 Realtime 인프라 선행 작업 반영. Phase 6 체크리스트 재작성. 무료 플랜 7일 자동 일시정지 참고 추가.
- v0.4 — Phase 1 진행 반영, Phase 2 완료 처리.
- v0.5 — Phase 3-A/3-B 완료 반영.
- v0.6 — Phase 3-C 완료 반영.
- v0.7 — Phase 3-D 완료, Phase 3 전체 완료 처리.
- v0.8 — Phase 4 완료 반영, 두음법칙 최종 결정 반영.
- v0.9 — Phase 5 완료 반영, turns INSERT RLS 우회 이슈 기록.
- v0.10 — Phase 5R(턴 제출 통합 재작업) 신설 및 완료 반영. GuessForm 삭제로 게임 진행이 불가능했던 문제 기록, 추측+업로드 통합 방식으로 재구현. `room_members`/`get_turn_holder`/`check_guess` 신설, `submit_turn` 4파라미터로 개편. Phase 6-A/6-B 완료 반영.
- v0.11 — 배포를 최후순위(Phase 17)로 이동. 새 기능/룰 변경을 Phase 7~16으로 편성: 오답 3회 제한+하트(7), 게임 종료+재시작(8), 방 관리(9), 편의기능 엔터/클립보드(10), 순수 채팅(11), 상단 사슬 UI(12), 점수·비밀방(13), 이미지 검색창(14), 그리기 캔버스(15), 마무리(16). SPEC.md v0.8(하트/게임종료/대표정답/방관리) 반영. orphan 파일 삭제 트리거 기록.