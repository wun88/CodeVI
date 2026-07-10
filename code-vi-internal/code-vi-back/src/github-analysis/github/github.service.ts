import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly authService: AuthService) { }

  /**
   * 사용자 repo에 CodeVi 분석 Jenkinsfile 을 "강제 주입"한다.
   * - 기존 Jenkinsfile 이 있으면 sha 를 얻어 덮어쓴다 (분석 파이프라인 강제).
   * - 주입 파이프라인: checkout → zip → tree-sitter 파서 → POST /api/users/build-report (스냅샷 생성)
   */
  async injectJenkinsfile(encryptedPat: string, repoUrl: string): Promise<void> {
    const pat = this.authService.decryptText(encryptedPat);
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    const octokit = new Octokit({ auth: pat });

    try {
      // 기존 Jenkinsfile 의 sha 조회 (있으면 업데이트=덮어쓰기, 없으면 새로 생성)
      let existingSha: string | undefined;
      try {
        const existing = await octokit.repos.getContent({ owner, repo, path: 'Jenkinsfile' });
        if (!Array.isArray(existing.data) && 'sha' in existing.data) {
          existingSha = (existing.data as { sha: string }).sha;
        }
      } catch (error) {
        if (error.status !== 404) throw error;
      }

      this.logger.log(
        `${existingSha ? 'Overwriting' : 'Injecting'} analysis Jenkinsfile into ${owner}/${repo}`,
      );
      const content = Buffer.from(this.getJenkinsfileTemplate(owner, repo)).toString('base64');
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'Jenkinsfile',
        message: 'chore: add/refresh CodeVi analysis Jenkinsfile',
        content,
        ...(existingSha ? { sha: existingSha } : {}),
      });
      this.logger.log('Analysis Jenkinsfile injected successfully.');
    } catch (error) {
      if (error.status === 403) {
        throw new BadRequestException(
          'PAT에 레포지토리 쓰기 권한이 없습니다. GitHub에서 PAT를 재발급하고 "repo" 스코프(또는 fine-grained token의 경우 Contents: Read & Write)를 허용해주세요.',
        );
      }
      throw new BadRequestException(`GitHub Error: ${error.message}`);
    }
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } {
    const regex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = url.match(regex);
    if (!match) throw new BadRequestException('Invalid GitHub repository URL');
    return { owner: match[1], repo: match[2].replace('.git', '') };
  }

  /**
   * CodeVi 분석 파이프라인. 어떤 repo 든 빌드당 스냅샷 1개를 생성한다.
   * Jenkins 컨트롤러(agent any, shared-net) 에서 소스를 python 으로 zip → tree-sitter 파서로 AST 추출 →
   * 백엔드 /api/users/build-report 로 POST 하여 스냅샷을 저장한다.
   * (컨트롤러 이미지에 python3/curl/git 존재, codevi-parser/codevi-backend 는 shared-net 컨테이너명으로 접근)
   */
  private getJenkinsfileTemplate(owner: string, repo: string): string {
    return `pipeline {
    agent any
    environment {
        SWV_BACKEND_URL = 'http://codevi-backend:13000/api'
        TREESITTER_PARSER_URL = 'http://codevi-parser-treesitter:3001/analyze'
        REPO_OWNER = '${owner}'
        REPO_NAME = '${repo}'
    }
    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Analyze & Report Snapshot') {
            steps {
                sh '''
set -e
git config --global --add safe.directory "*"

echo ">>> Zipping source (python) ..."
python3 - <<'ZP'
import zipfile, os
skip = {".git", "node_modules", "dist", "__pycache__", ".venv", "venv"}
z = zipfile.ZipFile("code_package.zip", "w", zipfile.ZIP_DEFLATED)
for root, dirs, files in os.walk("."):
    dirs[:] = [d for d in dirs if d not in skip]
    for f in files:
        p = os.path.join(root, f)
        if p.endswith("code_package.zip"):
            continue
        z.write(p)
z.close()
ZP

echo ">>> Sending to tree-sitter parser ..."
curl -s -X POST "$TREESITTER_PARSER_URL" -F "file=@code_package.zip" -o ast.json

echo ">>> Building build-report payload ..."
python3 - <<PY
import json, os
d = json.load(open("ast.json"))
nodes = (d.get("data") or d).get("nodes") if isinstance(d, dict) else None
if nodes is None:
    nodes = []
payload = {
    "username": ["$REPO_OWNER"],
    "ProjectDto": {
        "teamName": "$REPO_NAME",
        "jenkinsJobName": os.environ["JOB_NAME"],
        "analysis": {
            "buildNumber": int(os.environ.get("BUILD_NUMBER", "0")),
            "buildUrl": os.environ.get("BUILD_URL", "UNKNOWN"),
        },
        "astNodes": nodes,
    },
}
json.dump(payload, open("payload.json", "w"))
print(">>> nodes:", len(nodes))
PY

echo ">>> Posting snapshot to backend ..."
CODE=$(curl -s -o resp.txt -w "%{http_code}" -X POST "$SWV_BACKEND_URL/users/build-report" -H "Content-Type: application/json" -d @payload.json)
echo ">>> build-report HTTP $CODE"
head -c 400 resp.txt || true
echo ""
[ "$CODE" = "200" ] || [ "$CODE" = "201" ] || { echo ">>> Snapshot POST failed"; exit 1; }
echo ">>> Snapshot created."
'''
            }
        }
    }
    post {
        always { sh 'rm -f code_package.zip ast.json payload.json resp.txt || true' }
    }
}`;
  }
}
