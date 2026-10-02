import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { DrawingService } from '../../services/drawing.service';
import { FeatureService } from '../../services/feature.service';
import { OperationService } from '../../services/operation.service';
import { CycleTimeService } from '../../services/cycle-time.service';
import { LatheService } from '../../services/lathe.service';
import { CalculationService } from '../../services/calculation.service';
import { ActualCycleTimeService } from '../../services/actual-cycle-time.service';
import { MaterialService } from '../../services/material.service';
import { Quote } from '../../models/quote.model';
import { Drawing } from '../../models/drawing.model';
import { DrawingAnalysis, Feature, UpdateFeatureRequest } from '../../models/feature.model';
import { Operation, UpdateOperationRequest } from '../../models/operation.model';
import { CycleTimeResult } from '../../models/cycle-time.model';
import { AutomaticLatheOperation, LatheCycleTimeSummary } from '../../models/lathe.model';
import { Machine, QuoteMachineSelection } from '../../models/machine.model';
import {
  ActualCycleTime,
  CreateActualCycleTimeRequest,
  CycleTimeComparison,
} from '../../models/actual-cycle-time.model';
import {
  MaterialInformation,
  SaveMaterialRequest,
  ShapeType,
} from '../../models/material.model';
import { CycleTimeEvaluationService } from '../../services/cycle-time-evaluation.service';
import {
  CreateCycleTimeEvaluationRequest,
  CycleTimeEvaluation,
  DifferenceCategory,
  LatheCorrectionFactor,
} from '../../models/cycle-time-evaluation.model';
import { ProductionActualService } from '../../services/production-actual.service';
import { ProductionActualRecord } from '../../models/production-actual.model';
import { CorrectionService } from '../../services/correction.service';
import { CorrectionHistoryItem } from '../../models/correction.model';
import { QuoteManagementService } from '../../services/quote-management.service';
import {
  QuoteBasis,
  QuoteHistory,
  QuoteResult,
  QuoteStatus,
  SimilarQuoteItem,
} from '../../models/quote-management.model';
import { SimilarQuoteResult } from '../../../../core/models/similarity.model';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './quote-detail.html',
  styleUrl: './quote-detail.scss',
})
export class QuoteDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quoteService = inject(QuoteService);
  private readonly drawingService = inject(DrawingService);
  private readonly featureService = inject(FeatureService);
  private readonly operationService = inject(OperationService);
  private readonly cycleTimeService = inject(CycleTimeService);
  private readonly latheService = inject(LatheService);
  private readonly calculationService = inject(CalculationService);
  private readonly actualCycleTimeService = inject(ActualCycleTimeService);
  private readonly correctionService = inject(CorrectionService);
  private readonly materialService = inject(MaterialService);
  private readonly cycleTimeEvaluationService = inject(CycleTimeEvaluationService);
  private readonly productionActualService = inject(ProductionActualService);
  private readonly quoteManagementService = inject(QuoteManagementService);

  quote = signal<Quote | null>(null);
  drawings = signal<Drawing[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // 生産実績DB (sadoa) 連携関連シグナル (PHASE14)
  productionActualRecords = signal<ProductionActualRecord[]>([]);
  isLoadingProductionActual = signal<boolean>(false);
  isSyncingProduction = signal<boolean>(false);
  productionSyncMessage = signal<string | null>(null);
  productionSyncError = signal<string | null>(null);

  // 精度評価・Excel比較関連シグナル (PHASE13)
  evaluations = signal<CycleTimeEvaluation[]>([]);
  correctionFactors = signal<LatheCorrectionFactor[]>([]);
  isLoadingEvaluations = signal<boolean>(false);
  isSubmittingEvaluation = signal<boolean>(false);
  evaluationErrorMessage = signal<string | null>(null);
  evaluationSuccessMessage = signal<string | null>(null);
  showEvaluationModal = signal<boolean>(false);
  evaluationForm: CreateCycleTimeEvaluationRequest = {
    machineId: null,
    calculatedCycleTimeSec: null,
    excelCycleTimeSec: null,
    actualCycleTimeSec: null,
    differenceCategory: 'OTHER',
    notes: '',
  };

  // 素材情報関連シグナル (PHASE11)
  materialInfo = signal<MaterialInformation | null>(null);
  isLoadingMaterial = signal<boolean>(false);
  isSavingMaterial = signal<boolean>(false);
  materialErrorMessage = signal<string | null>(null);
  materialSuccessMessage = signal<string | null>(null);
  showMaterialModal = signal<boolean>(false);
  materialForm: SaveMaterialRequest = {
    materialName: '',
    materialStandard: '',
    shapeType: 'ROUND_BAR',
    diameter: null,
    width: null,
    height: null,
    length: null,
    weight: null,
  };

  isUploading = signal<boolean>(false);
  drawingErrorMessage = signal<string | null>(null);
  selectedFile = signal<File | null>(null);

  // 加工機・計算エンジン関連 (PHASE09)
  machines = signal<Machine[]>([]);
  selectedMachineId = signal<number | null>(null);
  selectedMachine = signal<Machine | null>(null);
  isChangingMachine = signal<boolean>(false);
  machineMessage = signal<string | null>(null);
  // 人による主軸上限RPMの介入設定
  userMaxRpm = signal<number | null>(null);

  // 実績比較タブの表示制御（現在は非表示、将来の拡張用に保持）
  showComparisonTab = signal<boolean>(false);

  // タブ切り替え: 目的別構成
  // 'overview' (STEP1: 図面・AI解析) | 'review' (STEP2: 加工内容確認) | 'calculation' (STEP3: 設備・CT計算) | 'comparison' (STEP4: 実績比較/非表示) | 'complete' (STEP4/5: 見積確定・根拠)
  activeTab = signal<'overview' | 'review' | 'calculation' | 'comparison' | 'complete'>('overview');
  reviewSubTab = signal<'features' | 'operations'>('features');

  // PHASE17: 見積確定・根拠・履歴管理シグナル
  quoteResult = signal<QuoteResult | null>(null);
  quoteBasis = signal<QuoteBasis | null>(null);
  quoteManagementHistory = signal<QuoteHistory[]>([]);
  similarQuotes = signal<SimilarQuoteItem[]>([]);
  advancedSimilarQuotes = signal<SimilarQuoteResult[]>([]);
  isCompletingQuote = signal<boolean>(false);
  isLoadingBasis = signal<boolean>(false);
  isLoadingSimilar = signal<boolean>(false);
  completeSuccessMessage = signal<string | null>(null);
  completeErrorMessage = signal<string | null>(null);
  completeForm = {
    notes: '',
    operatorName: '見積担当者',
  };

  /**
   * 各自動旋盤の最大加工径（バー材能力）
   */
  getMachineMaxDiameter(machineName: string): number {
    const name = machineName.toUpperCase();
    if (name.includes('M16')) return 16;
    if (name.includes('L20') || name.includes('M20')) return 20;
    if (name.includes('M32') || name.includes('L32')) return 32;
    return 366; // 汎用NC旋盤
  }

  /**
   * 有効素材径の取得
   */
  getEffectiveStockDiameter(): number {
    if (this.materialInfo()?.diameter) return Number(this.materialInfo()!.diameter);
    if (this.activeAnalysis()?.stockDiameter) return Number(this.activeAnalysis()!.stockDiameter);
    const feats = this.features();
    if (feats.length > 0) {
      const dias = feats.map((f) => (f.diameter !== null && f.diameter !== undefined ? Number(f.diameter) : 0));
      return Math.max(...dias, 0);
    }
    return 0;
  }

  /**
   * 指定した設備が素材径に対して能力オーバーか判定
   */
  isMachineOverCapacity(m: Machine): boolean {
    const stockDia = this.getEffectiveStockDiameter();
    if (!stockDia || stockDia <= 0) return false;
    const maxDia = this.getMachineMaxDiameter(m.machineName);
    return stockDia > maxDia;
  }

  /**
   * 現在選択中の設備が能力オーバーか判定
   */
  isSelectedMachineOverCapacity(): boolean {
    const m = this.selectedMachine();
    if (!m) return false;
    return this.isMachineOverCapacity(m);
  }

  /**
   * 見積根拠総合解説レポート（長文テキスト生成）
   */
  calculationBasisNarrative = computed<string>(() => {
    const q = this.quote();
    const ct = this.latheCycleTime();
    const m = this.selectedMachine();
    const analysis = this.activeAnalysis();
    const mat = this.materialInfo();
    const ops = ct?.operations || [];
    const feats = this.features();

    if (!q || !ct) {
      return 'サイクルタイムが未計算のため、根拠解説を生成できません。先にSTEP 3で計算を実行してください。';
    }

    const materialName = mat?.materialName || analysis?.material || 'S45C';
    const effectiveStockDia = this.getEffectiveStockDiameter();
    const stockDiaText = effectiveStockDia > 0 ? `${effectiveStockDia}mm` : '完成寸法より補完';
    const machineName = m?.machineName || ct.machineName || 'Citizen Cincom L20';
    const effectiveRpm = this.userMaxRpm() || m?.maxRpm || 10000;
    const totalSec = ct.totalCycleTimeSec;
    const lotTotalMin = (ct.totalLotTimeSec / 60).toFixed(1);
    const cuttingSec = ct.cuttingTimeSec;
    const nonCuttingSec = ct.nonCuttingTimeSec;

    const turningOps = ops.filter(
      (o) =>
        o.processCategory === 'TURNING' ||
        o.processName.includes('外径') ||
        o.processName.includes('内径')
    );
    const faceOps = ops.filter((o) => o.processName.includes('端面'));
    const holeOps = ops.filter(
      (o) =>
        o.processCategory === 'DRILLING' ||
        o.processName.includes('穴') ||
        o.processName.includes('タップ')
    );
    const cutoffOps = ops.filter((o) => o.processName.includes('突切り'));

    let text = `【見積サイクルタイム算出根拠 総合報告書】\n\n`;
    text += `■ 1. 対象ワークおよび素材仕様の適合性\n`;
    text += `本案件（図番: ${q.partNo || '未指定'} / 品名: ${q.partName || '未指定'} / 顧客: ${q.customerName}）について、図面AI解析および入力仕様に基づき、材質「${materialName}」、素材径「φ${stockDiaText}」を前提条件として設定いたしました。\n`;
    text += `抽出された加工部位は計${feats.length}箇所であり、外径段差、端面基準面、穴あけ、および突切り形状で構成される回転体旋盤加工部品として適正に認識されています。\n\n`;

    text += `■ 2. 選定加工設備と機械的成立性\n`;
    text += `主加工設備として「${machineName}」（ガイドブッシュ式高精度NC自動旋盤）を選定いたしました。\n`;
    text += `素材径 φ${stockDiaText} は本設備のバー材許容加工能力（最大把握径 φ${this.getMachineMaxDiameter(machineName)}mm）に合致しており、機械干渉なく高剛性な連続バー材加工が成立します。\n`;
    text += `また、主軸回転数は安全余裕およびワーク把握バランスを考慮し、上限設定「${effectiveRpm} rpm」を基準として各工程の切削条件（切削速度Vcおよび送りF）に制限を適用しています。\n\n`;

    text += `■ 3. 切削時間の積算根拠（粗加工＋仕上げ加工の2パス構成）\n`;
    text += `金属加工の実務基準に則り、純切削時間（${cuttingSec} 秒）は単一の一発加工ではなく、確実な寸法精度と指示面粗さを達成する工程分割で算出しています。\n`;
    text += `・外径/内径切削（${turningOps.length}工程）: 素材外径と各仕上がり径の取り代に応じ、切込み深さ(ap)から必要粗加工（荒挽き）パス数を自動算定。さらに仕上げ代（半径0.2mm）に対し、面粗さ基準を満たす低送り（粗加工比約60%送り）での仕上げ挽き1パスおよび戻り早送り時間を厳密に積算しています。\n`;
    if (faceOps.length > 0) {
      text += `・端面切削: 黒皮除去の端面荒削り（1パス）に加え、基準端面精度を担保する端面仕上げ削り（1パス）の合計2パスで計算しています。\n`;
    }
    if (holeOps.length > 0) {
      text += `・穴あけ/ねじ加工（${holeOps.length}工程）: 刃具径に応じた最適周速・ステップ送りおよび正転・逆転同期サイクルを考慮しています。\n`;
    }
    if (cutoffOps.length > 0) {
      text += `・突切り工程: 製品切落しおよびサブスピンドルによる突っ切りピックアップ時間を加算しています。\n`;
    }
    text += `\n`;

    text += `■ 4. 非切削時間（機械固定付帯動作）の積算根拠\n`;
    text += `非切削時間（${nonCuttingSec} 秒）は、NC自動旋盤の標準動作マスタに基づき算出されています。\n`;
    text += `・工具割出し・アプローチ時間: 各工具ステーション交換時間（約1.5秒）＋切削アプローチ/エスケープ（1.0秒）を全工程分積算。\n`;
    text += `・機械固定サイクル時間: バーフィーダーによる材料送り出し（2.5秒）、製品突っ切りピックアップ・パーツキャッチャー回収（2.0秒）、主軸加減速およびアイドル待機時間（2.0秒）を確実に反映しています。\n\n`;

    text += `■ 5. 実績補正係数と最終予測の妥当性\n`;
    if (ct.correctionApplied && ct.correctionFactor) {
      text += `過去に蓄積された同種材質・形状加工実績データとの照合により、承認済み実績補正係数「×${ct.correctionFactor}」（信頼度: ${ct.confidenceLevel || 'NORMAL'} / 判定: ${ct.correctionReason || '実績フィードバック'}）を適用いたしました。\n`;
    } else {
      text += `本予測では標準切削条件マスタおよび機械仕様に基づく確定理論値（補正係数 ×1.00）を採用しており、理論的な根拠に基づいた安全率の高い見積基礎数値となっています。\n`;
    }
    text += `\n`;

    text += `■ 6. 総合見積結論\n`;
    text += `以上の加工検証に基づき、製品1個あたりの予測サイクルタイムを「${totalSec} 秒」（約${(totalSec / 60).toFixed(2)}分）、ご指定ロット（${q.quantity} 個）における総加工時間を「${ct.totalLotTimeSec} 秒」（約${lotTotalMin}分）と確定算出いたしました。\n`;
    text += `加工現場のオペレータ作業やNC段取り替え、および初品検査を円滑に進めるための確実な根拠としてご利用いただけます。`;

    return text;
  });

  // 実績フィードバック関連シグナル (PHASE10)
  actualCycleTimes = signal<ActualCycleTime[]>([]);
  comparison = signal<CycleTimeComparison | null>(null);
  isLoadingActual = signal<boolean>(false);
  isLoadingComparison = signal<boolean>(false);
  isSubmittingActual = signal<boolean>(false);
  actualErrorMessage = signal<string | null>(null);
  actualSuccessMessage = signal<string | null>(null);

  // 実績登録モーダル用
  showActualModal = signal<boolean>(false);
  actualInputMode = signal<'unit' | 'total'>('unit');
  totalMachiningTimeSec = signal<number | null>(null);
  actualForm: CreateActualCycleTimeRequest = {
    machineId: null,
    productionDate: new Date().toISOString().split('T')[0],
    quantity: 1,
    actualCycleTimeSec: 0,
    setupTimeSec: 0,
    operatorName: '',
    notes: '',
  };

  // NC自動旋盤エンジン関連シグナル (PHASE08)
  latheOperations = signal<AutomaticLatheOperation[]>([]);
  latheCycleTime = signal<LatheCycleTimeSummary | null>(null);
  isLoadingLatheOps = signal<boolean>(false);
  isGeneratingLatheOps = signal<boolean>(false);
  isCalculatingLatheCt = signal<boolean>(false);
  latheErrorMessage = signal<string | null>(null);
  latheSuccessMessage = signal<string | null>(null);

  // PHASE16: 補正Engine履歴シグナル
  correctionHistory = signal<CorrectionHistoryItem[]>([]);
  isLoadingCorrectionHistory = signal<boolean>(false);

  // サイクルタイム計算関連シグナル
  cycleTimeResult = signal<CycleTimeResult | null>(null);
  isCalculatingCycleTime = signal<boolean>(false);
  isLoadingCycleTime = signal<boolean>(false);
  cycleTimeErrorMessage = signal<string | null>(null);
  cycleTimeSuccessMessage = signal<string | null>(null);

  // AI解析・Feature関連シグナル
  selectedDrawingId = signal<number | null>(null);
  activeAnalysis = signal<DrawingAnalysis | null>(null);
  features = signal<Feature[]>([]);
  isLoadingAnalysis = signal<boolean>(false);
  isLoadingFeatures = signal<boolean>(false);
  isAnalyzing = signal<boolean>(false);
  isGeneratingFeatures = signal<boolean>(false);
  featureErrorMessage = signal<string | null>(null);
  featureSuccessMessage = signal<string | null>(null);

  // Feature編集モーダル用シグナル
  editingFeature = signal<Feature | null>(null);
  editForm: UpdateFeatureRequest = {
    featureType: 'OD',
    description: '',
    diameter: null,
    length: null,
    depth: null,
    needsReview: false,
  };

  // 加工工程(Operations)関連シグナル
  operations = signal<Operation[]>([]);
  isLoadingOperations = signal<boolean>(false);
  isGeneratingOperations = signal<boolean>(false);
  operationErrorMessage = signal<string | null>(null);
  operationSuccessMessage = signal<string | null>(null);

  // 工程編集モーダル用シグナル
  editingOperation = signal<Operation | null>(null);
  editOperationForm: UpdateOperationRequest = {
    sequenceNo: 1,
    description: '',
    machineType: 'CNC_LATHE',
    status: 'GENERATED',
  };

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? parseInt(idParam, 10) : null;

    if (!id || isNaN(id)) {
      this.errorMessage.set('無効な見積案件IDです。');
      return;
    }

    this.loadQuote(id);
    this.loadDrawings(id);
    this.loadOperations(id);
    this.loadCycleTime(id);
    this.loadLatheOperations(id);
    this.loadLatheCycleTime(id);
    this.loadMachinesAndSelection(id);
    this.loadActualCycleTimes(id);
    this.loadComparison(id);
    this.loadMaterial(id);
    this.loadEvaluations(id);
    this.loadCorrectionFactors();
    this.loadProductionActual(id);
    this.loadCorrectionHistory(id);
    this.loadQuoteResult(id);
    this.loadQuoteBasis(id);
    this.loadQuoteManagementHistory(id);
    this.loadAdvancedSimilarQuotes(id);
  }

  loadQuote(id: number): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.quoteService.getQuote(id).subscribe({
      next: (data) => {
        this.quote.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('見積案件の取得に失敗しました。');
        this.isLoading.set(false);
      },
    });
  }

  loadDrawings(quoteId: number): void {
    this.drawingService.getDrawings(quoteId).subscribe({
      next: (response) => {
        this.drawings.set(response.items);
        if (response.items.length > 0) {
          // 最初の図面を自動選択
          const firstDrawingId = response.items[0].id;
          if (this.selectedDrawingId() !== firstDrawingId) {
            this.selectDrawing(firstDrawingId);
          }
        } else {
          this.selectedDrawingId.set(null);
          this.activeAnalysis.set(null);
          this.features.set([]);
        }
      },
      error: () => {
        this.drawingErrorMessage.set('図面一覧の取得に失敗しました。');
      },
    });
  }

  selectDrawing(drawingId: number): void {
    this.selectedDrawingId.set(drawingId);
    this.featureErrorMessage.set(null);
    this.featureSuccessMessage.set(null);
    this.isLoadingAnalysis.set(true);

    this.drawingService.getLatestAnalysis(drawingId).subscribe({
      next: (analysis) => {
        this.activeAnalysis.set(analysis);
        this.isLoadingAnalysis.set(false);
        if (analysis) {
          this.loadFeatures(analysis.id);
        } else {
          this.features.set([]);
        }
      },
      error: () => {
        this.activeAnalysis.set(null);
        this.features.set([]);
        this.isLoadingAnalysis.set(false);
      },
    });
  }

  loadFeatures(analysisId: number): void {
    this.isLoadingFeatures.set(true);
    this.featureService.getFeatures(analysisId).subscribe({
      next: (res) => {
        this.features.set(res.items);
        this.isLoadingFeatures.set(false);
      },
      error: () => {
        this.features.set([]);
        this.isLoadingFeatures.set(false);
      },
    });
  }

  runAnalysis(drawingId: number): void {
    this.isAnalyzing.set(true);
    this.featureErrorMessage.set(null);
    this.featureSuccessMessage.set(null);

    this.drawingService.analyzeDrawing(drawingId).subscribe({
      next: (res) => {
        this.isAnalyzing.set(false);
        this.featureSuccessMessage.set('AI解析が正常に完了しました。加工部位（形状）を自動抽出しています...');
        // 素材情報の再読み込み (PHASE11)
        if (this.quote()) {
          this.loadMaterial(this.quote()!.id);
        }
        // 自動でFeature生成を実行
        this.generateFeatures(res.id);
      },
      error: (err) => {
        this.isAnalyzing.set(false);
        const msg = err?.error?.error?.message || '図面のAI解析に失敗しました。';
        this.featureErrorMessage.set(msg);
      },
    });
  }

  generateFeatures(analysisId: number): void {
    this.isGeneratingFeatures.set(true);
    this.featureErrorMessage.set(null);

    this.featureService.generateFeatures(analysisId).subscribe({
      next: (res) => {
        this.isGeneratingFeatures.set(false);
        this.featureSuccessMessage.set(`加工部位（${res.featureCount}箇所）を抽出・登録しました。`);
        // 解析詳細とFeatureをリロード
        if (this.selectedDrawingId()) {
          this.selectDrawing(this.selectedDrawingId()!);
        }
      },
      error: (err) => {
        this.isGeneratingFeatures.set(false);
        const msg = err?.error?.error?.message || '加工部位の抽出に失敗しました。';
        this.featureErrorMessage.set(msg);
      },
    });
  }

  openEditModal(feature: Feature): void {
    this.editingFeature.set(feature);
    this.editForm = {
      featureType: feature.featureType,
      description: feature.description || '',
      diameter: feature.diameter,
      length: feature.length,
      depth: feature.depth,
      needsReview: feature.needsReview,
    };
    this.featureErrorMessage.set(null);
  }

  closeEditModal(): void {
    this.editingFeature.set(null);
  }

  saveFeature(): void {
    const target = this.editingFeature();
    if (!target) return;

    this.featureErrorMessage.set(null);
    this.featureService.updateFeature(target.id, this.editForm).subscribe({
      next: (updated) => {
        this.featureSuccessMessage.set(`加工部位 No.${updated.sequenceNo} を更新しました。`);
        this.closeEditModal();
        if (this.activeAnalysis()) {
          this.loadFeatures(this.activeAnalysis()!.id);
        }
      },
      error: (err) => {
        const msg = err?.error?.error?.message || '加工部位の更新に失敗しました。';
        this.featureErrorMessage.set(msg);
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.type !== 'application/pdf') {
        this.drawingErrorMessage.set('PDFファイルのみ選択可能です。');
        this.selectedFile.set(null);
        input.value = '';
        return;
      }
      this.drawingErrorMessage.set(null);
      this.selectedFile.set(file);
    }
  }

  uploadDrawing(): void {
    const q = this.quote();
    const file = this.selectedFile();
    if (!q || !file) {
      return;
    }

    this.isUploading.set(true);
    this.drawingErrorMessage.set(null);

    this.drawingService.uploadDrawing(q.id, file).subscribe({
      next: () => {
        this.isUploading.set(false);
        this.selectedFile.set(null);
        // ファイル入力をリセット
        const fileInput = document.getElementById('pdfFileInput') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
        this.loadDrawings(q.id);
      },
      error: (err) => {
        const message = err?.error?.error?.message || '図面のアップロードに失敗しました。';
        this.drawingErrorMessage.set(message);
        this.isUploading.set(false);
      },
    });
  }

  deleteDrawing(drawingId: number): void {
    const q = this.quote();
    if (!q) return;

    if (!confirm('この図面を削除してもよろしいですか？')) {
      return;
    }

    this.drawingService.deleteDrawing(drawingId).subscribe({
      next: () => {
        // 図面削除に伴い関連する下流データシグナルをリセット
        this.activeAnalysis.set(null);
        this.features.set([]);
        this.operations.set([]);
        this.latheOperations.set([]);
        this.cycleTimeResult.set(null);
        this.latheCycleTime.set(null);
        this.quoteResult.set(null);
        this.quoteBasis.set(null);
        this.materialInfo.set(null);
        this.actualCycleTimes.set([]);
        this.comparison.set(null);
        this.evaluations.set([]);
        this.advancedSimilarQuotes.set([]);
        this.similarQuotes.set([]);
        this.activeTab.set('overview');

        this.loadQuote(q.id);
        this.loadDrawings(q.id);
        this.loadQuoteManagementHistory(q.id);
      },
      error: () => {
        this.drawingErrorMessage.set('図面の削除に失敗しました。');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/quotes']);
  }

  // ==========================================
  // 加工工程 (Operations) 管理メソッド
  // ==========================================

  loadOperations(quoteId: number): void {
    this.isLoadingOperations.set(true);
    this.operationService.getOperations(quoteId).subscribe({
      next: (res) => {
        this.operations.set(res.items);
        this.isLoadingOperations.set(false);
      },
      error: () => {
        this.operations.set([]);
        this.isLoadingOperations.set(false);
      },
    });
  }

  handleGenerateOperations(): void {
    const q = this.quote();
    if (!q) return;

    // 重複生成防止: 既に工程が存在する場合は再生成確認ダイアログ
    if (this.operations().length > 0) {
      if (!confirm('既に加工工程が存在します。再生成すると既存の工程データが上書きされます。再生成してもよろしいですか？')) {
        return;
      }
      this.executeGenerateOperations(q.id, true);
    } else {
      this.executeGenerateOperations(q.id, false);
    }
  }

  private executeGenerateOperations(quoteId: number, force: boolean): void {
    this.isGeneratingOperations.set(true);
    this.operationErrorMessage.set(null);
    this.operationSuccessMessage.set(null);

    this.operationService.generateOperations(quoteId, force).subscribe({
      next: (res) => {
        this.isGeneratingOperations.set(false);
        this.operationSuccessMessage.set(`加工工程候補（${res.operationCount}件）を生成しました。`);
        this.loadOperations(quoteId);
        this.activeTab.set('review');
        this.reviewSubTab.set('operations'); // 生成後は工程サブタブへ切り替え
      },
      error: (err) => {
        this.isGeneratingOperations.set(false);
        const msg = err?.error?.error?.message || '加工工程の生成に失敗しました。';
        this.operationErrorMessage.set(msg);
      },
    });
  }

  openEditOperationModal(op: Operation): void {
    this.editingOperation.set(op);
    this.editOperationForm = {
      sequenceNo: op.sequenceNo,
      description: op.description,
      machineType: op.machineType,
      status: op.status,
    };
    this.operationErrorMessage.set(null);
  }

  closeEditOperationModal(): void {
    this.editingOperation.set(null);
  }

  saveOperation(): void {
    const target = this.editingOperation();
    const q = this.quote();
    if (!target || !q) return;

    this.operationErrorMessage.set(null);
    this.operationService.updateOperation(target.id, this.editOperationForm).subscribe({
      next: (updated) => {
        this.operationSuccessMessage.set(`工程 No.${updated.sequenceNo} を更新しました。`);
        this.closeEditOperationModal();
        this.loadOperations(q.id);
      },
      error: (err) => {
        const msg = err?.error?.error?.message || '工程の更新に失敗しました。';
        this.operationErrorMessage.set(msg);
      },
    });
  }

  deleteOperation(opId: number): void {
    const q = this.quote();
    if (!q) return;

    if (!confirm('この工程を削除してもよろしいですか？')) {
      return;
    }

    this.operationService.deleteOperation(opId).subscribe({
      next: () => {
        this.operationSuccessMessage.set('工程を削除しました。');
        this.loadOperations(q.id);
      },
      error: () => {
        this.operationErrorMessage.set('工程の削除に失敗しました。');
      },
    });
  }

  moveOperation(index: number, direction: 'up' | 'down'): void {
    const list = this.operations();
    const q = this.quote();
    if (!q) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const currentOp = list[index];
    const targetOp = list[targetIndex];

    const currentSeq = currentOp.sequenceNo;
    const targetSeq = targetOp.sequenceNo;

    // sequenceNo をスワップして更新
    this.operationService.updateOperation(currentOp.id, { sequenceNo: targetSeq }).subscribe({
      next: () => {
        this.operationService.updateOperation(targetOp.id, { sequenceNo: currentSeq }).subscribe({
          next: () => {
            this.loadOperations(q.id);
          },
        });
      },
    });
  }

  loadCycleTime(quoteId: number): void {
    this.isLoadingCycleTime.set(true);
    this.cycleTimeErrorMessage.set(null);

    this.cycleTimeService.getCycleTime(quoteId).subscribe({
      next: (res) => {
        this.cycleTimeResult.set(res);
        this.isLoadingCycleTime.set(false);
      },
      error: () => {
        // 未計算の場合は 404 となるため、エラーメッセージは表示せず null を維持
        this.cycleTimeResult.set(null);
        this.isLoadingCycleTime.set(false);
      },
    });
  }

  handleCalculateCycleTime(): void {
    const q = this.quote();
    if (!q) return;

    this.isCalculatingCycleTime.set(true);
    this.cycleTimeErrorMessage.set(null);
    this.cycleTimeSuccessMessage.set(null);

    this.cycleTimeService.calculateCycleTime(q.id).subscribe({
      next: (res) => {
        this.cycleTimeResult.set(res);
        this.isCalculatingCycleTime.set(false);
        this.cycleTimeSuccessMessage.set('サイクルタイムを計算・保存しました。');
        // 各工程の切削時間フィールドも更新されているため再取得
        this.loadOperations(q.id);
      },
      error: (err) => {
        this.isCalculatingCycleTime.set(false);
        const msg = err?.error?.error?.message || 'サイクルタイム計算に失敗しました。';
        this.cycleTimeErrorMessage.set(msg);
      },
    });
  }

  // =================== PHASE08 NC自動旋盤エンジン ===================

  loadLatheOperations(quoteId: number): void {
    this.isLoadingLatheOps.set(true);
    this.latheService.getLatheOperations(quoteId).subscribe({
      next: (res) => {
        this.latheOperations.set(res.items);
        this.isLoadingLatheOps.set(false);
      },
      error: () => {
        this.latheOperations.set([]);
        this.isLoadingLatheOps.set(false);
      },
    });
  }

  loadLatheCycleTime(quoteId: number): void {
    this.latheService.getLatheCycleTime(quoteId).subscribe({
      next: (res) => {
        this.latheCycleTime.set(res);
        this.loadCorrectionHistory(quoteId);
      },
      error: () => {
        this.latheCycleTime.set(null);
      },
    });
  }

  loadCorrectionHistory(quoteId: number): void {
    this.isLoadingCorrectionHistory.set(true);
    this.correctionService.getHistory(quoteId).subscribe({
      next: (res) => {
        this.correctionHistory.set(res.items);
        this.isLoadingCorrectionHistory.set(false);
      },
      error: () => {
        this.correctionHistory.set([]);
        this.isLoadingCorrectionHistory.set(false);
      },
    });
  }

  handleGenerateLatheOperations(): void {
    const q = this.quote();
    if (!q) return;

    if (this.latheOperations().length > 0) {
      if (!confirm('既にNC自動旋盤工程が存在します。再生成して上書きしてもよろしいですか？')) {
        return;
      }
    }

    this.isGeneratingLatheOps.set(true);
    this.latheErrorMessage.set(null);
    this.latheSuccessMessage.set(null);

    this.latheService.generateLatheOperations(q.id, true).subscribe({
      next: (res) => {
        this.isGeneratingLatheOps.set(false);
        this.latheSuccessMessage.set(`NC自動旋盤工程（${res.operationCount}工程）を生成しました。`);
        this.loadLatheOperations(q.id);
        this.loadLatheCycleTime(q.id);
      },
      error: (err) => {
        this.isGeneratingLatheOps.set(false);
        const msg = err?.error?.error?.message || '自動旋盤工程の生成に失敗しました。';
        this.latheErrorMessage.set(msg);
      },
    });
  }

  handleRegenerateLatheOperations(): void {
    const q = this.quote();
    if (!q) return;

    if (!confirm('最新の工程判断マスタ・素材条件に基づいてNC自動旋盤工程を再構築しますか？')) {
      return;
    }

    this.isGeneratingLatheOps.set(true);
    this.latheErrorMessage.set(null);
    this.latheSuccessMessage.set(null);

    this.latheService.regenerateLatheOperations(q.id).subscribe({
      next: (res) => {
        this.isGeneratingLatheOps.set(false);
        this.latheSuccessMessage.set(`最新マスタ基準でNC自動旋盤工程（${res.operationCount}工程）を再構築しました。`);
        this.loadLatheOperations(q.id);
        // 自動でサイクルタイム計算も再実行して最新化
        this.handleCalculateLatheCycleTime();
      },
      error: (err) => {
        this.isGeneratingLatheOps.set(false);
        const msg = err?.error?.error?.message || '自動旋盤工程の再構築に失敗しました。';
        this.latheErrorMessage.set(msg);
      },
    });
  }

  loadMachinesAndSelection(quoteId: number): void {
    this.calculationService.getMachines().subscribe({
      next: (res) => {
        this.machines.set(res.items);
        // 案件の選択中設備を取得
        this.calculationService.getQuoteMachine(quoteId).subscribe({
          next: (sel) => {
            this.selectedMachineId.set(sel.id);
            const found = res.items.find((m) => m.id === sel.id) || null;
            this.selectedMachine.set(found);
            if (found && (this.userMaxRpm() === null || this.userMaxRpm() === undefined)) {
              this.userMaxRpm.set(found.maxRpm || 10000);
            }
          },
          error: () => {
            const def = res.items[0] || null;
            if (def) {
              this.selectedMachineId.set(def.id);
              this.selectedMachine.set(def);
              if (this.userMaxRpm() === null || this.userMaxRpm() === undefined) {
                this.userMaxRpm.set(def.maxRpm || 10000);
              }
            }
          },
        });
      },
      error: () => {
        this.machines.set([]);
      },
    });
  }

  onMachineSelectChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const machineId = parseInt(target.value, 10);
    if (!machineId || isNaN(machineId)) return;
    this.changeMachine(machineId);
  }

  changeMachine(machineId: number): void {
    const q = this.quote();
    if (!q) return;

    this.isChangingMachine.set(true);
    this.machineMessage.set(null);

    this.calculationService.setQuoteMachine(q.id, machineId).subscribe({
      next: (res) => {
        this.isChangingMachine.set(false);
        this.selectedMachineId.set(res.id);
        const m = this.machines().find((item) => item.id === res.id) || null;
        this.selectedMachine.set(m);
        if (m) {
          this.userMaxRpm.set(m.maxRpm || 10000);
        }
        this.machineMessage.set(`使用加工機を「${res.machineName}」に変更しました。`);
        setTimeout(() => this.machineMessage.set(null), 3000);
      },
      error: (err) => {
        this.isChangingMachine.set(false);
        const msg = err?.error?.error?.message || '加工機の変更に失敗しました。';
        alert(msg);
      },
    });
  }

  handleCalculateLatheCycleTime(): void {
    const q = this.quote();
    if (!q) return;

    if (this.isSelectedMachineOverCapacity()) {
      const stockDia = this.getEffectiveStockDiameter();
      const mName = this.selectedMachine()?.machineName || '';
      if (!confirm(`【警告】素材径 φ${stockDia}mm に対し、選択設備「${mName}」の最大加工径を超過しています。\n加工不可の恐れがありますが、このまま計算を実行しますか？`)) {
        return;
      }
    }

    this.isCalculatingLatheCt.set(true);
    this.latheErrorMessage.set(null);
    this.latheSuccessMessage.set(null);

    const maxRpm = this.userMaxRpm() && this.userMaxRpm()! > 0 ? this.userMaxRpm()! : undefined;

    // PHASE09: 共通計算基盤 (POST /api/quotes/:id/cycle-time/calculate) 経由で実行
    this.calculationService.calculateCycleTime(q.id, { maxRpm }).subscribe({
      next: (res) => {
        this.latheCycleTime.set(res);
        this.isCalculatingLatheCt.set(false);
        this.latheSuccessMessage.set(`【${res.machineName} (${res.calculationEngineType || 'AUTOMATIC_LATHE'})】サイクルタイムの計算が完了しました（上限回転数: ${maxRpm || 'マスタ値'} rpm）。`);
        this.loadLatheOperations(q.id);
        this.loadComparison(q.id);
        this.loadCorrectionHistory(q.id);
      },
      error: (err) => {
        this.isCalculatingLatheCt.set(false);
        const msg = err?.error?.error?.message || 'サイクルタイムの計算に失敗しました。';
        this.latheErrorMessage.set(msg);
      },
    });
  }

  // =================== PHASE10 実績フィードバック ===================

  loadActualCycleTimes(quoteId: number): void {
    this.isLoadingActual.set(true);
    this.actualCycleTimeService.getActualCycleTimes(quoteId).subscribe({
      next: (res) => {
        this.actualCycleTimes.set(res.items);
        this.isLoadingActual.set(false);
      },
      error: () => {
        this.actualCycleTimes.set([]);
        this.isLoadingActual.set(false);
      },
    });
  }

  loadComparison(quoteId: number): void {
    this.isLoadingComparison.set(true);
    this.actualCycleTimeService.getComparison(quoteId).subscribe({
      next: (res) => {
        this.comparison.set(res);
        this.isLoadingComparison.set(false);
      },
      error: () => {
        this.comparison.set(null);
        this.isLoadingComparison.set(false);
      },
    });
  }

  openActualModal(): void {
    const q = this.quote();
    this.actualForm = {
      machineId: this.selectedMachineId() ?? null,
      productionDate: new Date().toISOString().split('T')[0],
      quantity: q?.quantity && q.quantity > 0 ? q.quantity : 1,
      actualCycleTimeSec: 0,
      setupTimeSec: 0,
      operatorName: '',
      notes: '',
    };
    this.actualInputMode.set('unit');
    this.totalMachiningTimeSec.set(null);
    this.actualErrorMessage.set(null);
    this.showActualModal.set(true);
  }

  closeActualModal(): void {
    this.showActualModal.set(false);
    this.actualErrorMessage.set(null);
  }

  onTotalTimeChange(): void {
    const total = this.totalMachiningTimeSec();
    const qty = this.actualForm.quantity;
    if (total !== null && total >= 0 && qty > 0) {
      this.actualForm.actualCycleTimeSec = Math.round((total / qty) * 1000) / 1000;
    }
  }

  handleCreateActualCycleTime(): void {
    const q = this.quote();
    if (!q) return;

    if (this.actualInputMode() === 'total') {
      this.onTotalTimeChange();
    }

    if (!this.actualForm.quantity || this.actualForm.quantity <= 0) {
      this.actualErrorMessage.set('加工数量は1以上で入力してください。');
      return;
    }

    if (this.actualForm.actualCycleTimeSec === undefined || this.actualForm.actualCycleTimeSec < 0) {
      this.actualErrorMessage.set('実績サイクルタイムは0以上で入力してください。');
      return;
    }

    this.isSubmittingActual.set(true);
    this.actualErrorMessage.set(null);

    this.actualCycleTimeService.createActualCycleTime(q.id, this.actualForm).subscribe({
      next: () => {
        this.isSubmittingActual.set(false);
        this.showActualModal.set(false);
        this.actualSuccessMessage.set('加工実績を登録しました。');
        setTimeout(() => this.actualSuccessMessage.set(null), 3500);
        this.loadActualCycleTimes(q.id);
        this.loadComparison(q.id);
      },
      error: (err) => {
        this.isSubmittingActual.set(false);
        const msg = err?.error?.error?.message || '実績の登録に失敗しました。';
        this.actualErrorMessage.set(msg);
      },
    });
  }

  handleDeleteActualCycleTime(id: number): void {
    const q = this.quote();
    if (!q) return;

    if (!confirm('この加工実績レコードを削除してもよろしいですか？')) {
      return;
    }

    this.actualCycleTimeService.deleteActualCycleTime(id).subscribe({
      next: () => {
        this.actualSuccessMessage.set('加工実績を削除しました。');
        setTimeout(() => this.actualSuccessMessage.set(null), 3500);
        this.loadActualCycleTimes(q.id);
        this.loadComparison(q.id);
      },
      error: (err) => {
        const msg = err?.error?.error?.message || '実績の削除に失敗しました。';
        alert(msg);
      },
    });
  }

  // ==============================================================
  // 素材情報 (PHASE11) メソッド
  // ==============================================================

  loadMaterial(quoteId: number): void {
    this.isLoadingMaterial.set(true);
    this.materialErrorMessage.set(null);

    this.materialService.getMaterialByQuoteId(quoteId).subscribe({
      next: (data) => {
        this.materialInfo.set(data);
        this.isLoadingMaterial.set(false);
      },
      error: () => {
        this.materialInfo.set(null);
        this.isLoadingMaterial.set(false);
      },
    });
  }

  openMaterialModal(): void {
    const current = this.materialInfo();
    const analysis = this.activeAnalysis();

    this.materialForm = {
      materialName: current?.materialName ?? analysis?.material ?? '',
      materialStandard: current?.materialStandard ?? '',
      shapeType: current?.shapeType ?? 'ROUND_BAR',
      diameter: current?.diameter ?? analysis?.stockDiameter ?? null,
      width: current?.width ?? null,
      height: current?.height ?? null,
      length: current?.length ?? null,
      weight: current?.weight ?? null,
      source: 'MANUAL',
    };
    this.materialErrorMessage.set(null);
    this.showMaterialModal.set(true);
  }

  closeMaterialModal(): void {
    this.showMaterialModal.set(false);
    this.materialErrorMessage.set(null);
  }

  handleSaveMaterial(): void {
    const q = this.quote();
    if (!q) return;

    this.isSavingMaterial.set(true);
    this.materialErrorMessage.set(null);

    const payload: SaveMaterialRequest = {
      ...this.materialForm,
      source: 'MANUAL',
    };

    this.materialService.saveMaterialForQuote(q.id, payload).subscribe({
      next: (saved) => {
        this.isSavingMaterial.set(false);
        this.materialInfo.set(saved);
        this.showMaterialModal.set(false);
        this.materialSuccessMessage.set('素材情報を更新しました。');
        setTimeout(() => this.materialSuccessMessage.set(null), 3000);
      },
      error: (err) => {
        this.isSavingMaterial.set(false);
        const msg = err?.error?.error?.message || '素材情報の保存に失敗しました。';
        this.materialErrorMessage.set(msg);
      },
    });
  }

  // ==============================================================
  // PHASE13: サイクルタイム精度検証・補正メソッド
  // ==============================================================

  loadEvaluations(quoteId: number): void {
    this.isLoadingEvaluations.set(true);
    this.cycleTimeEvaluationService.getEvaluationsByQuoteId(quoteId).subscribe({
      next: (res) => {
        this.evaluations.set(res.items);
        this.isLoadingEvaluations.set(false);
      },
      error: () => {
        this.evaluations.set([]);
        this.isLoadingEvaluations.set(false);
      },
    });
  }

  loadCorrectionFactors(): void {
    this.cycleTimeEvaluationService.getCorrectionFactors().subscribe({
      next: (res) => {
        this.correctionFactors.set(res.items);
      },
      error: () => {
        this.correctionFactors.set([]);
      },
    });
  }

  openEvaluationModal(): void {
    const ct = this.latheCycleTime();
    const selMachine = this.selectedMachine();

    this.evaluationForm = {
      machineId: selMachine?.id ?? null,
      calculatedCycleTimeSec: ct?.totalCycleTimeSec ?? null,
      excelCycleTimeSec: null,
      actualCycleTimeSec: null,
      differenceCategory: 'OTHER',
      notes: '',
    };
    this.evaluationErrorMessage.set(null);
    this.showEvaluationModal.set(true);
  }

  closeEvaluationModal(): void {
    this.showEvaluationModal.set(false);
    this.evaluationErrorMessage.set(null);
  }

  handleSaveEvaluation(): void {
    const q = this.quote();
    if (!q) return;

    this.isSubmittingEvaluation.set(true);
    this.evaluationErrorMessage.set(null);

    this.cycleTimeEvaluationService.createEvaluation(q.id, this.evaluationForm).subscribe({
      next: () => {
        this.isSubmittingEvaluation.set(false);
        this.showEvaluationModal.set(false);
        this.evaluationSuccessMessage.set('計算精度評価・Excel比較データを登録しました。');
        setTimeout(() => this.evaluationSuccessMessage.set(null), 3500);
        this.loadEvaluations(q.id);
        this.loadCorrectionFactors();
      },
      error: (err) => {
        this.isSubmittingEvaluation.set(false);
        const msg = err?.error?.error?.message || '精度評価データの登録に失敗しました。';
        this.evaluationErrorMessage.set(msg);
      },
    });
  }

  // ==============================================================
  // PHASE14: 生産実績DB連携 (sadoa) メソッド
  // ==============================================================

  loadProductionActual(quoteId: number): void {
    this.isLoadingProductionActual.set(true);
    this.productionActualService.getForQuote(quoteId).subscribe({
      next: (res) => {
        this.productionActualRecords.set(res.items);
        this.isLoadingProductionActual.set(false);
      },
      error: () => {
        this.productionActualRecords.set([]);
        this.isLoadingProductionActual.set(false);
      },
    });
  }

  handleSyncProduction(): void {
    const q = this.quote();
    this.isSyncingProduction.set(true);
    this.productionSyncMessage.set(null);
    this.productionSyncError.set(null);

    this.productionActualService.syncProduction().subscribe({
      next: (res) => {
        this.isSyncingProduction.set(false);
        this.productionSyncMessage.set(res.message);
        setTimeout(() => this.productionSyncMessage.set(null), 5000);
        if (q) {
          this.loadProductionActual(q.id);
        }
      },
      error: (err) => {
        this.isSyncingProduction.set(false);
        const msg = err?.error?.error?.message || '生産管理DB(sadoa)との同期に失敗しました。';
        this.productionSyncError.set(msg);
      },
    });
  }

  /**
   * 過去加工実績を計算精度評価モーダルに自動転記して開く
   */
  applyProductionActualToEvaluation(record: ProductionActualRecord): void {
    this.openEvaluationModal();
    if (record.cycleTimeSec !== null) {
      this.evaluationForm.actualCycleTimeSec = record.cycleTimeSec;
    }
    if (record.machineName) {
      // machineNameから適合するマシンを探索
      const matched = this.machines().find(
        (m) => record.machineName!.includes(m.machineName) || m.machineName.includes(record.machineName!)
      );
      if (matched) {
        this.evaluationForm.machineId = matched.id;
      }
    }
    const notePrefix = `[sadoa同期実績 図番:${record.buban || '-'} 担当:${record.operatorName || '-'} 数量:${record.quantity}個] `;
    this.evaluationForm.notes = notePrefix + (this.evaluationForm.notes || '');
  }

  // =================== PHASE17 見積業務システム化 ===================

  loadQuoteResult(quoteId: number): void {
    this.quoteManagementService.getQuoteBasis(quoteId).subscribe({
      next: (basis) => {
        this.quoteBasis.set(basis);
        this.quoteResult.set(basis.completedResult || null);
        if (basis.quote.partNo) {
          this.loadSimilarQuotes(basis.quote.partNo, basis.quote.material || undefined);
        }
      },
      error: () => {},
    });
  }

  loadQuoteBasis(quoteId: number): void {
    this.isLoadingBasis.set(true);
    this.quoteManagementService.getQuoteBasis(quoteId).subscribe({
      next: (basis) => {
        this.quoteBasis.set(basis);
        this.isLoadingBasis.set(false);
      },
      error: () => {
        this.isLoadingBasis.set(false);
      },
    });
  }

  loadQuoteManagementHistory(quoteId: number): void {
    this.quoteManagementService.getQuoteHistory(quoteId).subscribe({
      next: (res) => {
        this.quoteManagementHistory.set(res.items);
      },
      error: () => {
        this.quoteManagementHistory.set([]);
      },
    });
  }

  loadSimilarQuotes(partNo?: string, material?: string, diameter?: number): void {
    this.isLoadingSimilar.set(true);
    this.quoteManagementService.searchSimilarQuotes({ partNo, material, diameter, limit: 6 }).subscribe({
      next: (res) => {
        // 自案件を除外
        const curId = this.quote()?.id;
        this.similarQuotes.set(res.items.filter((it) => it.id !== curId));
        this.isLoadingSimilar.set(false);
      },
      error: () => {
        this.similarQuotes.set([]);
        this.isLoadingSimilar.set(false);
      },
    });
  }

  loadAdvancedSimilarQuotes(quoteId: number): void {
    this.isLoadingSimilar.set(true);
    this.quoteManagementService.getAdvancedSimilarQuotes(quoteId, 10).subscribe({
      next: (res) => {
        this.advancedSimilarQuotes.set(res.results);
        this.isLoadingSimilar.set(false);
      },
      error: (err) => {
        console.warn('Failed to load advanced similar quotes:', err);
        this.advancedSimilarQuotes.set([]);
        this.isLoadingSimilar.set(false);
      },
    });
  }

  handleCompleteQuote(): void {
    const q = this.quote();
    const ct = this.latheCycleTime();
    if (!q) return;

    if (!confirm('現在の算出サイクルタイムと補正条件で見積を「確定 (COMPLETED)」として保存しますか？')) {
      return;
    }

    this.isCompletingQuote.set(true);
    this.completeSuccessMessage.set(null);
    this.completeErrorMessage.set(null);

    const payload = {
      cycleTime: ct?.theoreticalCycleTime ?? ct?.totalCycleTimeSec ?? 0,
      machine: ct?.machineName || this.selectedMachine()?.machineName || 'Cincom L20',
      correctionFactor: ct?.correctionFactor ?? 1.0,
      finalTime: ct?.totalCycleTimeSec ?? 0,
      quantity: q.quantity,
      totalLotTime: ct?.totalLotTimeSec ?? 0,
      cuttingTime: ct?.cuttingTimeSec,
      nonCuttingTime: ct?.nonCuttingTimeSec,
      correctionSource: ct?.correctionSource ?? undefined,
      confidenceLevel: ct?.confidenceLevel ?? undefined,
      notes: this.completeForm.notes,
      completedBy: this.completeForm.operatorName,
    };

    this.quoteManagementService.completeQuote(q.id, payload).subscribe({
      next: (res) => {
        this.isCompletingQuote.set(false);
        this.quoteResult.set(res.result);
        this.completeSuccessMessage.set('見積案件を確定保存しました。ステータスが COMPLETED に更新されました。');
        this.loadQuote(q.id);
        this.loadQuoteBasis(q.id);
        this.loadQuoteManagementHistory(q.id);
      },
      error: (err) => {
        this.isCompletingQuote.set(false);
        const msg = err?.error?.error?.message || '見積確定保存に失敗しました。';
        this.completeErrorMessage.set(msg);
      },
    });
  }

  handlePrintPdf(): void {
    const q = this.quote();
    if (!q) return;
    const url = this.quoteManagementService.getPdfExportUrl(q.id);
    window.open(url, '_blank');
  }

  handleUpdateQuoteStatus(status: QuoteStatus): void {
    const q = this.quote();
    if (!q) return;
    this.quoteManagementService.updateStatus(q.id, status, this.completeForm.operatorName).subscribe({
      next: () => {
        this.loadQuote(q.id);
        this.loadQuoteManagementHistory(q.id);
      },
      error: (err) => {
        alert(err?.error?.error?.message || 'ステータスの更新に失敗しました。');
      },
    });
  }
}
