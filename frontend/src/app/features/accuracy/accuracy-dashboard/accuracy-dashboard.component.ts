import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AccuracyService } from '../../../core/services/accuracy.service';
import {
  AccuracySummary,
  MachineAccuracy,
  MaterialAccuracy,
  MonthlyTrend,
  CorrectionEffect,
  ImprovementCandidate,
  PredictionAccuracyRecord,
} from '../../../core/models/accuracy.model';

@Component({
  selector: 'app-accuracy-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './accuracy-dashboard.component.html',
  styleUrls: ['./accuracy-dashboard.component.scss'],
})
export class AccuracyDashboardComponent implements OnInit {
  private accuracyService = inject(AccuracyService);

  // 画面状態
  isLoading = signal<boolean>(true);
  isExecuting = signal<boolean>(false);
  isApplying = signal<boolean>(false);
  activeTab = signal<'machines' | 'materials' | 'trends' | 'candidates' | 'records'>('machines');

  // データ Signals
  summary = signal<AccuracySummary | null>(null);
  machines = signal<MachineAccuracy[]>([]);
  materials = signal<MaterialAccuracy[]>([]);
  trends = signal<MonthlyTrend[]>([]);
  correctionEffect = signal<CorrectionEffect | null>(null);
  candidates = signal<ImprovementCandidate[]>([]);
  records = signal<PredictionAccuracyRecord[]>([]);

  // メッセージ
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // 承認モーダル状態
  showApprovalModal = signal<boolean>(false);
  selectedCandidate = signal<ImprovementCandidate | null>(null);
  editSuggestedFactor = 1.0;
  approvalOperator = '技術担当者';

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // 1. 全体KPI
    this.accuracyService.getSummary().subscribe({
      next: (s) => this.summary.set(s),
      error: (e) => console.error('Failed to load summary:', e),
    });

    // 2. 設備別
    this.accuracyService.getMachineAccuracy().subscribe({
      next: (res) => this.machines.set(res.machines),
      error: (e) => console.error('Failed to load machine accuracy:', e),
    });

    // 3. 材料別
    this.accuracyService.getMaterialAccuracy().subscribe({
      next: (res) => this.materials.set(res.materials),
      error: (e) => console.error('Failed to load material accuracy:', e),
    });

    // 4. 月別推移
    this.accuracyService.getMonthlyTrends().subscribe({
      next: (res) => this.trends.set(res.trends),
      error: (e) => console.error('Failed to load trends:', e),
    });

    // 5. 補正効果
    this.accuracyService.getCorrectionEffect().subscribe({
      next: (res) => this.correctionEffect.set(res),
      error: (e) => console.error('Failed to load correction effect:', e),
    });

    // 6. 改善候補
    this.accuracyService.getCandidates().subscribe({
      next: (res) => this.candidates.set(res.candidates),
      error: (e) => console.error('Failed to load candidates:', e),
    });

    // 7. 明細
    this.accuracyService.getRecords(100).subscribe({
      next: (res) => {
        this.records.set(res.records);
        this.isLoading.set(false);
      },
      error: (e) => {
        console.error('Failed to load accuracy records:', e);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * 精度評価の一括実行・最新化
   */
  handleExecuteEvaluation(): void {
    this.isExecuting.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.accuracyService.executeEvaluation().subscribe({
      next: (res) => {
        this.successMessage.set(res.message);
        this.isExecuting.set(false);
        this.loadAllData();
      },
      error: (err) => {
        console.error('Execute evaluation error:', err);
        this.errorMessage.set('精度評価の実行に失敗しました。');
        this.isExecuting.set(false);
      },
    });
  }

  /**
   * 承認モーダルを開く
   */
  openApprovalModal(candidate: ImprovementCandidate): void {
    this.selectedCandidate.set(candidate);
    this.editSuggestedFactor = candidate.suggestedFactor;
    this.showApprovalModal.set(true);
  }

  closeApprovalModal(): void {
    this.showApprovalModal.set(false);
    this.selectedCandidate.set(null);
  }

  /**
   * 技術者承認の実行
   */
  handleConfirmApproval(): void {
    const cand = this.selectedCandidate();
    if (!cand) return;

    this.isApplying.set(true);
    this.accuracyService
      .applyCandidate(cand.id, this.editSuggestedFactor, this.approvalOperator)
      .subscribe({
        next: (res) => {
          this.successMessage.set(res.message);
          this.isApplying.set(false);
          this.closeApprovalModal();
          this.loadAllData();
        },
        error: (err) => {
          console.error('Apply candidate error:', err);
          this.errorMessage.set('改善候補の承認更新に失敗しました。');
          this.isApplying.set(false);
        },
      });
  }
}
