# CLAUDE.md — 프로젝트 로그 & 개요

> 이 문서는 **매 세션 진행 상황 로그**입니다.
> 게임 규칙(불변)은 `SPEC.md`, 개발 순서/로드맵은 `PHASES.md`를 참고하세요.
> 셋을 같이 봐야 할 때: 새 세션 시작 시 세 문서를 함께 제공하면 컨텍스트가 바로 잡힙니다.

---

## 1. 게임 개요 (한 줄 요약)

사진으로 하는 끝말잇기. 올린 사람은 정답을 알고, 뒤에 오는 사람은 사진만 보고 추측해 잇는다.
비동기 다중 방 구조, 로그인 필요, 억지 끝말 신고로 무한 진행을 관리한다.

> 상세 규칙(정답 판정, 끝말 판정, 신고/무효 처리 등)은 전부 `SPEC.md`에 있음. 여기서는 중복 서술하지 않음.

---

## 2. 방(Room) 시스템 — 구조 요약

- **공개방**: 방 목록에 뜸, 아무나 입장
- **비밀방**: 방 목록엔 뜨되 입장 시 비밀번호 필요. 초대 코드가 있으면 비밀번호 생략 (Phase 9~11에서 구현 예정)

---

## 3. 로그인 — 구조 요약 (구현 완료)

- Supabase Auth 사용, 이메일 인증 절차 생략(Confirm email 끔)
- 로그인은 실제 이메일 + 비밀번호
- 닉네임(username)은 로그인 식별자와 분리 — 회원가입 시에만 입력, `profiles.username`에 저장(UNIQUE)
- `signUp` 호출 시 `options.data.username` → `raw_user_meta_data` → 트리거(`handle_new_user`)가 `profiles`에 `id`+`username` 삽입

---

## 4. 기술 스택

| 영역 | 도구 | 역할 |
|---|---|---|
| 프론트엔드 | React + Vite | UI, 화면, 상태 관리 |
| 개발 환경 | 로컬 컴퓨터 + Cursor | localhost로 미리보기하며 개발 |
| DB | Supabase (PostgreSQL) | 방·사진·정답·사슬·점수 저장, SQL 사용 |
| 사진 저장 | Supabase Storage | 이미지 파일 저장, URL만 DB에 기록. 무료 플랜 파일당 50MB 한도(넉넉함), 업로드 전 클라이언트 압축 예정(Phase 1) |
| 실시간 통신 | Supabase Realtime (Presence + Broadcast + Postgres Changes) | 사진/정답 실시간 갱신, 방 접속자 추적, 신고 즉석 동의(10초 타이머) 처리 — Phase 3에서 인프라 구축, Phase 6에서 신고 로직에 활용 |
| 외부 API 중계 | Supabase Edge Function (Deno) | 네이버 API 대신 호출 + 키 숨김 |
| 인증 | Supabase Auth | 로그인/가입 |
| 이미지 검색 | 네이버 이미지 검색 API | Phase 10(하향 조정)에서 다룸 — 성능 이슈로 후순위 |
| 배포 | Vercel | 프론트 배포, GitHub 연동 |
| 버전 관리 | GitHub | 코드 + README (수업 요구) |

### 키 숨김 구조
```
React(브라우저)  →  Supabase Edge Function(서버, 키 숨김)  →  네이버 API
     검색어 전송              숨긴 키로 호출                    이미지 결과
```
브라우저는 네이버 키를 만지지 않음. 키는 Supabase Secrets에만 보관.

### 운영 주의사항
- **Supabase 무료 플랜은 7일간 활동이 없으면 프로젝트가 자동 일시정지된다.** 게임이 비동기로 여러 날에 걸쳐 이어지는 특성상, 개발 중·배포 후 모두 최소 주 1회는 프로젝트에 접속해야 함.
- Realtime 무료 플랜: 동시 접속 200명, 메시지당 256KB — 신고 알림 등 텍스트 신호에는 충분(사진 파일과는 무관, 사진은 Storage로 별도 전송됨).
- Realtime Presence에 최근 프로덕션 환경 한정 이벤트 미수신 버그 사례 보고됨 — 탭 전환 시 재추적(re-track) 방어 코드 필요 (Phase 3에서 반영 예정).

---

## 5. 수업 요구사항 충족 매핑

| 요구사항 | 어떻게 충족 |
|---|---|
| 데이터 | Supabase에 방·정답·사슬·점수 저장 |
| SQL | Supabase = PostgreSQL, 실제 SQL 사용 |
| REST API | Supabase 자동 REST API + 네이버 API + Edge Function |
| 화면→API→저장→조회 | React 화면 → Supabase/Edge Function 호출 → DB 저장/조회 |
| AI 활용 설명 | 개발 도구로서 Cursor/Claude Code 활용 (게임 로직엔 AI 미사용, 그 이유도 설명거리) |
| 배포 | Vercel + Supabase (클라우드 상시 구동) |
| GitHub/README | GitHub 저장소 + 개발 과정 문서화 |

---

## 6. 진행 상황 로그

### Phase 도입 이전 — 환경 세팅 / 인증 / 방 시스템 (완료)

> 아래는 `PHASES.md` 체계를 도입하기 전에 완료한 작업입니다. Phase 0(스펙 정의)보다 시간상 먼저 이루어졌습니다.

**환경 세팅**
- [x] Node.js / npm 확인
- [x] React + Vite 프로젝트 생성 (`photo-word-chain`)
- [x] `npm run dev` 로컬 서버 구동 확인

**GitHub**
- [x] GitHub 저장소 생성 및 연결
- [x] 첫 커밋 + push 완료
- [x] `.env` (비밀 키) 가 GitHub에 안 올라가는 것 확인

**Supabase 초기 세팅**
- [x] Supabase 프로젝트 생성 (`photo-word-chain`, Tokyo 리전)
- [x] `@supabase/supabase-js` 설치, `.env` 등록, `supabaseClient.js` 작성
- [x] 테이블 6개(`profiles`, `rooms`, `turns`, `answers`, `messages`, `reports`) + `room_feed` 뷰 + `handle_new_user` 트리거 + RLS 기본 설정 완료
- [x] React ↔ Supabase 연결 테스트 완료 (RLS가 비로그인 요청 정상 차단 확인)

**로그인/가입**
- [x] 가입 화면 — 아이디 기반 → 이메일+비밀번호+닉네임 방식으로 변경 (배경: "닉네임은 자유롭게 바꿀 수 있어야 한다"는 요구로 구조 확정)
- [x] 로그인 화면 (이메일+비밀번호만), 세션 유지(`getSession`+`onAuthStateChange`), 로그아웃
- [x] 로그인/회원가입 탭 전환 UI (`Auth.jsx`, `mode` state)
- [x] 중복 가입 방지 검증 (이메일: Supabase Auth 자체 차단 / 닉네임: UNIQUE 제약, 트리거 실패 시 롤백 확인)

**겪은 문제 & 해결 (참고용)**
- `profiles.username` NOT NULL인데 트리거가 `id`만 넣어서 `Database error saving new user` 발생 → 트리거를 `raw_user_meta_data ->> 'username'` 읽도록 수정
- Confirm email 켜져 있어 반복 가입 테스트 시 `email rate limit exceeded` → 설정에서 끔

**방 시스템**
- [x] 방 만들기(공개방) — `RoomList.jsx`에 폼 추가, insert 후 목록 자동 갱신
- [x] 방 목록 화면
- [x] 방 입장 → 방 화면 이동 — `react-router-dom` 도입, `/`(로그인 전: Auth, 후: 로비) / `/room/:roomId`(RoomPage) 라우팅
- [x] 비로그인 상태로 `/room/:roomId` 직접 접근 시 `/`로 리다이렉트 확인
- [x] `RoomPage.jsx` — roomId로 방 정보 조회, 없으면 안내 후 목록으로 리다이렉트(현재는 안내 문구 없이 조용히 로비로 이동 — 콘솔 에러 없음, 기능상 문제 없음. UI 다듬기 단계(Phase 11)에서 개선 고려)
- [x] RLS 점검: 로그인 사용자는 `rooms`/`profiles` 조회 가능, 비로그인은 빈 배열로 차단됨을 확인

---

### Phase 0 — 스펙 정의 ✅ 완료

- [x] `SPEC.md` v0.1 작성 — 턴 상태 머신, 끝말 판정, 맞히기 비교 규칙, 정답 노출 규칙, 동시성 원칙
- [x] `PHASES.md` v0.1~0.2 작성 — Day 기준 → Phase 기준으로 재구성, 진행 현황 요약표 추가
- [x] 신고/투표 기능 우선순위 재검토 — Phase 6(배포 이전)으로 승격
- [x] 검색창 우선순위 재검토 — Phase 10(하향)으로 조정, 네이버 API 성능 이슈가 사유
- [x] `SPEC.md` v0.2 — 신고 규칙 최초 설계: 누적 참여자 만장일치제(활동 기반 참여자 정의, 스냅샷 고정, 최소 2명 조건)
- [x] "재접속 가능해야 함(오늘 끝나도 내일 이어서)" 요구사항 논의 → DB 기반 아키텍처로 이미 구조적으로 보장됨을 확인. 다만 이 특성이 만장일치제의 "참여자 계속 증가" 문제와 충돌함을 발견
- [x] `SPEC.md` v0.3 — 신고 규칙 재설계: 누적 참여자 만장일치제 폐기 → **실시간 접속자 즉석 동의(10초 타이머)** 방식으로 전환. Presence로 접속자 스냅샷, Broadcast로 신고 전파, 최소 인원 조건(신고자+피신고자 제외 0명이면 불가) 재정의
- [x] Supabase Realtime 기술 검증 — Presence/Broadcast가 멀티플레이어 게임 동기화에 공식 지원되는 사례임을 확인, 무료 플랜 한도(동시 접속 200, 메시지당 256KB)가 이 설계에 충분함을 확인. Presence 알려진 버그(탭 전환 시 이벤트 미수신) 발견, 방어 코드 필요성 기록
- [x] Storage/Realtime 용량 한도 혼동 해소 — 256KB는 Realtime 텍스트 메시지 한도이며 사진 파일과 무관, 실제 사진에 적용되는 한도는 Storage 파일당 50MB(무료 플랜)임을 확인
- [x] `SPEC.md` v0.4 — 5절에 기술 검증 결과 및 Presence 방어 코드 권장사항 반영
- [x] `PHASES.md` v0.3 — Phase 1에 업로드 전 이미지 압축 추가, Phase 3을 "사슬 조회 + Realtime 인프라"로 확장(Presence/Broadcast/Postgres Changes 선행 구축), Phase 6을 새 신고 방식에 맞게 체크리스트 전면 재작성, 무료 플랜 7일 자동 일시정지 운영 참고 추가

**다음 세션에서 할 일**: 세 문서(`SPEC.md` v0.4, `PHASES.md` v0.3, `CLAUDE.md`) 모두 최신 상태. 다음 실제 코드 작업은 **Phase 1(사진 업로드)** 착수.

---

### Phase 1 — 사진 업로드 (진행 중)

- [x] Supabase Storage 버킷(`turn-photos`, private) 생성 + RLS 정책(INSERT/SELECT, 인증 유저 전용) 설정
- [x] Storage RLS 검증 — anon 업로드 차단, anon 다운로드 차단(`404 Bucket not found`로 존재 자체를 숨김), `/object/public/` 우회 경로도 막혀 있어 버킷이 실수로 public 처리되지 않았음을 확인. 인증 유저는 업로드→다운로드 정상 동작
- [x] `turns` 테이블 RLS 점검 — 인증 유저 SELECT/INSERT 정상 동작 확인 (검증용 더미 행은 삭제해 정리함)
- [x] `RoomPage.jsx` — 같은 `room_id`의 `turns`를 `turn_number` 오름차순 조회, 없으면 안내 문구만 표시
- [x] 업로드 UI (`TurnUploadForm.jsx` 신규) — 사진 파일 선택 + 미리보기(`URL.createObjectURL`), turns 없을 때만 표시
- [x] 압축 없는 기본 업로드 흐름 완성 — `turn-photos`에 업로드 → `turns` insert(`room_id`/`posted_by`/`photo_url`/`turn_number: 1`) → 업로드 성공 시 목록 재조회로 폼이 자동으로 사라지고 사진이 보임
- [x] `photo_url`은 서명 URL이 아니라 **버킷 내부 경로**로 저장하기로 결정(서명 URL은 만료되므로) — 목록 표시 시마다 `createSignedUrls(paths, 3600)`으로 일괄 변환해서 사용
- [ ] 클라이언트 이미지 압축은 아직 미착수
- [ ] 첫 턴/후속 턴 구분 검증은 아직 미착수 — 지금은 `turn_number`가 항상 `1`인 첫 턴 전용 흐름만 있음

**겪은 문제 & 해결**
- 업로드 경로에 원본 파일명을 그대로 써서 한글 파일명(예: "따봉두.jpg")일 때 Storage가 400(InvalidKey)을 반환 → 원본 파일명을 버리고 확장자만 추출(`/\.([a-zA-Z0-9]+)$/`, 실패 시 `jpg`)해서 `${timestamp}_${랜덤6자}.${ext}` 형태로 새로 생성하도록 수정

**다음 세션에서 할 일**: 클라이언트 이미지 압축, 첫 턴/후속 턴 시작 글자 구분 검증. (정답 등록·저장은 Phase 2에서 이미 완료됨 — 아래 참고)

---

### Phase 2 — 정답 등록 ✅ 완료

- [x] 사진 하나에 정답 여러 개 입력하는 UI (`TurnUploadForm.jsx` 내, `+`/`-`로 필드 증감, 최소 1개 유지)
- [x] 정답 유효성 검사 — trim 후 빈 값은 검증 제외(필드는 유지) → 유효 값 0개면 "정답을 1개 이상 입력해주세요" → 마지막 글자가 완성형 한글(`/[가-힣]$/`)이 아니면 "한글 음절로 끝나야 합니다" → trim 값 기준 중복이면 "중복된 정답입니다". 값 수정 시 해당 필드 에러는 즉시 사라짐
- [x] `answers` 테이블 저장 — `turns` insert에 `.select().single()`을 붙여 받은 `turn.id`로 `turn_id`/`answer_text`(trim 원본)/`last_char`(`slice(-1)`)를 배열로 한 번에 insert
- [x] 실패 처리 — Storage 업로드·turns insert 실패는 "사진 업로드에 실패했습니다. 다시 시도해주세요.", answers insert 실패는 "정답 저장에 실패했습니다."로 구분 표시. 둘 다 자동 롤백은 하지 않음(이미 만들어진 turns 행/Storage 파일은 그대로 둠, MVP 스코프)

**완료 조건 충족**: 사진 + 정답 여러 개를 한 세트로 등록할 수 있다.

---

### Phase 3 — 사슬 조회 + Realtime 인프라 ✅ 완료

**3-A — 사슬 조회 UI**
- [x] `RoomPage.jsx`의 turns 직접 조회를 `room_feed` 뷰 기반으로 교체 — `event_type='photo_turn'`만 필터링, `created_at` 오름차순 조회 (컬럼 구성: `id`/`room_id`/`event_type`/`actor_id`/`created_at`/`text`/`photo_url` — SQL Editor로 직접 확인 후 반영)
- [x] `room_feed`에는 없는 `turn_number`/`matched_answer_id`/`is_invalidated`는 `turns` 테이블에서 해당 id들로 별도 조회해 병합
- [x] `matched_answer_id`가 있는 턴만 `answers`에서 그 1건을 조회해 "정답: ○○" 표시 (RLS가 이미 OPEN 턴은 걸러줌 — 프론트의 조건부 렌더링은 이중 안전장치)
- [x] `is_invalidated=true`인 턴에 "무효 처리됨" 뱃지 표시 (재분기 로직은 Phase 6에서)
- [x] `turns.length === 0`일 때만 업로드 폼을 보여주는 기존 로직은 그대로 유지 (Phase 5에서 다룰 부분이라 이번엔 건드리지 않음)

**3-B — Postgres Changes로 실시간 반영**
- [x] `room-${roomId}` 채널에 `turns` 테이블 INSERT/UPDATE를 `room_id=eq.${roomId}` 필터로 구독
- [x] INSERT: 이미 목록에 있는 turn.id면 무시(중복 방지), 아니면 상태 배열에 추가하고 그 자리에서 `createSignedUrl`로 서명 URL 발급
- [x] UPDATE: 전체 재조회 없이 해당 turn 객체의 `matched_answer_id`/`is_invalidated`만 갱신. `matched_answer_id`가 새로 채워졌고 아직 캐시에 없는 경우에만 그 정답 1건을 조회(캐시 여부 판단은 `answerTexts`를 매번 최신으로 미러링하는 ref로 처리 — setState 업데이터 안에서는 비동기 조회를 할 수 없어서)
- [x] 컴포넌트 unmount/roomId 변경 시 `supabase.removeChannel(channel)`로 정리하는 별도 useEffect로 분리 (사슬 조회용 useEffect와 독립)

**진행 순서 관련 메모**: 3-A 착수 시 `room_feed` 컬럼 구성을 몰라 한 세션 대기함 — 이 프로젝트가 스키마 파일을 따로 관리하지 않기로 한 방침(7절 참고) 때문에, SQL Editor 조회 결과를 받은 뒤 진행. 이후 3-B 요청이 3-A가 이미 끝났다는 전제로 들어와서, 실제로는 3-A가 비어 있던 상태를 먼저 알리고 사용자 확인을 받아 3-A→3-B 순서로 처리함.

**겪은 문제 & 해결 — Realtime이 새로고침해야만 반영됨**
- 3-B 코드 자체는 문제없었는데, Supabase는 테이블별로 Realtime publication을 켜줘야 postgres_changes 이벤트가 나가는데 `turns` 테이블이 기본적으로 꺼져 있었음
- SQL Editor에서 `alter publication supabase_realtime add table turns;` 실행해서 해결. (대시보드 UI가 개편되면서 "Database → Replication" 메뉴는 이제 Read Replica용 화면으로 바뀌어 있어 헷갈림 — Realtime publication 토글은 "Database → Publications"에 있음, SQL로 직접 켜는 게 더 빠름)

**3-C — Presence 트래킹**
- [x] Presence 전용 채널 `room-${roomId}-presence` 분리 생성 (3-B의 `room-${roomId}` 채널과는 독립적으로 관리)
- [x] `config: { presence: { key: user.id } }`로 채널 생성, `SUBSCRIBED` 콜백에서 `track({ user_id, username, online_at })` 호출 (username은 `profiles`에서 조회)
- [x] `presence` `sync` 이벤트에서 `presenceState()`로 접속자 전체 목록을 state에 반영, 방 상단에 "현재 접속자: A, B, C" 검증용 텍스트로 표시
- [x] `visibilitychange`가 `visible`로 바뀌는 순간 `track()` 재호출 (SPEC.md 5절의 known bug 대응)
- [x] unmount/roomId 변경 시 `untrack()` → `removeChannel()` → visibilitychange 리스너 제거까지 순서대로 정리, 3-B의 postgres_changes 채널 cleanup과 서로 안 겹치게 별도 useEffect로 분리

**3-D — Broadcast 채널 골격**
- [x] Presence(3-C)와 별도로 `room-${roomId}-broadcast` 채널 분리 생성 (Presence/postgres_changes/broadcast 세 채널을 각각 다른 이름으로 관리)
- [x] `report_test` 브로드캐스트 이벤트 리스너 등록, 수신 payload는 콘솔 로그만 (UI 반영 없음)
- [x] 임시 "Broadcast 테스트" 버튼 추가 — 클릭 시 `{ from: user.id, sent_at }`를 `report_test`로 송신. 코드에 `// TEMP: Phase 6에서 실제 "억지 신고" 버튼으로 교체 예정` 주석으로 명시
- [x] unmount/roomId 변경 시 채널 해제 — 3-C와 동일한 패턴(ref로 채널/유저 id 보관, cleanup에서 null 처리 + `removeChannel`)
- [ ] 실제 신고 판정/10초 타이머/동의 집계 로직은 아직 없음 — Phase 6에서 구현

**Phase 3 전체 완료**: 3-A(사슬 조회+정답 노출 제한) → 3-B(Postgres Changes) → 3-C(Presence) → 3-D(Broadcast 골격) 순서로 전부 완료. Phase 6 착수 시 이 세 채널(각각 `room-${roomId}`, `room-${roomId}-presence`, `room-${roomId}-broadcast`)에 실제 신고 로직만 붙이면 됨.

**다음 세션에서 할 일**: Phase 4(맞히기) 또는 Phase 1의 잔여 항목(이미지 압축, 첫 턴/후속 턴 구분 검증) 중 우선순위 선택 필요.

---

### Phase 4 — 맞히기 ✅ 완료

- [x] 두음법칙 최종 결정 — SPEC.md v0.5, "적용함"으로 확정 (초성 ㄹ/ㄴ + 중성 이/야/여/예/요/유 계열 조건, 유니코드 음절 분해 기반 구현)
- [x] `GuessForm.jsx` 신규 — 최신 턴이 `matched_answer_id === null`(OPEN)이고 로그인 유저가 그 턴의 `posted_by` 본인이 아닐 때만 렌더링 (서버도 막고 있지만 프론트에서 먼저 걸러 UX 개선)
- [x] 제출 시 `supabase.rpc('submit_guess', { p_turn_id, p_guess })` 호출 — Supabase 쪽에 이미 구현되어 있던 RPC를 그대로 사용, `answers` 테이블 직접 조회 코드는 추가하지 않음 (정답 텍스트는 클라이언트로 절대 안 옴)
- [x] 결과 처리 — `is_correct`면 "정답입니다!" + `next_start_chars`(1개면 그대로, 2개면 "A 또는 B"), `already_solved`면 "이미 다른 사람이 맞혔습니다" + 동일하게 다음 시작 글자 안내, 둘 다 false면 "오답입니다" + 입력창 유지(재시도 가능)
- [x] `matched_answer_id` 변경 감지는 Phase 3-B의 `postgres_changes` UPDATE 구독을 그대로 재사용 — 새 채널을 따로 만들지 않음. `turns` state의 `matchedAnswerId`가 채워지면 `GuessForm` 렌더링 조건이 자동으로 거짓이 되어 폼이 사라지고, 3-A의 "정답: ○○" 표시 로직이 그대로 이어받음(별도 콜백 연결 불필요)
- [x] `RoomPage.jsx`에 `postedBy`(room_feed의 `actor_id` / turns INSERT payload의 `posted_by`)와 `currentUserId`(마운트 시 1회 `getUser()`) 추가해서 렌더링 조건에 사용

**참고**: `next_start_chars`를 다음 턴 업로드 시 실제로 강제 검증하는 것은 Phase 5 범위 — 지금은 화면 안내만 되고 강제되진 않음.

**다음 세션에서 할 일**: Phase 5(다음 턴 연결 — 시작 글자 강제 검증), Phase 1 잔여 항목(이미지 압축, 첫 턴/후속 턴 구분).

---

### 로컬 점검 (Phase 1~4 전체) — 버그 발견 및 수정

Playwright로 회원가입 → 방 생성 → 방 입장 → 사진 업로드 → 새로고침까지 전 과정을 자동으로 돌려 점검함.

- [x] 로그인/회원가입 화면, Presence("현재 접속자" 표시), Broadcast 테스트 버튼, 사진 업로드(signed URL 이미지 정상 로드) 전부 정상 확인
- [x] **버그 발견 & 수정 — `App.jsx`의 세션 로딩 레이스**: `session` state가 초기값 `null`로 시작하는데 `/room/:roomId` 라우트가 `session ? <RoomPage/> : <Navigate to="/"/>`로 즉시 평가되어, `supabase.auth.getSession()`이 비동기로 응답 오기 전에 이미 로비로 리다이렉트됨. 로그인은 유효한데 **방 페이지에서 새로고침만 하면 로비로 튕겨나가는** 증상으로 나타남 (Phase 1 완료 조건 "새로고침해도 사진이 계속 잘 보인다"를 직접 깨뜨림). `sessionLoaded` state를 추가해 `getSession()`/`onAuthStateChange` 응답 전까지는 라우트 자체를 렌더링하지 않도록 수정. 수정 후 재검증: 새로고침해도 URL 유지, 이미지도 `naturalWidth`가 정상적으로 잡히며 로드됨
- 이 버그는 이번 세션(Phase 3/4)에서 만든 코드가 아니라 최초 인증 구현 시점(Phase 0 이전)부터 있던 것 — 그동안 개발 중 수동 테스트에서는 우연히 안 걸렸던 것으로 추정

---

### Phase 5 — 다음 턴 연결 ✅ 완료

- [x] **DB 리팩터링**: `submit_guess`에 인라인이 아니라 이미 `dueum_start_chars`라는 별도 함수로 두음법칙이 분리돼 있었음(예상과 달랐음) — 로직은 SPEC.md v0.5와 정확히 일치해서 새로 짤 필요 없이 `compute_start_chars`로 이름만 변경, `submit_guess`도 새 이름을 부르도록 갱신
- [x] **`submit_turn(p_room_id, p_photo_path, p_answers) returns jsonb` 신규** — 마지막 턴 조회 → 첫 턴이면 아무나 허용, 아니면 `is_invalidated`/`matched_answer_id is null`/solver 불일치를 순서대로 검사 → `compute_start_chars`로 허용 시작 글자 계산 → Phase 2 규칙(1개 이상/한글 음절/중복) 재검증 → 통과시 turns+answers insert. `pg_advisory_xact_lock(hashtext(room_id))`로 같은 방 동시 호출 직렬화
- [x] **`turns`에 `unique(room_id, turn_number)` 제약 추가** — 동시 업로드 레이스 최종 방어선
- [x] **`get_allowed_start_chars(p_room_id) returns text[]` 신규** — 마지막 턴이 SOLVED일 때만 허용 시작 글자 반환
- [x] **`is_last_turn_solver(p_room_id) returns boolean` 추가 (요청 범위 밖, 필요해서 만듦)** — `turn_attempts` RLS가 `auth.uid() = user_id`(본인 시도만 조회 가능)라서, 프론트에서 "내가 마지막 턴을 맞힌 사람인가"를 직접 쿼리로 판별할 방법이 없었음. 이게 없으면 "B에게만 업로드 폼이 보인다"는 완료 조건 자체를 못 만족시켜서 추가
- [x] `TurnUploadForm.jsx`: `turns.insert()`+`answers.insert()` 두 번 호출 → `submit_turn` 단일 RPC 호출로 교체. `error_code`별 메시지 매핑, `invalid_start_char`는 `allowedStartChars` prop으로 실제 글자 채워서 표시. `turn_number`를 더 이상 프론트가 안 넘기고 서버가 계산 — Phase 1에 남아있던 "첫 턴/후속 턴 구분 없음" 문제가 부수적으로 해결됨
- [x] `RoomPage.jsx`: `refreshUploadGate()` 추가(`get_allowed_start_chars`+`is_last_turn_solver` 병렬 호출), `fetchTurns`/`handleTurnInsert`/`handleTurnUpdate` 전부에서 호출되도록 연결해 realtime으로도 갱신됨. 업로드 폼 노출 조건을 `turns.length === 0`에서 `turns.length === 0 || isLastTurnSolver`로 변경, `isLastTurnSolver`일 때 "다음 시작 글자: O 또는 O" 힌트 표시

**겪은 문제 & 해결**
- SQL 실행 전 정보 부족으로 두 번 막힘: (1) `submit_guess` 실제 소스와 테이블 스키마를 몰라서 리팩터링을 못 짬 → `pg_get_functiondef`/`information_schema.columns`/`pg_constraint`/`pg_policies` 조회 결과를 받은 뒤 진행. (2) SQL을 준비해서 드렸는데 실제로는 실행이 안 된 상태로 "완료?"라는 질문을 받아 바로 Playwright로 돌려보니 `submit_turn` 자체가 없다는 PostgREST 404가 떠서 발견 — `pg_proc`/`pg_constraint` 조회로 실행 여부를 직접 확인하는 절차를 거친 뒤 재실행 요청, 이후 정상 확인
- 발견했지만 이번 스코프 밖이라 손 안 댄 것: `turns` 테이블 INSERT RLS가 `auth.uid() = posted_by`만 검사해서, `submit_turn`을 안 거치고 devtools로 직접 insert하면 턴 순서 검증을 우회할 수 있음. SPEC.md 1-1절의 "API 단에서 원자적으로 강제" 취지를 완전히 지키려면 이 RLS도 손봐야 함 — 사용자에게 알리고 보류

**완료 조건 검증**: 계정 3개(A 업로더/B 정답자/C 제3자)로 Playwright 자동화 — B에게만 폼 노출(A/C는 안 보임), 허용 안 된 시작 글자는 `invalid_start_char`로 차단(정확한 글자 안내 포함), 허용된 글자로는 성공, 사진1→사진2 사슬이 A 화면에도 새로고침 없이 이어짐. 콘솔 에러 없음.

**다음 세션에서 할 일**: Phase 6(신고/무효 처리) — 이제 실질적으로 핵심 게임 루프(Phase 1~5)는 전부 동작함. Phase 1 잔여 항목(이미지 압축)과 `turns` INSERT RLS 이슈는 여전히 미해결.

---

### Phase 5R — 턴 제출 통합 재작업 ✅ 완료

**배경 (Phase 6 착수 중 발견된 치명적 문제)**: Phase 5에서 `GuessForm.jsx`를 삭제하면서 "이전 사진을 추측하는 입력 수단" 자체가 사라졌음. `submit_turn`은 추측 파라미터 없이 "이미 SOLVED된 상태"를 전제로 동작하는데, 그 SOLVED를 만들어줄 `submit_guess` 호출부가 없어져 턴 1 이후 게임 진행이 불가능했음. 게다가 순번제(`room_members`/`get_turn_holder`)가 PHASES.md 체크리스트엔 있었으나 실제로는 구현되지 않고 "직전 solver가 다음 턴" 방식으로 만들어져 있었음(pg_proc 조회로 `room_members`/`get_turn_holder` 부재 확인). 사용자가 "고정 순번제(A→B→C 순환)"를 원한다고 확정하여 SPEC.md 1-1절 원안대로 재구축.

- [x] **5R-0**: `room_members` 테이블(room_id, user_id, joined_at, 복합 PK) + RLS 신설 — 본인 INSERT(`auth.uid() = user_id`) / 인증 유저 SELECT, UPDATE·DELETE 정책 없음(순번 조작 방지). `get_turn_holder(p_room_id, p_turn_number)` 함수 — joined_at 오름차순 0-based 인덱싱 후 (turn_number-1) mod N 위치의 user_id 반환
- [x] **5R-A**: `check_guess(p_room_id, p_guess) returns jsonb` — 순번 검증(get_turn_holder) + 자기 사진 금지 + 추측 대조(SPEC.md 3절: lower+trim+NFC) + turn_attempts 기록. 정답이어도 SOLVED 전이는 하지 않고 { correct, allowed_start_chars }만 반환(UX용 사전 검증)
- [x] **5R-B**: `submit_turn`을 DROP 후 `(p_room_id, p_guess, p_photo_path, p_answers)` 4파라미터로 재생성 — pg_advisory_xact_lock → 첫 턴(순번 0번만, 추측·시작글자 제한 없음) / 후속 턴(순번 검증 → 자기 사진 금지 → 추측 재검증 → 오답이면 turn_attempts만 남기고 wrong_guess 반환, 사진 미저장 → Phase 2 규칙 재검증 → 시작 글자 검증) → 모든 검증 통과 후에만 직전 턴 조건부 SOLVED UPDATE + 새 turns/answers insert. error_code: not_authenticated/not_your_turn/cannot_guess_own/turn_invalidated/already_solved/wrong_guess/no_answers/invalid_answer_ending/duplicate_answer/invalid_start_char
- [x] **5R-C (프론트, Claude Code)**: `RoomPage.jsx` 방 입장 시 `room_members` upsert(`onConflict: 'room_id,user_id', ignoreDuplicates: true`, joined_at 미전달) → fetchTurns 전에 await. `refreshUploadGate()`(구 is_last_turn_solver 기반) 제거하고 `get_turn_holder` 기반 `refreshTurnHolderForTurn`/`refreshTurnHolderFromTurnsList`로 교체, postgres_changes INSERT/UPDATE 콜백에서도 재계산(turnsRef 활용). 신규 state: turnHolderId/turnHolderUsername/memberCount. 폼 노출 = 내 차례일 때만, 아니면 "지금은 OOO님의 차례입니다", 멤버 1명이고 turns>0이면 "2명 이상 입장해야…" 안내
- [x] **5R-C**: `TurnUploadForm.jsx` — `isFirstTurn` prop으로 분기. 첫 턴은 추측 없이 사진+정답(p_guess=null). 후속 턴은 2단계: 추측 입력+"확인"→check_guess(오답 무제한 재시도, 정답이면 입력 잠금+allowed_start_chars 저장+사진/정답 영역 공개). 클라 검증(1개 이상/한글 음절/중복/시작 글자 1개 이상 매칭) 통과 후에만 Storage 업로드→submit_turn. 파일명 생성 로직(`${timestamp}_${랜덤6자}.${ext}`) 유지. 성공 시 폼 전체 초기화
- [x] **5R-C**: `GuessForm.jsx` 삭제, `submit_guess`/`is_last_turn_solver`/`get_allowed_start_chars` 호출부 전부 제거. eslint/`npm run build` 통과 확인

**겪은 문제 & 해결**:
- SQL로 직접 테스트가 안 되는 지점(RPC가 auth.uid() 참조) — 브라우저 콘솔에서 로그인 상태로 `supabase.rpc()` 호출해 검증하는 방식 사용
- `submit_turn` GRANT 문에서 파라미터 타입을 `(uuid, text, text[], text[])`로 잘못 적어 `function does not exist` 에러 → 실제 시그니처 `(uuid, text, text, text[])`로 수정
- 초기에 6-A/6-B 테스트 데이터를 만들 때 "맞히기"와 "SOLVED 전환"을 별개 단계로 흉내 냈다가, 실제 게임 흐름(추측→맞히면 사진 업로드가 한 번에)과 안 맞음을 사용자가 지적 → submit_guess/submit_turn 실제 정의를 다시 확인하고 문제(추측 UI 부재)를 발견한 계기가 됨

**완료 조건 검증**: 사용자가 직접 계정 여러 개로 플레이 — A(0번)가 사진 올리면 B에게만 폼, B가 맞혀야 업로드 영역 열림, 시작 글자 규칙 강제, 오답 시 Storage 파일 미생성, 성공 후 C로 폼 이동. "큰 기능들 모두 구현된 것 같다"로 확인.

---

### Phase 6 — 신고/무효 처리 (진행 중, 6-A/6-B 완료)

> SPEC.md 5절 기준. 10초 판정 주체 = **서버 사이드 확정**(SPEC.md v0.6). 별도 서버 프로세스/Edge Function 없이 Postgres 함수만으로 처리 — 판정 로직이 순수하게 now()와 expires_at 비교로만 이루어져 아무 때나 호출돼도 정확한 "지연 평가" 방식(cron 불필요).

**6-A — reports 테이블 보강 (SQL Editor 직접 실행)**
- [x] 기존 `reports`는 (id, turn_id, reported_by, created_at)뿐 + `unique(turn_id, reported_by)` 제약(구 만장일치제 잔재)이었음
- [x] 컬럼 추가: `reported_user_id`(→profiles FK), `status`(pending/invalidated/expired CHECK), `required_voters uuid[]`, `agreed_voters uuid[]`, `expires_at timestamptz`
- [x] `reports_no_self_report` CHECK 제약(`reported_by <> reported_user_id`) — 자기 신고 DB 단 금지
- [x] 구 `unique(turn_id, reported_by)` 제약 삭제(재시도 허용 위해), 대신 `reports_one_pending_per_turn` 부분 유니크 인덱스(`WHERE status='pending'`)로 "턴당 진행 중 신고 1건" 보장
- [x] 직접 INSERT 정책(`authenticated users can report`) 제거 → SECURITY DEFINER RPC 전용화. SELECT 정책만 유지

**6-B — start_report RPC (SQL Editor 직접 실행)**
- [x] `start_report(p_turn_id uuid, p_presence_snapshot uuid[]) returns jsonb` — turns FOR UPDATE 잠금 → SOLVED 검증(not_solved/already_invalidated) → turn_attempts에서 피신고자(solver) 조회 → 자기신고 차단(cannot_report_self) → 스냅샷에서 피신고자+신고자 제외한 required_voters 계산 → 최소 인원 재검증(not_enough_voters) → reports insert(agreed_voters=[신고자], expires_at=now()+10초). 중복 pending은 unique_violation 캐치해서 report_already_pending 반환
- [x] GRANT EXECUTE TO authenticated

**남은 것**: 6-A/6-B 통합 검증(5R 완료로 정상 진행 가능해진 뒤 수행), 6-C(submit_report_vote/resolve_report), 6-D(프론트 신고 UI), 6-E(무효 후 분기 — submit_turn이 마지막 유효 SOLVED 턴 기준으로 시작 글자 계산), 6-F(다중 브라우저 10초 타이머 검증).

**겪은 문제 & 해결**:
- `turn_attempts_turn_id_fkey`에 `ON DELETE CASCADE`가 없어 테스트 방 `DELETE FROM rooms`가 실패 → DROP 후 `ON DELETE CASCADE`로 재생성. (CLAUDE.md 원칙 "모든 FK에 CASCADE"에 맞춤)
- `rooms` 삭제 시 Storage `turn-photos` 버킷의 사진 파일이 orphan으로 남는 문제 발견 → `turns` AFTER DELETE 트리거 `trg_delete_turn_photo`(SECURITY DEFINER) 신설, `storage.objects`에서 `bucket_id='turn-photos' AND name=OLD.photo_url` 행을 함께 삭제. 이제 방 삭제 시 사진까지 CASCADE 정리됨

---

### 신규 규칙 확정 (SPEC.md v0.8 — Phase 7~9 대비)

사용자와 논의해 아래 규칙을 확정하고 SPEC.md에 반영함:
- **오답 3회 제한(하트)**: 각 사람의 각 턴마다 오답 3회, 소진 시 게임 종료. 하트는 턴마다 리셋(누적 아님)
- **게임 종료**: 3번 틀린 사람 패배 / 나머지 승리. 못 맞힌 OPEN 턴의 대표 정답 공개
- **대표/보조 정답**: 첫 번째 등록 정답 = 대표 정답(게임 종료 공개용 + 재시작 기준점). 정상 플레이 중 다음 시작 글자는 여전히 "맞힌 정답"의 끝 글자로 계산(변경 없음)
- **재시작(다시 플레이하기)**: 방장만 가능. 기존 사슬 유지, 패배자가 새 순번 0번이 되어 공개된 대표 정답 끝 글자부터 이어감
- **방 관리**: 방장만 "방 삭제" 버튼, 참여자는 "나가기" 버튼. 둘 다 명시적 버튼(Presence 이탈을 나감으로 간주 안 함). 나가도 room_members joined_at은 보존(순번 유지)
- **배포 최후순위 이동**: 모든 기능 완성 후 마지막에 배포(Phase 17)


## 7. 참고 — 지금 프로젝트에 있는 핵심 파일

```
photo-word-chain/
  ├─ .env                          ← Supabase URL/key (GitHub 비공개)
  ├─ docs/
  │   ├─ SPEC.md                   ← 게임 규칙 룰북 (v0.8)
  │   └─ PHASES.md                 ← 개발 로드맵 (v0.11, Phase 0~17)
  ├─ src/
  │   ├─ lib/supabaseClient.js     ← Supabase 연결 객체
  │   ├─ features/
  │   │   ├─ auth/Auth.jsx         ← 로그인/회원가입 탭 (이메일+비밀번호+닉네임)
  │   │   └─ rooms/
  │   │       ├─ RoomList.jsx      ← 방 목록 + 방 만들기 폼, 클릭 시 /room/:id로 이동
  │   │       ├─ RoomPage.jsx      ← 방 상세 화면 (room_feed 사슬 조회, Realtime 3채널, room_members upsert, get_turn_holder 기반 순번 폼 노출, TurnUploadForm 연결)
  │   │       └─ TurnUploadForm.jsx ← isFirstTurn 분기 2단계 폼(추측→check_guess→사진/정답), Storage 업로드+submit_turn RPC
  │   │       (GuessForm.jsx는 Phase 5R에서 삭제됨)
  │   └─ App.jsx                   ← 세션 관리 + react-router 라우팅(/, /room/:roomId)
  └─ (Supabase:
      테이블: profiles/rooms/turns/answers/messages/reports/turn_attempts/room_members + handle_new_user 트리거
      Storage: 버킷 `turn-photos`(private, RLS 적용), turns DELETE 시 사진 함께 삭제하는 trg_delete_turn_photo 트리거
      RPC: submit_turn(4파라미터)/check_guess/compute_start_chars/get_turn_holder/start_report
           (submit_guess/is_last_turn_solver/get_allowed_start_chars는 5R에서 호출부 제거됨, DB 함수는 잔존)
      (전부 SQL Editor로 직접 관리, 마이그레이션 파일 미보유))
```

커밋 이력: `initial setup` → `feat: 회원가입, 로그인 기능 추가` → `feat: 방 만들기 및 조회 기능 추가` → `docs: SPEC/PHASES/CLAUDE 문서 추가 및 Phase 1 Storage 설정 반영`

---

## 8. 다음 세션 시작할 때

`CLAUDE.md` + `SPEC.md` + `PHASES.md` 세 문서를 Cursor/Claude Code 새 대화에 먼저 보여주면 맥락이 바로 잡힙니다. 지금 작업 중인 Phase가 명확하면 `PHASES.md`는 진행 현황 요약표만 발췌해도 충분합니다. 스키마가 필요한 작업이면 관련 테이블만 SQL Editor에서 조회해 붙여넣어 주세요 (스키마 파일은 별도로 관리하지 않기로 함).

---

## 변경 이력

- Day 3 시점 — 원본 CLAUDE.md 작성 (게임 규칙 + 진행 로그 통합 서술)
- Phase 체계 도입 시점 — 게임 규칙 상세를 SPEC.md로 이관, 진행 로그를 Phase 기준으로 재정리, PHASES.md/SPEC.md 참조 구조 명시
- SPEC v0.4 반영 시점 — 신고 규칙 재설계(만장일치제 → 실시간 즉석 동의) 및 Realtime 기술 검증 과정을 로그에 기록, 기술 스택 표에 Realtime 항목과 운영 주의사항(7일 자동 일시정지, Storage/Realtime 용량 한도) 추가
- Phase 1 착수 시점 — `turn-photos` Storage 버킷 + RLS 설정 완료 및 검증 기록, `turns` 테이블 RLS 점검 결과 기록, 업로드 UI/압축은 다음 세션으로 이월. `docs/` 폴더가 이 시점 처음으로 git에 커밋됨
- Phase 1 진행 + Phase 2 완료 시점 — turns 조회/표시, 업로드 폼 UI, 정답 유효성 검사, Storage 업로드+turns insert(경로 기반 저장 + signed URL 변환), answers insert까지 구현. 한글 파일명으로 인한 Storage InvalidKey 버그 수정. Phase 1은 압축·턴 구분이 남아 진행 중, Phase 2는 완료 처리
- Phase 3-A/3-B 진행 시점 — `room_feed` 뷰 기반 사슬 조회로 전환, 정답 노출 제한 및 무효 뱃지 표시 추가(3-A), `turns` 테이블 Postgres Changes 구독으로 새 턴/상태 변경을 실시간 반영(3-B). Presence/Broadcast(3-C)는 남겨둠
- Phase 3-C 진행 시점 — Presence 전용 채널로 접속자 실시간 추적 + 탭 전환 방어 코드 추가. `turns` 테이블이 Realtime publication에서 기본적으로 꺼져 있어 새로고침해야만 반영되던 문제를 발견하고 해결. Broadcast(3-D)만 남음
- Phase 3-D 진행 시점 — Broadcast 전용 채널 골격 마련(`report_test` 이벤트로 송수신만 검증, 임시 테스트 버튼). Phase 3(3-A~3-D) 전체 완료 처리
- Phase 4 완료 시점 — 두음법칙 최종 결정(SPEC.md v0.5), `GuessForm.jsx`로 `submit_guess` RPC 호출 + 결과 표시 구현. Phase 3-B의 postgres_changes 구독을 재사용해 정답 확정을 반영, `answers` 직접 조회는 추가하지 않음
- Phase 5 완료 시점 — `submit_turn`/`get_allowed_start_chars`/`is_last_turn_solver` RPC 신설 + `compute_start_chars`로 두음법칙 함수 재사용(이름 정리) + `turns` unique 제약 추가. `TurnUploadForm.jsx`/`RoomPage.jsx`를 새 RPC에 맞게 갱신. 계정 3개로 완료 조건 실제 검증. `turns` INSERT RLS가 RPC 우회 가능한 상태로 남아있는 이슈 발견 및 보류 기록- Phase 5R + Phase 6(6-A/6-B) 진행 시점 — **게임이 진행 불가능했던 문제 발견 및 재작업**: GuessForm 삭제로 추측 수단이 사라지고 순번제가 미구현이었음을 발견, `room_members`/`get_turn_holder`/`check_guess` 신설 + `submit_turn` 4파라미터(추측 통합) 개편 + 프론트 2단계 폼으로 재구현(5R). 신고 기능 6-A(reports 스키마 보강)/6-B(start_report RPC) 완료. `turn_attempts` FK에 CASCADE 추가, `trg_delete_turn_photo` 트리거로 방 삭제 시 Storage 사진 orphan 방지. SPEC.md v0.8(하트/게임종료/대표정답/방관리)·PHASES.md v0.11(배포 최후순위, Phase 7~17 재편) 반영. 사용자가 새 기능 다수(오답3회+하트/게임종료+재시작/방관리/엔터·클립보드/순수채팅/상단사슬UI/이미지검색·캔버스) 확정