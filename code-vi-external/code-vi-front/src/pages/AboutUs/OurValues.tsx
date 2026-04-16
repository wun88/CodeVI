import "./OurValues.css";

const values = [
  {
    icon: "💡",
    title: "Code Quality First",
    desc: "우리는 코드의 구조뿐 아니라 의미까지 이해하여 더 높은 품질의 소프트웨어 개발을 지원합니다."
  },
  {
    icon: "🧠",
    title: "Explainable AI",
    desc: "LLM 기반 분석을 통해 코드 품질을 설명 가능한 방식으로 평가합니다."
  },
  {
    icon: "⚡",
    title: "Developer Productivity",
    desc: "개발자가 코드 개선 포인트를 빠르게 파악하고 더 효율적으로 개발할 수 있도록 돕습니다."
  },
  {
    icon: "🚀",
    title: "Continuous Improvement",
    desc: "지속적인 코드 개선과 리팩토링을 통해 더 나은 소프트웨어를 만들어갑니다."
  }
];

export default function OurValues() {
  return (
    <section className="values-section section">

      <div className="section-inner">

        <h2 className="values-title">Our Values</h2>
        <p className="values-subtitle">
          RE:FACTORY가 추구하는 핵심 가치
        </p>

        <div className="values-grid">
          {values.map((v, i) => (
            <div className="value-card" key={i}>
              <div className="value-icon">{v.icon}</div>
              <div className="value-title">{v.title}</div>
              <p className="value-desc">{v.desc}</p>
            </div>
          ))}
        </div>

      </div>

    </section>
  );
}