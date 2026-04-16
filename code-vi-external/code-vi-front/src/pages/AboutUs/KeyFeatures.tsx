import { useEffect } from "react";
import useScrollReveal from "../../hooks/useScrollReveal";
import "./KeyFeatures.css";

// 👇 여기 내용을 3개짜리로 교체했습니다.
const features = [
  {
    icon: "📊",
    title: "Structure & Metrics",
    desc: "복잡도, 결합도 등 다양한 정량적 지표를 산출하고 함수 간의 관계를 분석하여 코드베이스의 구조를 한눈에 파악합니다."
  },
  {
    icon: "🧠",
    title: "LLM Semantic Analysis",
    desc: "대형 언어 모델을 활용하여 단순한 문법을 넘어 코드의 의미와 문맥을 깊이 있게 이해하고 정성적으로 평가합니다."
  },
  {
    icon: "💡",
    title: "Refactoring Recommendation",
    desc: "구조적, 의미론적 분석 결과를 종합하여 코드 개선 및 리팩토링 포인트를 개발자가 적용하기 쉽게 제안합니다."
  }
];

export default function KeyFeatures() {
  const ref = useScrollReveal();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cards = el.querySelectorAll(".feature-card");

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add("show");
          }, i * 150);
        }
      });
    }, { threshold: 0.2 });

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [ref]);

  return (
    <section ref={ref} className="features-section section">
      <div className="section-inner">
        <div className="features-header">
          <h2>Key Features</h2>
          <p>
            Refactory는 코드 구조 분석과 LLM 기반 의미 분석을 결합하여<br />
            더 정확한 코드 품질 평가와 리팩토링 인사이트를 제공합니다.
          </p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div className="feature-card" key={i}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-content">
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}