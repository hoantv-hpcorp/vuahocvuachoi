import { Device } from "@/components/Device";

export default function Loading() {
  return <Device><div className="loading-overlay"><div className="loading-card" role="status" aria-live="polite"><div className="loading-orbit" aria-hidden="true"><span /></div><p className="loading-title">Một chút nhé!</p><p className="loading-description">Cô chú đang chuẩn bị cho con…</p><div className="loading-dots" aria-hidden="true"><span /><span /><span /></div></div></div></Device>;
}
