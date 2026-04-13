pipeline {
    agent any

    environment {
        // 실제 프로젝트 폴더명과 일치하는지 다시 확인해주세요.
        BACK_DIR = "code-vi-back"
        FRONT_DIR = "code-vi-front"
    }

    stages {
        stage('Checkout') {
            steps {
                // SCM(Git)에서 최신 코드를 가져옵니다.
                checkout scm
            }
        }

        stage('Build & Deploy (In Parallel)') {
            // 핵심: 'Deploy' 브랜치로 머지/푸시될 때만 이 전체 스테이지를 실행합니다.
            when {
                branch 'Deploy'
            }
            parallel {
                stage('Backend CD') {
                    steps {
                        dir("${BACK_DIR}") {
                            echo "🚀 Starting Backend Deployment..."
                            // 각 폴더 안의 prod 설정 파일로 빌드 및 실행
                            sh "docker-compose -f docker-compose.prod.yml up -d --build"
                        }
                    }
                }

                stage('Frontend CD') {
                    steps {
                        dir("${FRONT_DIR}") {
                            echo "🎨 Starting Frontend Deployment..."
                            sh "docker-compose -f docker-compose.prod.yml up -d --build"
                        }
                    }
                }
            }
        }

        stage('Post-Deployment Cleanup') {
            when {
                branch 'deploy'
            }
            steps {
                echo "🧹 Cleaning up unused Docker images..."
                // 빌드 후 남은 'dangling' 이미지들을 정리하여 디스크 공간 확보
                sh "docker image prune -f"
            }
        }
    }

    post {
        success {
            echo "✅ CodeVi (Front & Back) deployed successfully to the server!"
        }
        failure {
            echo "❌ Deployment failed. Check the Jenkins console output."
        }
    }
}