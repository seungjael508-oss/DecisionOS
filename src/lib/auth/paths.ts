export function isProtectedPath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/projects");
}
