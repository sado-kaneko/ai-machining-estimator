import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductionAnalysisService } from '../../../quotes/services/production-analysis.service';
import { CorrectionService } from '../../../quotes/services/correction.service';
import {
  AnalysisSummary,
  MachineAnalysisItem,
  MaterialAnalysisItem,
  DiameterAnalysisItem,
  ProcessAnalysisItem,
  CorrectionFactorCandidate,
} from '../../../quotes/models/production-analysis.model';

@Component({
  selector: 'app-production-analysis',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './production-analysis.component.html',
  styleUrl: './production-analysis.component.scss',
})
export class ProductionAnalysisComponent implements OnInit {
  private readonly analysisService = inject(ProductionAnalysisService);
  private readonly correctionService = inject(CorrectionService);

  summary = signal<AnalysisSummary | null>(null);
  machines = signal<MachineAnalysisItem[]>([]);
  materials = signal<MaterialAnalysisItem[]>([]);
  diameters = signal<DiameterAnalysisItem[]>([]);
  processes = signal<ProcessAnalysisItem[]>([]);
  candidates = signal<CorrectionFactorCandidate[]>([]);

  isLoading = signal<boolean>(false);
  isExecuting = signal<boolean>(false);
  message = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // 表示タブ切り替え ('all' | 'machine' | 'material' | 'diameter' | 'process' | 'candidates')
  activeTab = signal<'all' | 'machine' | 'material' | 'diameter' | 'process' | 'candidates'>('all');

  ngOnInit(): void {
    this.loadAllAnalysis();
  }

  loadAllAnalysis(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    // 1. 全体サマリ
    this.analysisService.getSummary().subscribe({
      next: (data) => this.summary.set(data),
      error: () => this.errorMessage.set('全体分析サマリの取得に失敗しました。'),
    });

    // 2. 設備別
    this.analysisService.getMachines().subscribe({
      next: (data) => this.machines.set(data),
    });

    // 3. 材料別
    this.analysisService.getMaterials().subscribe({
      next: (data) => this.materials.set(data),
    });

    // 4. 径別
    this.analysisService.getDiameters().subscribe({
      next: (data) => this.diameters.set(data),
    });

    // 5. 工程別
    this.analysisService.getProcesses().subscribe({
      next: (data) => this.processes.set(data),
    });

    // 6. 補正係数候補
    this.analysisService.getCorrectionFactorsConfidence().subscribe({
      next: (res) => {
        this.candidates.set(res.items);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  handleExecuteAnalysis(): void {
    this.isExecuting.set(true);
    this.message.set(null);
    this.errorMessage.set(null);

    this.analysisService.executeAnalysis().subscribe({
      next: (res) => {
        this.isExecuting.set(false);
        this.summary.set(res.summary);
        this.machines.set(res.machines);
        this.materials.set(res.materials);
        this.diameters.set(res.diameters);
        this.processes.set(res.processes);
        this.candidates.set(res.candidates);
        this.message.set('統計分析および補正係数候補の算出・更新が完了しました。');
        setTimeout(() => this.message.set(null), 4000);
      },
      error: () => {
        this.isExecuting.set(false);
        this.errorMessage.set('分析処理の実行に失敗しました。');
      },
    });
  }

  handleToggleApproval(c: CorrectionFactorCandidate): void {
    if (!c.id) return;
    const newStatus = !c.approved;
    this.correctionService.toggleApproval(c.id, newStatus).subscribe({
      next: () => {
        c.approved = newStatus;
        this.message.set(`【${c.machineName} × ${c.materialName}】の補正係数を「${newStatus ? '承認済' : '承認解除'}」に変更しました。`);
        setTimeout(() => this.message.set(null), 3000);
      },
      error: (err) => {
        const msg = err?.error?.error?.message || '承認状態の更新に失敗しました。';
        this.errorMessage.set(msg);
        setTimeout(() => this.errorMessage.set(null), 4000);
      },
    });
  }
}
