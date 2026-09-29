import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { DrawingService } from '../../services/drawing.service';
import { FeatureService } from '../../services/feature.service';
import { OperationService } from '../../services/operation.service';
import { Quote } from '../../models/quote.model';
import { Drawing } from '../../models/drawing.model';
import { DrawingAnalysis, Feature, UpdateFeatureRequest } from '../../models/feature.model';
import { Operation, UpdateOperationRequest } from '../../models/operation.model';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  quote = signal<Quote | null>(null);
  drawings = signal<Drawing[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  isUploading = signal<boolean>(false);
  drawingErrorMessage = signal<string | null>(null);
  selectedFile = signal<File | null>(null);

  // タブ切り替え ('features' | 'operations')
  activeTab = signal<'features' | 'operations'>('features');

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
        this.featureSuccessMessage.set('AI解析が正常に完了しました。加工Featureを自動生成しています...');
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
        this.featureSuccessMessage.set(`加工Feature（${res.featureCount}件）を生成・登録しました。`);
        // 解析詳細とFeatureをリロード
        if (this.selectedDrawingId()) {
          this.selectDrawing(this.selectedDrawingId()!);
        }
      },
      error: (err) => {
        this.isGeneratingFeatures.set(false);
        const msg = err?.error?.error?.message || '加工Featureの生成に失敗しました。';
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
        this.featureSuccessMessage.set(`Feature No.${updated.sequenceNo} を更新しました。`);
        this.closeEditModal();
        if (this.activeAnalysis()) {
          this.loadFeatures(this.activeAnalysis()!.id);
        }
      },
      error: (err) => {
        const msg = err?.error?.error?.message || 'Featureの更新に失敗しました。';
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
        this.loadDrawings(q.id);
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
        this.activeTab.set('operations'); // 生成後は工程タブへ切り替え
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
}
