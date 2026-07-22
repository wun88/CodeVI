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
    return this.injectJenkinsfileWithToken(pat, repoUrl);
  }

  /**
   * PAT onboarding과 GitHub 연동(OAuth repo scope) 두 경로가 공유하는 실제 주입 로직.
   * OAuth 연동 쪽은 이미 평문 access token을 들고 있어 RSA 복호화 단계가 필요 없다.
   */
  async injectJenkinsfileWithToken(token: string, repoUrl: string): Promise<void> {
    const { owner, repo } = this.parseRepoUrl(repoUrl);
    const octokit = new Octokit({ auth: token });

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
   * CodeVi 분석 파이프라인(하이브리드). 어떤 repo 든 빌드당 스냅샷 1개를 생성한다.
   * Jenkins 컨트롤러(agent any, shared-net) 에서 소스를 python 으로 zip →
   *   ① tree-sitter 파서(3001)로 AST 추출(기존 시각화/스냅샷 그래프)
   *   ② examine(pyexamine 3003) /codegraph 로 캐노니컬 그래프 + units[].metrics(CK) 획득
   * → units 에서 클래스별 classMetrics 파생 → /api/users/build-report 로 POST.
   * 백엔드가 astNodes(구조) + classMetrics(AstClass.metrics 실측) + codeGraph(캐노니컬) 를 함께 저장.
   * (컨트롤러 이미지에 python3/curl/git 존재, 컨테이너는 shared-net 서비스명으로 접근)
   */
  private getJenkinsfileTemplate(owner: string, repo: string): string {
    return `pipeline {
    agent any
    environment {
        SWV_BACKEND_URL = 'http://codevi-backend:13000/api'
        TREESITTER_PARSER_URL = 'http://codevi-parser-treesitter:3001/analyze'
        EXAMINE_URL = 'http://codevi-pyexamine:3003/codegraph'
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
        try:
            if os.path.isfile(p):  # 깨진 심볼릭 링크/특수파일 건너뜀
                z.write(p)
        except OSError:
            pass
z.close()
ZP

echo ">>> Sending to tree-sitter parser ..."
curl -s -X POST "$TREESITTER_PARSER_URL" -F "file=@code_package.zip" -o ast.json

echo ">>> Sending to examine (pyexamine) /codegraph ..."
curl -s -X POST "$EXAMINE_URL" -F "file=@code_package.zip" -o codegraph.json || echo '{}' > codegraph.json

echo ">>> Building build-report payload ..."
python3 - <<PY
import json, os
d = json.load(open("ast.json"))
nodes = (d.get("data") or d).get("nodes") if isinstance(d, dict) else None
if nodes is None:
    nodes = []

# examine 캐노니컬 코드그래프(있으면): units[].metrics 에서 클래스별 CK 파생
# examine metrics 형태: {"type":"ck","version":"1","values":{cbo,wmc,lcom,...}}
# → 프론트/AstClass.metrics 는 평면 {cbo,wmc,lcom,...} 을 기대하므로 values 를 펴고 null→0.
cg = None
class_metrics = []
try:
    cg = json.load(open("codegraph.json"))
    for u in (cg.get("units") or []):
        kind = str(u.get("kind", "")).lower()
        m = u.get("metrics")
        if m and ("class" in kind or "interface" in kind or "struct" in kind):
            vals = m.get("values") if isinstance(m, dict) and isinstance(m.get("values"), dict) else m
            flat = {k: (0 if v is None else v) for k, v in (vals or {}).items()}
            if flat:
                class_metrics.append({
                    "file": u.get("file") or "",
                    "name": u.get("name") or "",
                    "metrics": flat,
                })
except Exception:
    cg = None

proj = {
    "teamName": "$REPO_NAME",
    "jenkinsJobName": os.environ["JOB_NAME"],
    "sonarProjectKey": os.environ["JOB_NAME"],
    "analysis": {
        "jobName": os.environ["JOB_NAME"],
        "buildNumber": int(os.environ.get("BUILD_NUMBER", "0")),
        "status": "SUCCESS",
        "buildUrl": os.environ.get("BUILD_URL", "UNKNOWN"),
        "commitHash": os.environ.get("GIT_COMMIT", "unknown"),
    },
    "astNodes": nodes,
    "classMetrics": class_metrics,
}
if cg and cg.get("units"):
    proj["codeGraph"] = cg
payload = {"username": ["$REPO_OWNER"], "ProjectDto": proj}
json.dump(payload, open("payload.json", "w"))
print(">>> nodes:", len(nodes), "classMetrics:", len(class_metrics))
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
        always { sh 'rm -f code_package.zip ast.json codegraph.json payload.json resp.txt || true' }
    }
}`;
  }
}
