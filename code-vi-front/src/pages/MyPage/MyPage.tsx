import React from 'react';
import Header from '../../components/Header/Header';
import './MyPage.css';

const MyPage: React.FC = () => {
  return (
    <div className="mypage-container">
      <Header onLoginClick={() => {}} />
      <main className="mypage-content">
        <div className="mypage-card">
          <div className="profile-header">
            <div className="profile-avatar">U</div>
            <div className="profile-info">
              <h1 className="profile-name">User Profile</h1>
              <p className="profile-email">user@example.com</p>
            </div>
          </div>
          
          <div className="profile-sections">
            <section className="profile-section">
              <h2>Account Settings</h2>
              <div className="settings-list">
                <div className="settings-item">
                  <span>Edit Profile</span>
                  <span>&gt;</span>
                </div>
                <div className="settings-item">
                  <span>Change Password</span>
                  <span>&gt;</span>
                </div>
                <div className="settings-item">
                  <span>Notifications</span>
                  <span>&gt;</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyPage;
