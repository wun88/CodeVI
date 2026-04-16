import { useState } from 'react';
import Header from '../../components/Header';
import './FAQ.css';

const faqData = [
  {
    id: 1,
    category: 'service',
    question: '이 서비스는 어떤 기능을 제공하나요?',
    answer: '코드 구조를 시각화하고 코드 품질을 분석하여 리팩토링 방향을 제안하는 웹 플랫폼입니다. 사용자는 자신의 코드를 입력하면 함수 구조, 의존 관계 등을 그래프로 확인하고 개선이 필요한 부분을 확인할 수 있습니다.'
  },
  {
    id: 2,
    category: 'service',
    question: '어떤 언어를 지원하나요?',
    answer: '현재는 Python 언어를 중심으로 지원하며, 향후 JavaScript, Java 등 다양한 언어로 확장할 예정입니다.'
  },
  {
    id: 3,
    category: 'feature',
    question: '코드 시각화는 어떻게 이루어지나요?',
    answer: '코드를 분석하여 함수 호출 관계, 클래스 구조, 모듈 의존성 등을 그래프 형태로 시각화합니다. 이를 통해 코드의 흐름을 한눈에 이해할 수 있습니다.'
  },
  {
    id: 4,
    category: 'feature',
    question: '코드 품질 분석은 무엇을 기준으로 하나요?',
    answer: '다음과 같은 기준을 기반으로 분석합니다.',
    list: [
      '코드 복잡도 (Cyclomatic Complexity)',
      '코드 중복 여부',
      '코드 스멜(Code Smell)',
      '함수 및 클래스 구조'
    ]
  },
  {
    id: 5,
    category: 'feature',
    question: '리팩토링 추천은 어떻게 제공되나요?',
    answer: '코드 분석 결과를 바탕으로 코드 품질 향상을 위한 개선 방향을 제안합니다.',
    list: [
      '불필요한 코드 제거',
      '함수 분리',
      '구조 개선'
    ]
  },
  {
    id: 6,
    category: 'service',
    question: '이 서비스의 목표는 무엇인가요?',
    answer: '단순히 코드를 분석하는 것을 넘어 코드를 더 쉽게 이해하고, 더 좋은 코드로 개선할 수 있도록 돕는 것이 목표입니다.'
  },
  {
    id: 7,
    category: 'feature',
    question: '성능 최적화에도 도움이 되나요?',
    answer: '네, 코드 분석을 통해 성능 개선 및 효율적인 코드 작성에 도움을 줍니다.',
    list: [
      '불필요한 반복 연산',
      '비효율적인 구조'
    ]
  }
];

const categories = [
  { id: 'all', label: '전체', icon: 'grid' },
  { id: 'service', label: '서비스 소개', icon: 'info' },
  { id: 'feature', label: '기능 안내', icon: 'feature' }
];

function FAQ() {
  const [openItems, setOpenItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    question: ''
  });

  const toggleItem = (id) => {
    setOpenItems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const filteredFaq = activeCategory === 'all'
    ? faqData
    : faqData.filter(item => item.category === activeCategory);

  const openModal = () => {
    setIsModalOpen(true);
    setIsSubmitted(false);
    setFormData({ name: '', email: '', question: '' });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsSubmitted(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.question) {
      setIsSubmitted(true);
    }
  };

  const isFormValid = formData.name && formData.email && formData.question;

  const getCategoryIcon = (iconType) => {
    switch(iconType) {
      case 'grid':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
            <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      case 'info':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );
      case 'feature':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="faq-page">
      <Header />

      {/* Hero Section */}
      <section className="faq-hero">
        <div className="hero-background">
          <div className="hero-shape shape-1"></div>
          <div className="hero-shape shape-2"></div>
          <div className="hero-shape shape-3"></div>
          <div className="hero-grid"></div>
        </div>
        <div className="faq-hero-content">
          <div className="hero-badge">FAQ</div>
          <h1>무엇이든 물어보세요</h1>
          <p>RE:FACTORY 서비스에 대해 자주 묻는 질문들을 모았습니다.<br/>원하시는 답변을 찾아보세요.</p>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-number">{faqData.length}</span>
              <span className="stat-label">자주 묻는 질문</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">24h</span>
              <span className="stat-label">평균 답변 시간</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <span className="stat-number">98%</span>
              <span className="stat-label">만족도</span>
            </div>
          </div>
        </div>

        <div className="scroll-indicator" onClick={() => document.getElementById('faq-list-section').scrollIntoView({ behavior: 'smooth' })}>
          <span>스크롤하여 질문 보기</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </section>

      <main id="faq-list-section" className="faq-content">
        {/* Category Filter */}
        <div className="category-filter">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`category-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {getCategoryIcon(cat.icon)}
              {cat.label}
              {cat.id !== 'all' && (
                <span className="category-count">
                  {faqData.filter(item => item.category === cat.id).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="faq-list">
          {filteredFaq.map((item, index) => (
            <div
              key={item.id}
              className={`faq-item ${openItems.includes(item.id) ? 'open' : ''}`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <button
                className="faq-question"
                onClick={() => toggleItem(item.id)}
                aria-expanded={openItems.includes(item.id)}
              >
                <span className="question-number">Q{item.id}</span>
                <span className="question-text">{item.question}</span>
                <span className="faq-icon">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6 9L12 15L18 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              <div className="faq-answer">
                <div className="answer-content">
                  <p>{item.answer}</p>
                  {item.list && (
                    <ul>
                      {item.list.map((listItem, idx) => (
                        <li key={idx}>{listItem}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ask Question Section */}
        <div className="ask-question-section">
          <div className="ask-question-content">
            <div className="ask-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.9706 16.9706 21 12 21C10.2289 21 8.57736 20.4884 7.18497 19.605L3 21L4.39499 16.815C3.51156 15.4226 3 13.7711 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="ask-text">
              <h3>찾으시는 답변이 없으신가요?</h3>
              <p>직접 질문을 남겨주시면 빠르게 답변해 드리겠습니다.</p>
            </div>
          </div>
          <button className="ask-question-btn" onClick={openModal}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 5V19M5 12H19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            질문하기
          </button>
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {!isSubmitted ? (
              <>
                <div className="modal-header">
                  <h2>질문하기</h2>
                  <p>궁금한 점을 남겨주시면 빠르게 답변드리겠습니다.</p>
                </div>

                <form className="question-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="name">이름</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="이름을 입력해주세요"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">이메일</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="답변받으실 이메일을 입력해주세요"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="question">질문 내용</label>
                    <textarea
                      id="question"
                      name="question"
                      value={formData.question}
                      onChange={handleInputChange}
                      placeholder="궁금한 점을 자유롭게 작성해주세요"
                      rows="5"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`submit-btn ${isFormValid ? 'active' : ''}`}
                    disabled={!isFormValid}
                  >
                    전송하기
                  </button>
                </form>
              </>
            ) : (
              <div className="success-message">
                <div className="success-icon">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="12" cy="12" r="10" stroke="#7492B7" strokeWidth="2" />
                    <path
                      d="M8 12L11 15L16 9"
                      stroke="#7492B7"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2>전송이 완료되었습니다</h2>
                <p>빠른 시일 내에 입력하신 이메일로 답변드리겠습니다.</p>
                <button className="close-btn" onClick={closeModal}>
                  확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default FAQ;
