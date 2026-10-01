import { similarityService } from '../services/similarity.service';
import { accuracyService } from '../services/accuracy.service';
import { pool } from '../config/database';

async function runTests() {
  console.log('=== PHASE 18 総合機能検証テスト開始 ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. 類似検索スコアリングテスト
  console.log('--- 1. 類似検索スコアリング ---');
  const target = {
    material: 'SUS304',
    machineName: 'Citizen Cincom L20',
    diameter: 10.0,
    features: ['OD', 'DRILL', 'CUTOFF'],
    maxDiameter: 10.0,
    minDiameter: 5.0,
    overallLength: 30.0,
  };

  // 1.1 完全一致ケース (材料一致20, 設備一致15, 径一致15, Feature一致35, 寸法一致15 = 100点)
  const perfectMatch = {
    material: 'SUS304',
    machineName: 'Citizen Cincom L20',
    diameter: 10.0,
    features: ['OD', 'DRILL', 'CUTOFF'],
    maxDiameter: 10.0,
    minDiameter: 5.0,
    overallLength: 30.0,
  };
  const b1 = similarityService.calculateSimilarityScore(target, perfectMatch);
  assert(b1.totalScore === 100, `完全一致スコアが100点であること (実測: ${b1.totalScore})`);
  assert(b1.materialScore === 20, `材料完全一致で20点 (実測: ${b1.materialScore})`);
  assert(b1.machineScore === 15, `設備完全一致で15点 (実測: ${b1.machineScore})`);
  assert(b1.diameterScore === 15, `素材径完全一致で15点 (実測: ${b1.diameterScore})`);
  assert(b1.featureScore === 35, `Feature完全一致で35点 (実測: ${b1.featureScore})`);
  assert(b1.dimensionScore === 15, `寸法完全一致で15点 (実測: ${b1.dimensionScore})`);

  // 1.2 材料不一致・設備不一致 (0点)
  const differentMatMac = {
    material: 'S45C',
    machineName: 'Citizen Cincom M32',
    diameter: 10.0,
    features: ['OD', 'DRILL', 'CUTOFF'],
    maxDiameter: 10.0,
    minDiameter: 5.0,
    overallLength: 30.0,
  };
  const b2 = similarityService.calculateSimilarityScore(target, differentMatMac);
  assert(b2.materialScore === 0, `材料不一致で0点 (実測: ${b2.materialScore})`);
  assert(b2.machineScore === 0, `設備不一致で0点 (実測: ${b2.machineScore})`);

  // 1.3 径差率テスト (8%差: 10%以内 -> 12点, 18%差: 20%以内 -> 8点, 25%差: 30%以内 -> 4点, 40%差: 0点)
  const dDiff10 = { ...perfectMatch, diameter: 10.8 };
  const dDiff20 = { ...perfectMatch, diameter: 11.8 };
  const dDiff30 = { ...perfectMatch, diameter: 12.5 };
  const dDiffOver = { ...perfectMatch, diameter: 15.0 };
  assert(similarityService.calculateSimilarityScore(target, dDiff10).diameterScore === 12, '径8%差で12点');
  assert(similarityService.calculateSimilarityScore(target, dDiff20).diameterScore === 8, '径18%差で8点');
  assert(similarityService.calculateSimilarityScore(target, dDiff30).diameterScore === 4, '径25%差で4点');
  assert(similarityService.calculateSimilarityScore(target, dDiffOver).diameterScore === 0, '径40%差で0点');

  // 1.4 Feature Jaccard係数テスト
  const halfFeatures = { ...perfectMatch, features: ['OD', 'GROOVE'] }; // target: ['OD', 'DRILL', 'CUTOFF']. 共通: OD(1), 和集合: OD, DRILL, CUTOFF, GROOVE (4). Jaccard = 1/4 = 0.25 * 35 = 8.75
  const bJaccard = similarityService.calculateSimilarityScore(target, halfFeatures);
  assert(bJaccard.featureScore === 8.75, `Jaccard係数計算正確性 (実測: ${bJaccard.featureScore})`);

  // 1.5 類似検索APIサービス実行
  const simResult = await similarityService.findSimilarQuotes(5, 5);
  assert(Array.isArray(simResult.results), '類似検索APIが配列を返すこと');
  assert(simResult.results.length > 0, `類似案件が抽出されること (${simResult.results.length}件抽出)`);
  if (simResult.results.length > 1) {
    const isSorted = simResult.results.every((val, i, arr) => i === 0 || arr[i - 1].similarityScore >= val.similarityScore);
    assert(isSorted, '類似案件がスコア降順でソートされていること');
  }

  // 2. 精度評価・集計テスト
  console.log('\n--- 2. 精度評価・集計 ---');
  const execRes = await accuracyService.executeAccuracyEvaluation();
  assert(execRes.evaluatedCount >= 0, `精度評価一括実行 (評価件数: ${execRes.evaluatedCount})`);

  const summary = await accuracyService.getSummary();
  assert(summary.totalEvaluations > 0, `全体KPI評価件数 > 0 (実測: ${summary.totalEvaluations}件)`);
  assert(summary.avgAbsoluteErrorRate >= 0, `平均絶対誤差率の取得 (実測: ${summary.avgAbsoluteErrorRate}%)`);
  assert(summary.within10PercentRate >= 0 && summary.within10PercentRate <= 100, `10%以内率妥当性 (実測: ${summary.within10PercentRate}%)`);

  const machines = await accuracyService.getMachineAccuracy();
  assert(machines.length > 0, `設備別精度集計の取得 (${machines.length}設備)`);

  const materials = await accuracyService.getMaterialAccuracy();
  assert(materials.length > 0, `材料別精度集計の取得 (${materials.length}材料)`);

  const trends = await accuracyService.getMonthlyTrends();
  assert(trends.length > 0, `月別推移データの取得 (${trends.length}月)`);

  const effect = await accuracyService.getCorrectionEffect();
  assert(effect.sampleCount >= 0, `補正効果比較の取得 (サンプル数: ${effect.sampleCount})`);

  // 3. 改善候補生成 & 技術者承認テスト
  console.log('\n--- 3. 改善候補生成 & 承認フロー ---');
  const candidates = await accuracyService.getImprovementCandidates();
  assert(Array.isArray(candidates), '改善候補一覧が配列で取得できること');
  assert(candidates.length > 0, `改善候補が抽出できること (${candidates.length}件)`);

  // 改善候補の承認テスト (手動更新のみ・自動適用禁止の確認)
  const candToApprove = candidates[0];
  if (candToApprove) {
    const testFactor = Number((candToApprove.currentFactor + 0.01).toFixed(4));
    await accuracyService.applyImprovementCandidate(candToApprove.id, testFactor, 'テスト承認者');
    const [updatedRows] = await pool.query<any>('SELECT factor, approved, approved_by FROM lathe_correction_factors WHERE id = ?', [candToApprove.id]);
    assert(Number(updatedRows[0].factor) === testFactor, `承認実行でfactorが更新されること (実測: ${updatedRows[0].factor})`);
    assert(Boolean(updatedRows[0].approved) === true, 'approvedフラグが1になること');
    assert(updatedRows[0].approved_by === 'テスト承認者', 'approved_byに実行者が記録されること');
  }

  console.log(`\n=== テスト完了: 合格 ${passed}件, 失敗 ${failed}件 ===`);
  pool.end();
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  pool.end();
  process.exit(1);
});
