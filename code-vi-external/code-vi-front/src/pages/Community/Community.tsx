import { useState } from 'react';
import Header from '../../components/Header';
import './Community.css';

// 임시 데이터
const initialPosts = [
  {
    id: 1,
    type: 'notice',
    pinned: true,
    title: '[공지] RE:FACTORY v2.0 업데이트 안내',
    content: '새로운 기능이 추가되었습니다. JavaScript 지원, 향상된 시각화 기능 등이 포함됩니다.',
    author: '관리자',
    date: '2024-03-15',
    views: 1520,
    comments: 23
  },
  {
    id: 2,
    type: 'notice',
    pinned: true,
    title: '[공지] 커뮤니티 이용 가이드라인',
    content: '원활한 커뮤니티 운영을 위한 가이드라인을 안내드립니다.',
    author: '관리자',
    date: '2024-03-10',
    views: 892,
    comments: 5
  },
  {
    id: 3,
    type: 'general',
    pinned: false,
    title: 'Python 코드 리팩토링 후기 공유합니다',
    content: 'RE:FACTORY를 사용해서 레거시 코드를 개선한 경험을 공유합니다.',
    author: '개발자A',
    date: '2024-03-14',
    views: 234,
    comments: 12
  },
  {
    id: 4,
    type: 'question',
    pinned: false,
    title: '함수 복잡도 분석 결과 해석 방법이 궁금합니다',
    content: 'Cyclomatic Complexity 수치가 높게 나왔는데 어떻게 개선해야 할까요?',
    author: '초보개발자',
    date: '2024-03-14',
    views: 156,
    comments: 8
  },
  {
    id: 5,
    type: 'general',
    pinned: false,
    title: '대규모 프로젝트 분석 팁 공유',
    content: '1000개 이상의 파일이 있는 프로젝트를 효율적으로 분석하는 방법을 공유합니다.',
    author: '시니어Dev',
    date: '2024-03-13',
    views: 445,
    comments: 21
  },
  {
    id: 6,
    type: 'question',
    pinned: false,
    title: '클래스 구조 시각화에서 상속 관계가 안 보여요',
    content: '다중 상속 구조인데 시각화가 제대로 안 되는 것 같습니다.',
    author: '파이썬러버',
    date: '2024-03-12',
    views: 89,
    comments: 4
  },
  {
    id: 7,
    type: 'general',
    pinned: false,
    title: '코드 스멜 제거 전후 비교',
    content: 'Long Method와 God Class를 리팩토링한 결과를 공유합니다.',
    author: '클린코더',
    date: '2024-03-11',
    views: 312,
    comments: 15
  },
  {
    id: 8,
    type: 'general',
    pinned: false,
    title: 'GitHub 연동 기능 정말 편하네요',
    content: 'ZIP 업로드 대신 GitHub 연동으로 바로 분석할 수 있어서 좋습니다.',
    author: '깃헙매니아',
    date: '2024-03-10',
    views: 178,
    comments: 6
  }
];

const categories = [
  { id: 'all', label: '전체' },
  { id: 'notice', label: '공지사항' },
  { id: 'general', label: '자유게시판' },
  { id: 'question', label: '질문/답변' }
];

function Community() {
  const [posts] = useState(initialPosts);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', type: 'general' });
  const [selectedPost, setSelectedPost] = useState(null);

  const filteredPosts = posts.filter(post => {
    const matchesCategory = activeCategory === 'all' || post.type === activeCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pinnedPosts = filteredPosts.filter(post => post.pinned);
  const regularPosts = filteredPosts.filter(post => !post.pinned);

  const getTypeLabel = (type) => {
    switch(type) {
      case 'notice': return '공지';
      case 'question': return '질문';
      case 'general': return '일반';
      default: return '';
    }
  };

  const getTypeClass = (type) => {
    switch(type) {
      case 'notice': return 'type-notice';
      case 'question': return 'type-question';
      case 'general': return 'type-general';
      default: return '';
    }
  };

  const handleWriteSubmit = (e) => {
    e.preventDefault();
    if (newPost.title && newPost.content) {
      alert('게시글이 등록되었습니다. (DB 미연결 상태)');
      setIsWriteModalOpen(false);
      setNewPost({ title: '', content: '', type: 'general' });
    }
  };

  return (
    <div className="community-page">
      <Header />

      {/* Hero Section */}
      <section className="community-hero">
        <div className="community-hero-bg">
          <div className="hero-pattern"></div>
        </div>
        <div className="community-hero-content">
          <h1>Community</h1>
          <p>RE:FACTORY 사용자들과 경험을 공유하고 질문해보세요.</p>
        </div>
      </section>

      <main className="community-content">
        {/* Top Bar */}
        <div className="community-top-bar">
          <div className="category-tabs">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.label}
                <span className="tab-count">
                  {cat.id === 'all'
                    ? posts.length
                    : posts.filter(p => p.type === cat.id).length}
                </span>
              </button>
            ))}
          </div>

          <div className="top-bar-actions">
            <div className="search-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="검색어를 입력하세요"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="write-btn" onClick={() => setIsWriteModalOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              글쓰기
            </button>
          </div>
        </div>

        {/* Posts List */}
        <div className="posts-container">
          {/* Pinned Posts */}
          {pinnedPosts.length > 0 && (
            <div className="pinned-posts">
              {pinnedPosts.map(post => (
                <article key={post.id} className="post-item pinned" onClick={() => setSelectedPost(post)}>
                  <div className="post-pin-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L12 12M12 12L8 8M12 12L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 12 12)"/>
                      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className={`post-type ${getTypeClass(post.type)}`}>{getTypeLabel(post.type)}</span>
                  <h3 className="post-title">{post.title}</h3>
                  <div className="post-meta">
                    <span className="post-author">{post.author}</span>
                    <span className="post-date">{post.date}</span>
                    <span className="post-views">조회 {post.views}</span>
                    <span className="post-comments">댓글 {post.comments}</span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Regular Posts */}
          <div className="regular-posts">
            {regularPosts.length > 0 ? (
              regularPosts.map(post => (
                <article key={post.id} className="post-item" onClick={() => setSelectedPost(post)}>
                  <span className={`post-type ${getTypeClass(post.type)}`}>{getTypeLabel(post.type)}</span>
                  <h3 className="post-title">{post.title}</h3>
                  <p className="post-preview">{post.content}</p>
                  <div className="post-meta">
                    <span className="post-author">{post.author}</span>
                    <span className="post-date">{post.date}</span>
                    <span className="post-views">조회 {post.views}</span>
                    <span className="post-comments">댓글 {post.comments}</span>
                  </div>
                </article>
              ))
            ) : (
              <div className="no-posts">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>게시글이 없습니다.</p>
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button className="page-btn active">1</button>
          <button className="page-btn">2</button>
          <button className="page-btn">3</button>
          <button className="page-btn next">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </main>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal-content post-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedPost(null)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="post-detail-header">
              <span className={`post-type ${getTypeClass(selectedPost.type)}`}>
                {getTypeLabel(selectedPost.type)}
              </span>
              {selectedPost.pinned && (
                <span className="pinned-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L12 12M12 12L8 8M12 12L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 12 12)"/>
                    <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M12 12V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  고정됨
                </span>
              )}
            </div>

            <h2 className="post-detail-title">{selectedPost.title}</h2>

            <div className="post-detail-info">
              <div className="post-detail-author">
                <div className="author-avatar">
                  {selectedPost.author.charAt(0)}
                </div>
                <div className="author-info">
                  <span className="author-name">{selectedPost.author}</span>
                  <span className="post-date">{selectedPost.date}</span>
                </div>
              </div>
              <div className="post-detail-stats">
                <span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  {selectedPost.views}
                </span>
                <span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 11.5C21 16.75 16.75 21 11.5 21C6.25 21 2 16.75 2 11.5C2 6.25 6.25 2 11.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M21 3L21 8M21 8L16 8M21 8L14 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {selectedPost.comments}
                </span>
              </div>
            </div>

            <div className="post-detail-content">
              <p>{selectedPost.content}</p>
              <p className="placeholder-content">
                이 게시물의 상세 내용입니다. 현재는 임시 데이터로 표시되고 있으며,
                실제 서비스에서는 데이터베이스와 연동하여 전체 내용이 표시됩니다.
              </p>
              <p className="placeholder-content">
                RE:FACTORY는 코드 분석 및 리팩토링을 위한 강력한 도구입니다.
                사용자들은 이 커뮤니티에서 경험을 공유하고, 질문을 하며,
                서로의 지식을 나눌 수 있습니다.
              </p>
            </div>

            <div className="post-detail-actions">
              <button className="action-btn like-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7 22V11M2 13V20C2 21.1046 2.89543 22 4 22H17.4262C18.907 22 20.1662 20.9197 20.3914 19.4562L21.4683 12.4562C21.7479 10.6389 20.3418 9 18.5032 9H15C14.4477 9 14 8.55228 14 8V4.46584C14 3.10399 12.896 2 11.5342 2C11.2093 2 10.915 2.1913 10.7831 2.48812L7.26394 10.4061C7.10344 10.7673 6.74532 11 6.35013 11H4C2.89543 11 2 11.8954 2 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                좋아요
              </button>
              <button className="action-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 8.25H16.5M7.5 11.25H12M21 12C21 16.9706 16.9706 21 12 21C10.2289 21 8.57736 20.4884 7.18497 19.6056L3 21L4.39437 16.815C3.51163 15.4226 3 13.7711 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                댓글 작성
              </button>
              <button className="action-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.59 13.51L15.42 17.49M15.41 6.51L8.59 10.49M21 5C21 6.65685 19.6569 8 18 8C16.3431 8 15 6.65685 15 5C15 3.34315 16.3431 2 18 2C19.6569 2 21 3.34315 21 5ZM9 12C9 13.6569 7.65685 15 6 15C4.34315 15 3 13.6569 3 12C3 10.3431 4.34315 9 6 9C7.65685 9 9 10.3431 9 12ZM21 19C21 20.6569 19.6569 22 18 22C16.3431 22 15 20.6569 15 19C15 17.3431 16.3431 16 18 16C19.6569 16 21 17.3431 21 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                공유
              </button>
            </div>

            <div className="comments-section">
              <h3>댓글 {selectedPost.comments}개</h3>
              <div className="comment-input">
                <input type="text" placeholder="댓글을 입력하세요..." />
                <button className="comment-submit-btn">등록</button>
              </div>
              <div className="comments-list">
                <div className="comment-item">
                  <div className="comment-avatar">U</div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">사용자1</span>
                      <span className="comment-date">2024-03-15</span>
                    </div>
                    <p>좋은 정보 감사합니다!</p>
                  </div>
                </div>
                <div className="comment-item">
                  <div className="comment-avatar">D</div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">개발자B</span>
                      <span className="comment-date">2024-03-15</span>
                    </div>
                    <p>저도 이 기능 잘 사용하고 있습니다. 추가 팁 공유해주세요!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Write Modal */}
      {isWriteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsWriteModalOpen(false)}>
          <div className="modal-content write-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsWriteModalOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="modal-header">
              <h2>새 글 작성</h2>
            </div>

            <form className="write-form" onSubmit={handleWriteSubmit}>
              <div className="form-group">
                <label>카테고리</label>
                <select
                  value={newPost.type}
                  onChange={(e) => setNewPost({ ...newPost, type: e.target.value })}
                >
                  <option value="general">자유게시판</option>
                  <option value="question">질문/답변</option>
                </select>
              </div>

              <div className="form-group">
                <label>제목</label>
                <input
                  type="text"
                  placeholder="제목을 입력하세요"
                  value={newPost.title}
                  onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>내용</label>
                <textarea
                  placeholder="내용을 입력하세요"
                  rows="10"
                  value={newPost.content}
                  onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                />
              </div>

              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsWriteModalOpen(false)}>
                  취소
                </button>
                <button
                  type="submit"
                  className={`submit-btn ${newPost.title && newPost.content ? 'active' : ''}`}
                  disabled={!newPost.title || !newPost.content}
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Community;
