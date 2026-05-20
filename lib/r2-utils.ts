export function isR2Key(src: string): boolean {
  return (
    src.length > 0 &&
    !src.startsWith("http") &&
    !src.startsWith("data:") &&
    !src.startsWith("blob:")
  );
}
