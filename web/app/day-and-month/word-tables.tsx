"use client";

import { useEffect, useState } from "react";

const days = [["Monday", "Thứ Hai"], ["Tuesday", "Thứ Ba"], ["Wednesday", "Thứ Tư"], ["Thursday", "Thứ Năm"], ["Friday", "Thứ Sáu"], ["Saturday", "Thứ Bảy"], ["Sunday", "Chủ Nhật"]];
const months = [["January", "Tháng Một"], ["February", "Tháng Hai"], ["March", "Tháng Ba"], ["April", "Tháng Tư"], ["May", "Tháng Năm"], ["June", "Tháng Sáu"], ["July", "Tháng Bảy"], ["August", "Tháng Tám"], ["September", "Tháng Chín"], ["October", "Tháng Mười"], ["November", "Tháng Mười Một"], ["December", "Tháng Mười Hai"]];

export function WordTables() {
  const [error, setError] = useState("");
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  function speak(word: string) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setError("Trình duyệt này chưa hỗ trợ phát âm. Hãy thử trình duyệt khác nhé.");
      return;
    }
    setError("");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.onerror = (event) => { if (event.error !== "canceled" && event.error !== "interrupted") setError("Chưa phát được âm thanh. Hãy thử lại nhé."); };
    window.speechSynthesis.speak(utterance);
  }

  return <>{error && <p className="word-error" role="status">{error}</p>}{[["Các ngày trong tuần", days], ["Các tháng trong năm", months]].map(([title, words]) => <section className="word-section" key={title as string}><h2>{title as string}</h2><div className="word-table-wrap"><table className="word-table"><thead><tr><th scope="col">Tiếng Anh</th><th scope="col">Tiếng Việt</th><th scope="col">Phát âm</th></tr></thead><tbody>{(words as string[][]).map(([english, vietnamese]) => <tr key={english}><th scope="row" lang="en">{english}</th><td>{vietnamese}</td><td><button type="button" className="word-speak" onClick={() => speak(english)} aria-label={`Nghe phát âm ${english}`}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></svg><span>Nghe</span></button></td></tr>)}</tbody></table></div></section>)}</>;
}
