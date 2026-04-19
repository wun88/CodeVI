async function run() {
  const teamProjectDto = {
    teamName: '시각화 테스트 팀',
    jenkinsJobName: 'demo-viz-pipeline',
    sonarProjectKey: 'demo-key',
    analysis: {
      status: 'SUCCESS',
      buildNumber: 101,
      jobName: 'demo-viz-pipeline',
      buildUrl: 'http://jenkins/job/demo-viz-pipeline/101/',
      commitHash: 'a1b2c3d4e5f6',
      pyExamineResult: []
    }
  };

  const astData = {
    jenkinsJobName: 'demo-viz-pipeline',
    buildNumber: 101,
    buildUrl: 'http://jenkins/job/demo-viz-pipeline/101/',
    nodes: [
      {
        type: 'DIRECTORY',
        name: 'src',
        children: [
          {
            type: 'FILE',
            name: 'main.ts',
            ast: {
              type: 'CLASS',
              name: 'AppServer',
              metrics: { cbo: 2, rfc: 5, lcom: 85, wmc: 3, dit: 1, noc: 0 },
              range: { start: { line: 5, col: 0 }, end: { line: 100, col: 0 } },
              children: [
                {
                  type: 'METHOD',
                  name: 'startListener',
                  range: { start: { line: 10, col: 2 }, end: { line: 20, col: 3 } }
                },
                {
                  type: 'METHOD',
                  name: 'closeConnection',
                  range: { start: { line: 22, col: 2 }, end: { line: 30, col: 3 } }
                }
              ]
            }
          },
          {
            type: 'DIRECTORY',
            name: 'utils',
            children: [
              {
                type: 'FILE',
                name: 'helper.ts',
                ast: {
                  type: 'unknown',
                  children: [
                    {
                      type: 'FUNCTION',
                      name: 'formatDate',
                      range: { start: { line: 1, col: 0 }, end: { line: 5, col: 0 } }
                    },
                    {
                      type: 'FUNCTION',
                      name: 'parseUrl',
                      range: { start: { line: 8, col: 0 }, end: { line: 15, col: 0 } }
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  };

  console.log('1. 임시 프로젝트 개설 시도...');
  let res1 = await fetch('http://localhost:13000/api/team-projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(teamProjectDto)
  });
  console.log(await res1.text());

  console.log('\n2. AST 스냅샷 계층 데이터 주입...');
  let res2 = await fetch('http://localhost:13000/api/ast-data/relational', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(astData)
  });
  console.log(await res2.text());
}

run().catch(console.error);
