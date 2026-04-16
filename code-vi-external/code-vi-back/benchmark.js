const fs = require('fs');
const axios = require('axios');
const { performance } = require('perf_hooks');

const RELATIONAL_BASE = 'http://localhost:13000/api';
const SAMPLE_FILE = '/home/jaeho/workspace/CodeVi/ast_sample/ast_code_package_2026-03-12T17-16-30-857Z.json';

// ═══════════════════════════════════════════════════════
// 벤치마크 설정
// ═══════════════════════════════════════════════════════
const BENCHMARK_ITERATIONS = 30;  // 통계적 유의성을 위해 30회
const WARMUP_ITERATIONS = 5;       // JIT + 캐시 안정화를 위해 5회
const COOLDOWN_MS = 150;           // iteration 간 쿨다운 (ms)

// GC 제어 가능 여부 확인 (node --expose-gc benchmark.js 로 실행 시)
const canGC = typeof global.gc === 'function';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════
// 통계 유틸리티
// ═══════════════════════════════════════════════════════

function calcStats(durations) {
    if (durations.length === 0) return { avg: 0, median: 0, std: 0, min: 0, max: 0, p95: 0, count: 0 };

    const sorted = [...durations].sort((a, b) => a - b);
    const count = sorted.length;
    const avg = sorted.reduce((a, b) => a + b, 0) / count;
    const median = count % 2 === 0
        ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
        : sorted[Math.floor(count / 2)];
    const variance = sorted.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / count;
    const std = Math.sqrt(variance);
    const min = sorted[0];
    const max = sorted[count - 1];
    const p95 = sorted[Math.ceil(count * 0.95) - 1];

    return { avg, median, std, min, max, p95, count };
}

function formatMs(v) { return v.toFixed(2); }

function formatMemory(bytes) {
    if (bytes === 0) return '0 B';
    const kb = bytes / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(2)} KB`;
    }
    return `${(kb / 1024).toFixed(2)} MB`;
}

// ═══════════════════════════════════════════════════════
// 측정 함수
// ═══════════════════════════════════════════════════════

async function runStep(name, fn) {
    const start = performance.now();
    try {
        const result = await fn();
        const duration = performance.now() - start;
        let memDiffText = '';
        if (result.data?.serverMemoryBytes) {
            memDiffText = ` | Server Mem: ${(result.data.serverMemoryBytes / 1024 / 1024).toFixed(2)} MB`;
        }
        console.log(`✅ ${name}: ${duration.toFixed(2)}ms${memDiffText}`);
        return { duration, result, serverMemoryBytes: result.data?.serverMemoryBytes || 0 };
    } catch (e) {
        console.log(`❌ ${name} failed: ${e.response?.status} - ${JSON.stringify(e.response?.data) || e.message}`);
        return { duration: 0, error: e.message };
    }
}

/**
 * 단일 요청 측정 — 클라이언트 E2E 시간과 서버 쿼리 시간, 메모리 분리 기록
 */
async function measureOnce(fn) {
    const clientStart = performance.now();
    const response = await fn();
    const clientMs = performance.now() - clientStart;
    const serverMs = response.data?.serverQueryMs ?? null;
    const serverMem = response.data?.serverMemoryBytes ?? null;
    return { clientMs, serverMs, serverMem };
}

function countNodes(snapshot) {
    const dirs = snapshot.directories || [];
    let files = 0, classes = 0, funcs = 0;

    dirs.forEach(d => {
        files += (d.files || []).length;
        (d.files || []).forEach(f => {
            classes += (f.classes || []).length;
            funcs += (f.fileFunctions || []).length;
            (f.classes || []).forEach(c => {
                funcs += (c.methods || []).length;
            });
        });
    });

    return { directories: dirs.length, files, classes, functions: funcs };
}

// ═══════════════════════════════════════════════════════
// 메인 벤치마크
// ═══════════════════════════════════════════════════════

async function benchmark() {
    console.log('🚀 Starting Quantitative Benchmark (Relational AST Only)...');
    console.log(`   Settings: ${BENCHMARK_ITERATIONS} iterations, ${WARMUP_ITERATIONS} warmups, ${COOLDOWN_MS}ms cooldown`);
    if (canGC) console.log('   ✅ Manual GC enabled (--expose-gc)');
    else console.log('   ⚠️  Manual GC disabled. Run with: node --expose-gc benchmark.js');

    // 1. Loading data
    process.stdout.write('Reading 148MB sample data... ');
    let rawData;
    try {
        rawData = JSON.parse(fs.readFileSync(SAMPLE_FILE, 'utf-8'));
        console.log('Done.');
    } catch (e) {
        console.error('Failed to read sample file:', e.message);
        return;
    }
    const jenkinsJobName = 'benchmark-job-' + Date.now();

    const payload = {
        jenkinsJobName,
        nodes: Array.isArray(rawData) ? rawData : [rawData]
    };

    // 2. Setup (Ensuring TeamProject exists)
    console.log('\n--- Setup (Ensuring TeamProject exists) ---');
    await runStep('Relational: Create Project', () => axios.post(`${RELATIONAL_BASE}/team-projects`, {
        teamName: 'BenchmarkTeam',
        jenkinsJobName,
        sonarProjectKey: 'benchmark-sonar',
        analysis: {
            jobName: jenkinsJobName,
            buildNumber: 1,
            status: 'SUCCESS',
            buildUrl: 'http://dummy',
            commitHash: 'deadbeef'
        },
        astData: {}
    }));

    const results = {
        settings: {
            iterations: BENCHMARK_ITERATIONS,
            warmupIterations: WARMUP_ITERATIONS,
            cooldownMs: COOLDOWN_MS,
            gcEnabled: canGC,
            timestamp: new Date().toISOString()
        },
        save: { totalClientMs: 0, totalServerMemoryBytes: 0, jsonSaveMs: 0, jsonSaveMem: 0, relationalSaveMs: 0, relationalSaveMem: 0 },
        get: { relational: 0, serverMemoryBytes: 0 },
        counts: { relational: {} },
        queryBenchmark: {
            wholeJson: { client: {}, server: {}, memory: {} },
            join: { client: {}, server: {}, memory: {} },
            nested: { client: {}, server: {}, memory: {} }
        }
    };

    // 3. Save Benchmark (Whole JSON vs Relational)
    console.log('\n--- Save (Write) Efficiency ---');
    const relSave = await runStep('Save AST (Whole JSON + Relational Tree)', () => axios.post(`${RELATIONAL_BASE}/ast-data/relational`, payload, {
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30 * 60 * 1000
    }));
    results.save.totalClientMs = relSave.duration;
    results.save.totalServerMemoryBytes = relSave.serverMemoryBytes;
    
    // Extract server-side separated metrics
    const jsonSaveMs = relSave.result?.data?.jsonSaveMs || 0;
    const jsonSaveMem = relSave.result?.data?.jsonSaveMem || 0;
    const relationalSaveMs = relSave.result?.data?.relationalSaveMs || 0;
    const relationalSaveMem = relSave.result?.data?.relationalSaveMem || 0;

    results.save.jsonSaveMs = jsonSaveMs;
    results.save.jsonSaveMem = jsonSaveMem;
    results.save.relationalSaveMs = relationalSaveMs;
    results.save.relationalSaveMem = relationalSaveMem;

    // 4. Retrieve Benchmark and Inspect Data
    console.log('\n--- Full Retrieval (Read) Efficiency & Content Stats ---');

    if (relSave.result) {
        const relId = relSave.result.data.id;
        const relGet = await runStep('Relational: Get AST', () => axios.get(`${RELATIONAL_BASE}/ast-data/relational/${relId}`, {
            timeout: 30 * 60 * 1000
        }));
        results.get.relational = relGet.duration;

        const snapshot = relGet.result.data;
        results.counts.relational = countNodes(snapshot);

        // ═══════════════════════════════════════════════════════
        // 5. Query Method Benchmark: Whole JSON vs Natural Join vs Nested SQL
        // ═══════════════════════════════════════════════════════
        console.log(`\n${'═'.repeat(60)}`);
        console.log('   📊 Query Method Benchmark: Whole JSON vs Natural Join vs Nested SQL');
        console.log(`${'═'.repeat(60)}`);
        console.log(`   Snapshot ID: ${relId}`);
        console.log(`   Warmup iterations: ${WARMUP_ITERATIONS}`);
        console.log(`   Benchmark iterations: ${BENCHMARK_ITERATIONS}`);
        console.log(`   Cooldown per iteration: ${COOLDOWN_MS}ms`);
        console.log(`   Execution mode: INTERLEAVED (alternating 3 methods)`);
        console.log(`${'─'.repeat(60)}`);

        const joinFn = () => axios.get(`${RELATIONAL_BASE}/ast-data/relational/benchmark/natural-join/${relId}`, { timeout: 5 * 60 * 1000 });
        const nestedFn = () => axios.get(`${RELATIONAL_BASE}/ast-data/relational/benchmark/nested/${relId}`, { timeout: 5 * 60 * 1000 });
        const wholeJsonFn = () => axios.get(`${RELATIONAL_BASE}/ast-data/relational/benchmark/whole-json/${relId}`, { timeout: 5 * 60 * 1000 });

        // ── Warmup ──
        console.log(`\n🔥 Warming up (${WARMUP_ITERATIONS} iterations each)...`);
        for (let i = 0; i < WARMUP_ITERATIONS; i++) {
            await wholeJsonFn();
            await joinFn();
            await nestedFn();
            process.stdout.write(`  warmup ${i + 1}/${WARMUP_ITERATIONS}\r`);
        }
        console.log(`  ✅ Warmup complete (${WARMUP_ITERATIONS * 3} total calls)`);

        if (canGC) {
            global.gc();
            await sleep(200);
        }

        // ── 실행 ──
        console.log(`\n⏱  Running INTERLEAVED benchmark (${BENCHMARK_ITERATIONS} iterations)...`);

        const metrics = {
            wholeJson: { client: [], server: [], memory: [] },
            join: { client: [], server: [], memory: [] },
            nested: { client: [], server: [], memory: [] }
        };

        const methods = [
            { key: 'wholeJson', fn: wholeJsonFn },
            { key: 'join', fn: joinFn },
            { key: 'nested', fn: nestedFn }
        ];

        for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
            if (canGC) global.gc();

            // 순서 로테이션
            const order = methods.slice();
            const shiftCount = i % 3;
            for(let k=0; k<shiftCount; k++) order.push(order.shift());

            try {
                for (const item of order) {
                    const m = await measureOnce(item.fn);
                    metrics[item.key].client.push(m.clientMs);
                    if (m.serverMs !== null && m.serverMs !== undefined) metrics[item.key].server.push(m.serverMs);
                    if (m.serverMem !== null && m.serverMem !== undefined) metrics[item.key].memory.push(m.serverMem);
                    await sleep(COOLDOWN_MS);
                }
            } catch (e) {
                console.log(`  ❌ Iteration ${i + 1} failed: ${e.message}`);
            }

            if ((i + 1) % 5 === 0 || i === BENCHMARK_ITERATIONS - 1) {
                process.stdout.write(`  progress: ${i + 1}/${BENCHMARK_ITERATIONS}\r`);
            }
        }
        console.log(`\n  ✅ Benchmark complete.`);

        // ── 통계 계산 ──
        const stats = {
            wholeJson: {
                client: calcStats(metrics.wholeJson.client),
                server: calcStats(metrics.wholeJson.server),
                memory: calcStats(metrics.wholeJson.memory)
            },
            join: {
                client: calcStats(metrics.join.client),
                server: calcStats(metrics.join.server),
                memory: calcStats(metrics.join.memory)
            },
            nested: {
                client: calcStats(metrics.nested.client),
                server: calcStats(metrics.nested.server),
                memory: calcStats(metrics.nested.memory)
            }
        };

        results.queryBenchmark.wholeJson = stats.wholeJson;
        results.queryBenchmark.join = stats.join;
        results.queryBenchmark.nested = stats.nested;

        // ── 결과 출력 ──
        console.log(`\n${'═'.repeat(60)}`);
        console.log('   📊 Query Benchmark Results — Client E2E Time (ms)');
        console.log(`${'═'.repeat(60)}`);
        console.table({
            'Avg': { 'Whole JSON': formatMs(stats.wholeJson.client.avg), 'Natural Join': formatMs(stats.join.client.avg), 'Nested SQL': formatMs(stats.nested.client.avg) },
            'Median': { 'Whole JSON': formatMs(stats.wholeJson.client.median), 'Natural Join': formatMs(stats.join.client.median), 'Nested SQL': formatMs(stats.nested.client.median) },
            'Std Dev': { 'Whole JSON': formatMs(stats.wholeJson.client.std), 'Natural Join': formatMs(stats.join.client.std), 'Nested SQL': formatMs(stats.nested.client.std) },
            'P95': { 'Whole JSON': formatMs(stats.wholeJson.client.p95), 'Natural Join': formatMs(stats.join.client.p95), 'Nested SQL': formatMs(stats.nested.client.p95) },
        });

        console.log(`\n${'═'.repeat(60)}`);
        console.log('   📊 Query Benchmark Results — Server Query Time (ms)');
        console.log(`${'═'.repeat(60)}`);
        console.table({
            'Avg': { 'Whole JSON': formatMs(stats.wholeJson.server.avg), 'Natural Join': formatMs(stats.join.server.avg), 'Nested SQL': formatMs(stats.nested.server.avg) },
            'Median': { 'Whole JSON': formatMs(stats.wholeJson.server.median), 'Natural Join': formatMs(stats.join.server.median), 'Nested SQL': formatMs(stats.nested.server.median) },
            'Std Dev': { 'Whole JSON': formatMs(stats.wholeJson.server.std), 'Natural Join': formatMs(stats.join.server.std), 'Nested SQL': formatMs(stats.nested.server.std) },
            'P95': { 'Whole JSON': formatMs(stats.wholeJson.server.p95), 'Natural Join': formatMs(stats.join.server.p95), 'Nested SQL': formatMs(stats.nested.server.p95) },
        });

        console.log(`\n${'═'.repeat(60)}`);
        console.log('   📊 Query Benchmark Results — Server Memory Usage');
        console.log(`${'═'.repeat(60)}`);
        console.table({
            'Avg': { 'Whole JSON': formatMemory(stats.wholeJson.memory.avg), 'Natural Join': formatMemory(stats.join.memory.avg), 'Nested SQL': formatMemory(stats.nested.memory.avg) },
            'Median': { 'Whole JSON': formatMemory(stats.wholeJson.memory.median), 'Natural Join': formatMemory(stats.join.memory.median), 'Nested SQL': formatMemory(stats.nested.memory.median) },
            'Std Dev': { 'Whole JSON': formatMemory(stats.wholeJson.memory.std), 'Natural Join': formatMemory(stats.join.memory.std), 'Nested SQL': formatMemory(stats.nested.memory.std) },
            'P95': { 'Whole JSON': formatMemory(stats.wholeJson.memory.p95), 'Natural Join': formatMemory(stats.join.memory.p95), 'Nested SQL': formatMemory(stats.nested.memory.p95) },
        });

    }

        // 저장 성능 비교
    console.log(`\n${'═'.repeat(60)}`);
    console.log('   📊 Save (Write) Performance Comparison');
    console.log(`${'═'.repeat(60)}`);
    console.table({
        'Server Time (ms)': { 'Whole JSON': formatMs(results.save.jsonSaveMs), 'Relational Tree': formatMs(results.save.relationalSaveMs) },
        'Server Memory': { 'Whole JSON': formatMemory(results.save.jsonSaveMem), 'Relational Tree': formatMemory(results.save.relationalSaveMem) }
    });

        // 최종 결과 요약
    console.log('\n📊 Overall Relational Summary (Client / Fetch Focus):');
    console.table({
        'Total Save E2E (Client)': { Time: `${results.save.totalClientMs.toFixed(2)} ms` },
        'Total Fetch Time (Client)': { Time: `${results.get.relational.toFixed(2)} ms` },
        'Stored Files': { Count: String(results.counts.relational.files) },
        'Stored Functions': { Count: String(results.counts.relational.functions) }
    });

    console.log('\n💡 Analysis:');
    console.log('- Relational stores only structural metadata (Directory/File/Class/Function).');
    console.log(`- Data reduction ratio: approx 148MB JSON -> structural relational snapshot.`);

    // ═══════════════════════════════════════════════════════
    // 6. Save Results to File
    // ═══════════════════════════════════════════════════════
    const resultsDir = './results';
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const resultFilePath = `${resultsDir}/benchmark_${timestamp}.json`;

    fs.writeFileSync(resultFilePath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Benchmark results saved to: ${resultFilePath}`);
}

benchmark();
