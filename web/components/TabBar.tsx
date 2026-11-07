import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";

const tabs: { key: "exams" | "history" | "profiles"; label: string; href: string; icon: IconName }[] = [
  { key: "exams", label: "Đề thi", href: "/exams", icon: "book" },
  { key: "profiles", label: "Hồ sơ", href: "/profiles", icon: "user" },
];

export function TabBar({ active }: { active: "exams" | "history" | "profiles" }) {
  return (
    <nav className="tabbar" aria-label="Điều hướng chính">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`tab${tab.key === active ? " on" : ""}`}
          aria-current={tab.key === active ? "page" : undefined}
        >
          <Icon name={tab.icon} />
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

