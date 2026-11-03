export function crossesShellBoundary(
  currentPathname: string,
  destinationPathname: string,
): boolean {
  return (
    isDocumentationPath(currentPathname) !==
    isDocumentationPath(destinationPathname)
  );
}

function isDocumentationPath(pathname: string): boolean {
  return /^\/(?:ja\/)?docs(?:\/|$)/.test(pathname);
}
