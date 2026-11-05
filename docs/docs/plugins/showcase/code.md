# Code

## Code with a toolbar — [`code-enhance`](../code-enhance.md)

Line numbers, a filename bar, line highlighting, and a copy button.

### Source

````md
```ts title="hello.ts"
export function hello(name: string): string {
  return `Hello, ${name}`;
}
```
````

### Rendered

```ts title="hello.ts"
export function hello(name: string): string {
  return `Hello, ${name}`;
}
```

## Code tabs — [`code-tabs`](../code-tabs.md)

Adjacent code fences with `tab="..."` become a single tab group.

### Source

````md
```ts tab="React"
const greeting = "Hello from React";
```

```js tab="Vanilla"
console.log("Hello from JavaScript");
```
````

### Rendered

```ts tab="React"
const greeting = "Hello from React";
```

```js tab="Vanilla"
console.log("Hello from JavaScript");
```

## Code annotations — [`code-annotations`](../code-annotations.md)

 Use a `diff` fence with the target language to render additions and removals.

### Source

````md
```diff js
const kept = true;
+ const added = "new line";
- const removed = false;
```
````

### Rendered

```diff js
const kept = true;
+ const added = "new line";
- const removed = false;
```

## Source files — [`source-files`](../source-files.md)

Publish selected text files as pages, embed the full file, or embed a line range.

### Source

````md
[[source-file-example.ts]]

![[source-file-example.ts]]

![[source-file-example.ts#L3-L5]]
````

### Rendered

[[source-file-example.ts]]

![[source-file-example.ts]]

![[source-file-example.ts#L3-L5]]
