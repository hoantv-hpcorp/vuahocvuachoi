import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";
import { WordTables } from "./word-tables";

export default function DayAndMonthPage() {
  return <Device><AppBar><Link href="/profiles" className="btn btn-ghost">Quay lại</Link><div className="title">Ngày và tháng</div></AppBar><div className="body"><h1>Ngày và tháng bằng tiếng Anh</h1><p className="word-intro">Nhấn vào nút nghe để luyện phát âm cùng con nhé.</p><WordTables /></div></Device>;
}
