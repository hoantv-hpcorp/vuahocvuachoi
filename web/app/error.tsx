"use client";
import { Device } from "@/components/Device";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <Device><div className="body"><h1>Chưa tải được trang</h1><p>Đã có lỗi xảy ra. Vui lòng thử lại.</p><button className="btn btn-primary" onClick={reset}>Thử lại</button></div></Device>; }
