import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { Device } from "@/components/Device";

export default function PrivacyPage() {
  return <Device><AppBar><Link href="/profiles" className="btn btn-ghost">Quay lại</Link><div className="title">Quyền riêng tư</div></AppBar><main className="body privacy-copy"><h1>Quyền riêng tư</h1><p>Ứng dụng lưu thông tin tài khoản đăng nhập, tên gọi và lớp của con, cùng bài làm và kết quả để gia đình có thể tiếp tục và xem lại.</p><p>Phụ huynh có thể xóa toàn bộ lịch sử trong mục Lịch sử, hoặc xóa hồ sơ và các bài làm của con trong mục Hồ sơ. Việc xóa không thể hoàn tác.</p><p>Đăng nhập được cung cấp bởi Auth0; dữ liệu ứng dụng được lưu trong Supabase. Ứng dụng sử dụng cookie để duy trì đăng nhập và ghi nhớ hồ sơ được chọn.</p></main></Device>;
}
