"use client";

import { useEffect, useRef, useState } from "react";

const days = [["Monday", "Thứ Hai", "/ˈmʌn.deɪ/"], ["Tuesday", "Thứ Ba", "/ˈtuːz.deɪ/"], ["Wednesday", "Thứ Tư", "/ˈwenz.deɪ/"], ["Thursday", "Thứ Năm", "/ˈθɝːz.deɪ/"], ["Friday", "Thứ Sáu", "/ˈfraɪ.deɪ/"], ["Saturday", "Thứ Bảy", "/ˈsæt̬.ɚ.deɪ/"], ["Sunday", "Chủ Nhật", "/ˈsʌn.deɪ/"]];
const months = [["January", "Tháng Một", "/ˈdʒæn.ju.er.i/"], ["February", "Tháng Hai", "/ˈfeb.ruː.er.i/"], ["March", "Tháng Ba", "/mɑːrtʃ/"], ["April", "Tháng Tư", "/ˈeɪ.prəl/"], ["May", "Tháng Năm", "/meɪ/"], ["June", "Tháng Sáu", "/dʒuːn/"], ["July", "Tháng Bảy", "/dʒuˈlaɪ/"], ["August", "Tháng Tám", "/ˈɑː.ɡəst/"], ["September", "Tháng Chín", "/sepˈtem.bɚ/"], ["October", "Tháng Mười", "/ɑːkˈtoʊ.bɚ/"], ["November", "Tháng Mười Một", "/noʊˈvem.bɚ/"], ["December", "Tháng Mười Hai", "/dɪˈsem.bɚ/"]];

export function WordTables() {
  const [error, setError] = useState("");
  const current = useRef<SpeechSynthesisUtterance | null>(null);
  const pending = useRef<string | null>(null);
  useEffect(() => () => {
    pending.current = null;
    if (current.current) {
      current.current.onend = null;
      current.current.onerror = null;
      window.speechSynthesis.cancel();
      current.current = null;
    }
  }, []);

  function speak(word: string) {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setError("Trình duyệt này chưa hỗ trợ phát âm. Hãy thử trình duyệt khác nhé.");
      return;
    }
    setError("");
    if (current.current) {
      pending.current = word;
      return;
    }
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    current.current = utterance;
    const finish = () => {
      if (current.current !== utterance) return;
      current.current = null;
      const next = pending.current;
      pending.current = null;
      if (next) speak(next);
    };
    utterance.onend = finish;
    utterance.onerror = (event) => {
      if (event.error !== "canceled" && event.error !== "interrupted") setError("Chưa phát được âm thanh. Hãy thử lại nhé.");
      finish();
    };
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  }

  return <>{error && <p className="word-error" role="status">{error}</p>}{[["Các ngày trong tuần", days], ["Các tháng trong năm", months]].map(([title, words]) => <section className="word-section" key={title as string}><h2>{title as string}</h2><div className="word-table-wrap"><table className="word-table"><thead><tr><th scope="col">Tiếng Anh</th><th scope="col">Phiên âm (IPA)</th><th scope="col">Tiếng Việt</th><th scope="col">Phát âm</th></tr></thead><tbody>{(words as string[][]).map(([english, vietnamese, ipa]) => <tr key={english}><th scope="row" lang="en">{english}</th><td className="word-ipa">{ipa}</td><td>{vietnamese}</td><td><button type="button" className="word-speak" onClick={() => speak(english)} aria-label={`Nghe phát âm ${english}`}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6M18 6a9 9 0 0 1 0 12"/></svg><span>Nghe</span></button></td></tr>)}</tbody></table></div></section>)}</>;
}
