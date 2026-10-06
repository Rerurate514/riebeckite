---
publish: true
---

# 플러그인

Riebeckite의 힘은 플러그인 생태계에 있습니다 — Markdown·렌더링·검색·SEO 등을 확장하는 50개 이상의 패키지. 아래는 기능별로 대표적인 예를 소개하며, 각 항목은 전체 README로 연결됩니다.

## 플러그인 추가

패키지를 설치합니다:

```sh
npm install @riebeckite/plugin-mermaid
```

`riebeckite.config.ts`의 `plugins` 배열에 등록합니다:

```ts
import { defineConfig } from "@riebeckite/core";
import { l10n } from "@riebeckite/plugin-l10n";
import { mermaid } from "@riebeckite/plugin-mermaid";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";

export default defineConfig({
  // ...
  plugins: [obsidianMarkdown(), l10n({ ... }), mermaid()],
});
```

전체 플러그인 목록은 저장소에 있습니다:

[GitHub의 Riebeckite 플러그인](https://github.com/Rerurate514/riebeckite/tree/main/packages/plugins)

## 마크다운과 노트

Obsidian 볼트에 맞춘 일상 노트 기능.

| 플러그인 | 기능 |
| --- | --- |
| [`@riebeckite/plugin-obsidian-markdown`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/obsidian-markdown/README.md) | Obsidian 스타일 마크다운: 위키링크, 임베드, 콜아웃, 태그. |
| [`@riebeckite/plugin-attachment`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/attachment/README.md) | 위키링크로 첨부 파일을 렌더링하고 자산을 임베드. |
| [`@riebeckite/plugin-media`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/media/README.md) | 일반 링크에서 오디오·비디오 임베드. |

## 다이어그램과 프레젠테이션

fenced 코드 블록을 다이어그램·차트·슬라이드로 전환.

| 플러그인 | 기능 |
| --- | --- |
| [`@riebeckite/plugin-mermaid`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/mermaid/README.md) | fenced 코드 블록에서 Mermaid 다이어그램 렌더링. |
| [`@riebeckite/plugin-graphviz`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/graphviz/README.md) | DOT / Graphviz 다이어그램. |
| [`@riebeckite/plugin-d2`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/d2/README.md) | D2 언어 다이어그램. |
| [`@riebeckite/plugin-excalidraw`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/excalidraw/README.md) | Excalidraw 스케치 파일 렌더링. |
| [`@riebeckite/plugin-gallery`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/gallery/README.md) | 테마·프로젝트 소개용 카드 그리드. |

## 코드와 읽기 경험

더 나은 코드 블록과 편안한 읽기 경험.

| 플러그인 | 기능 |
| --- | --- |
| [`@riebeckite/plugin-code-enhance`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-enhance/README.md) | 구문 강조, 줄 번호, 코드 도구 모음. |
| [`@riebeckite/plugin-code-tabs`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/code-tabs/README.md) | 접근성 있는 탭식 코드 블록. |
| [`@riebeckite/plugin-toc`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/toc/README.md) | 스크롤을 따라가는 목차. |
| [`@riebeckite/plugin-backlinks`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/backlinks/README.md) | 현재 노트를 링크한 노트 목록. |

## 검색과 탐색

노트를 빠르게 찾고 이동하기.

| 플러그인 | 기능 |
| --- | --- |
| [`@riebeckite/plugin-search`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/search/README.md) | Ctrl+K 모달이 있는 클라이언트 전체 텍스트 검색. |
| [`@riebeckite/plugin-garden-explorer`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/garden-explorer/README.md) | 노트 그래프와 검색을 탐색하는 대화형 뷰. |
| [`@riebeckite/plugin-local-graph`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/local-graph/README.md) | 현재 노트 주변의 링크 그래프. |
| [`@riebeckite/plugin-permalink`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/permalink/README.md) | 안정적이고 설정 가능한 고유 주소. |

## 배포와 SEO

검색 엔진과 독자 모두가 이해하는 사이트를 배포.

| 플러그인 | 기능 |
| --- | --- |
| [`@riebeckite/plugin-seo`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/seo/README.md) | SEO 메타데이터·사이트맵·RSS/Atom/JSON 피드·robots.txt. |
| [`@riebeckite/plugin-l10n`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/l10n/README.md) | 로컬라이즈된 URL·언어 전환 UI·hreflang 메타데이터 — 이 사이트가 동작하는 기반입니다. |
| [`@riebeckite/plugin-rich-embed`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/rich-embed/README.md) | 외부 링크의 빌드 시점 리치 미디어 카드. |
| [`@riebeckite/plugin-deploy`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/deploy/README.md) | 호스팅 서비스용 정적 배포 산출물. |

## 콘텐츠와 개발자 경험

콘텐츠를 조회·정리하고 건강하게 유지.

| 플러그인 | 기능 |
| --- | --- |
| [`@riebeckite/plugin-dataview`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/dataview/README.md) | 노트에 대한 빌드 시점 조회. |
| [`@riebeckite/plugin-kanban`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/kanban/README.md) | Markdown 목록에서 Obsidian 스타일 칸반 보드 생성. |
| [`@riebeckite/plugin-responsive-image`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/responsive-image/README.md) | 지연 로딩 지원 반응형 이미지. |
| [`@riebeckite/plugin-quality`](https://github.com/Rerurate514/riebeckite/blob/main/packages/plugins/quality/README.md) | 정적 품질·접근성 검사. |


Riebeckite: [documentation](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.en.md) · [日本語ドキュメント](https://github.com/Rerurate514/riebeckite/blob/main/docs/README.md)

