# Code

## Toolbar 付きコード：[`code-enhance`](../code-enhance.ja.md)

行番号、ファイル名バー、行ハイライト、copy button を確認できます。

### ソース

````md
```ts title="hello.ts"
export function hello(name: string): string {
  return `こんにちは、${name}`;
}
```
````

### 実行例

```ts title="hello.ts"
export function hello(name: string): string {
  return `こんにちは、${name}`;
}
```

## Code tabs：[`code-tabs`](../code-tabs.ja.md)

隣り合った `tab="..."` 付き code fence が 1 つの tab group になります。

### ソース

````md
```ts tab="React"
const greeting = "Hello from React";
```

```js tab="Vanilla"
console.log("Hello from JavaScript");
```
````

### 実行例

```ts tab="React"
const greeting = "Hello from React";
```

```js tab="Vanilla"
console.log("Hello from JavaScript");
```

## Code annotations：[`code-annotations`](../code-annotations.ja.md)

`diff` フェンスに対象言語を指定すると、追加行と削除行が表示されます。

### ソース

````md
```diff js
const kept = true;
+ const added = "new line";
- const removed = false;
```
````

### 実行例

```diff js
const kept = true;
+ const added = "new line";
- const removed = false;
```

## Source Files：[`source-files`](../source-files.ja.md)

対象のテキストファイルをページとして公開し、ファイル全体や行範囲を埋め込めます。

### ソース

````md
[[source-file-example.ts]]

![[source-file-example.ts]]

![[source-file-example.ts#L3-L5]]
````

### 実行例

[[source-file-example.ts]]

![[source-file-example.ts]]

![[source-file-example.ts#L3-L5]]
