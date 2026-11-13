---
title: Media
---
# Media

## 音声と動画：[`media`](../media.ja.md)

音声と動画の添付ファイルは、ブラウザ標準のプレイヤーで再生できます。次の例は短い無音の WAV です。

### ソース

````md
![[media-example.wav]]
````

### 実行例

![[media-example.wav]]

## Attachments：[`attachment`](../attachment.ja.md)

通常の WikiLink はダウンロードリンクに、埋め込み WikiLink は添付カードになります。

### ソース

````md
[[attachment-example.txt]]

![[attachment-example.txt]]
````

### 実行例

[[attachment-example.txt]]

![[attachment-example.txt]]

## PDF：[`pdf`](../pdf.ja.md)

埋め込んだ PDF はブラウザ標準の PDF ビューアで表示されます。

### ソース

````md
![[pdf-example.pdf]]
````

### 実行例

![[pdf-example.pdf]]

## Rich embeds：[`rich-embed`](../rich-embed.ja.md)

URL を YouTube、Vimeo、Spotify、CodePen、Gist などの埋め込みに変換します。

### ソース

````md
```embed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
title: Demo video
caption: A short caption
aspect: 16/9
```
````

### 実行例

```embed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
title: Demo video
caption: A short caption
aspect: 16/9
```

## Gallery cards：[`gallery`](../gallery.ja.md)

### ソース

````md
```gallery
columns: 3
items:
  - title: Default
    description: A clean, typographic theme.
    href: https://riebeckite.dev/docs/themes/default
  - title: Minimal
    description: Stripped back to the essentials.
    href: https://riebeckite.dev/docs/themes/minimal
  - title: Gruvbox
    description: A warm, high-contrast palette.
    href: https://riebeckite.dev/docs/themes/gruvbox
```
````

### 実行例

```gallery
columns: 3
items:
  - title: Default
    description: A clean, typographic theme.
    href: https://riebeckite.dev/docs/themes/default
  - title: Minimal
    description: Stripped back to the essentials.
    href: https://riebeckite.dev/docs/themes/minimal
  - title: Gruvbox
    description: A warm, high-contrast palette.
    href: https://riebeckite.dev/docs/themes/gruvbox
```

## Excalidraw：[`excalidraw`](../excalidraw.ja.md)

Excalidraw 形式のノートを埋め込むと、ブラウザ上で SVG に置き換わります。このサイトでは `assets/HW.md` の図を埋め込んでいます。

### ソース

````md
![[HW]]
````

### 実行例

![[HW]]

## Responsive image：[`responsive-image`](../responsive-image.ja.md)

画像を `![[...]]` で埋め込むと、対応する候補画像があれば `<picture>` と複数サイズの候補に展開されます。

### ソース

````md
![[riebeckite-logo-horizontal.png]]
````

### 実行例

![[riebeckite-logo-horizontal.png]]

## Lightbox：[`lightbox`](../lightbox.ja.md)

画像をクリックすると、アクセシブルなダイアログで拡大表示されます。

### ソース

````md
![[riebeckite-logo.png]]
````

### 実行例

![[riebeckite-logo.png]]

## AutoCardLink：[`autocardlink`](../autocardlink.ja.md)

`cardlink` フェンスに URL とメタ情報を書くと、リンクカードになります。

### ソース

````md
```cardlink
url: https://example.com/riebeckite
title: Riebeckite
description: Markdown から静的サイトを作るツール
host: example.com
```
````

### 実行例

```cardlink
url: https://example.com/riebeckite
title: Riebeckite
description: Markdown から静的サイトを作るツール
host: example.com
```

## 画像比較：[`image-compare`](../image-compare.ja.md)

`image-compare` フェンスは 2 枚の画像をドラッグ可能な境界で比較します。JavaScript がない場合も Before / After ラベル付きで両方の画像を表示します。

### ソース

````md
```image-compare
---
before: ../../../assets/themes/theme-default-light.png
after: ../../../assets/themes/theme-default-dark.png
beforeAlt: ライトモードの Default テーマ
afterAlt: ダークモードの Default テーマ
label: Default テーマのライト表示とダーク表示
---
```
````

### 表示

```image-compare
---
before: ../../../assets/themes/theme-default-light.png
after: ../../../assets/themes/theme-default-dark.png
beforeAlt: ライトモードの Default テーマ
afterAlt: ダークモードの Default テーマ
label: Default テーマのライト表示とダーク表示
---
```
