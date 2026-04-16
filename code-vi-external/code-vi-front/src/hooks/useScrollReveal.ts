import { useEffect, useRef } from "react";

export default function useScrollReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("show");
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(el);

    // 🔥 핵심: 처음부터 화면에 있으면 바로 실행
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) {
      el.classList.add("show");
    }

    return () => observer.disconnect();
  }, []);

  return ref;
}