import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function NaverCallback() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const jwtToken = searchParams.get('jwtToken');
        const error = searchParams.get('error');

        if (error) {
            console.error('Naver 로그인 실패:', error);
            navigate('/?error=naver_auth_failed');
            return;
        }

        if (jwtToken) {
            const token = jwtToken.replace('Bearer ', '');
            localStorage.setItem('accessToken', token);
            navigate('/projects');
        } else {
            console.error('JWT 토큰이 없습니다.');
            navigate('/?error=no_token');
        }
    }, [navigate, searchParams]);

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#070910',
                color: '#e2e8f0',
            }}
        >
            <div style={{ textAlign: 'center' }}>
                <div
                    style={{
                        width: '40px',
                        height: '40px',
                        border: '3px solid #2d3150',
                        borderTopColor: '#6366f1',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px',
                    }}
                />
                <p>Naver 로그인 처리 중...</p>
                <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        </div>
    );
}