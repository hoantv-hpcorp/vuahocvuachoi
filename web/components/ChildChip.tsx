import Link from "next/link";

export function ChildChip() {
  return (
    <Link href="/profiles" className="chip on">
      <span className="avatar-mini">N</span>
      Bé Na · Lớp 2
    </Link>
  );
}
