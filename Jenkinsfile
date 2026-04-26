pipeline {
    agent any

    environment {
        // CodeVi 플랫폼(internal)과 회사 소개 페이지(external) 디렉토리
        BACK_DIR = "code-vi-internal/code-vi-back"
        INTERNAL_FRONT_DIR = "code-vi-internal/code-vi-front"
        EXTERNAL_FRONT_DIR = "code-vi-external/code-vi-front"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Deploy (In Parallel)') {
            when {
                branch 'Deploy'
            }
            parallel {
                stage('Backend CD') {
                    steps {
                        dir("${BACK_DIR}") {
                            echo "🚀 Starting Backend Deployment..."
                            sh "docker-compose -f docker-compose.prod.yml up -d --build"
                        }
                    }
                }

                stage('Internal Frontend CD (CodeVi Platform)') {
                    steps {
                        dir("${INTERNAL_FRONT_DIR}") {
                            echo "🎨 Starting Internal (CodeVi) Frontend Deployment..."
                            sh "docker-compose -f docker-compose.prod.yml up -d --build"
                        }
                    }
                }

                stage('External Frontend CD (Re:Factory Intro)') {
                    steps {
                        dir("${EXTERNAL_FRONT_DIR}") {
                            echo "🎨 Starting External (Marketing) Frontend Deployment..."
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
                sh "docker image prune -f"
            }
        }
    }

    post {
        success {
            echo "✅ CodeVi (Back & Internal Front & External Front) deployed successfully!"
        }
        failure {
            echo "❌ Deployment failed. Check the Jenkins console output."
        }
    }
}
