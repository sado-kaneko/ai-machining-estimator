import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MasterService } from '../../services/master.service';
import {
  MachineMasterItem,
  SaveMachineMasterRequest,
  ToolMasterItem,
  SaveToolMasterRequest,
} from '../../models/master.model';

@Component({
  selector: 'app-master-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './master-maintenance.component.html',
  styleUrl: './master-maintenance.component.scss',
})
export class MasterMaintenanceComponent implements OnInit {
  private readonly masterService = inject(MasterService);

  activeTab = signal<'machines' | 'tools'>('machines');
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // 加工設備関連
  machines = signal<MachineMasterItem[]>([]);
  showMachineModal = signal<boolean>(false);
  editingMachineId = signal<number | null>(null);
  machineForm: SaveMachineMasterRequest = this.getInitialMachineForm();

  // 工具関連
  tools = signal<ToolMasterItem[]>([]);
  showToolModal = signal<boolean>(false);
  editingToolId = signal<number | null>(null);
  toolForm: SaveToolMasterRequest = this.getInitialToolForm();

  ngOnInit(): void {
    this.loadMachines();
    this.loadTools();
  }

  setTab(tab: 'machines' | 'tools'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  loadMachines(): void {
    this.isLoading.set(true);
    this.masterService.getMachines().subscribe({
      next: res => {
        this.machines.set(res.items);
        this.isLoading.set(false);
      },
      error: err => {
        this.errorMessage.set('設備マスタの取得に失敗しました。');
        this.isLoading.set(false);
      },
    });
  }

  loadTools(): void {
    this.masterService.getTools().subscribe({
      next: res => {
        this.tools.set(res.items);
      },
      error: err => {
        console.warn('Failed to load tools:', err);
      },
    });
  }

  // --- 加工設備モーダル操作 ---
  openAddMachineModal(): void {
    this.editingMachineId.set(null);
    this.machineForm = this.getInitialMachineForm();
    this.showMachineModal.set(true);
  }

  openEditMachineModal(m: MachineMasterItem): void {
    this.editingMachineId.set(m.id);
    this.machineForm = {
      machineType: m.machineType,
      machineName: m.machineName,
      maker: m.maker,
      model: m.model,
      maxRpm: m.maxRpm,
      maxBarDiameter: m.maxBarDiameter,
      guideBushType: m.guideBushType,
      barFeederEnabled: m.barFeederEnabled,
      maxMachiningLength: m.maxMachiningLength,
      hasSubSpindle: m.hasSubSpindle,
      maxTools: m.maxTools,
      specialOptions: m.specialOptions,
      calculationEngineType: m.calculationEngineType,
      isActive: m.isActive,
    };
    this.showMachineModal.set(true);
  }

  closeMachineModal(): void {
    this.showMachineModal.set(false);
    this.editingMachineId.set(null);
  }

  handleSaveMachine(): void {
    if (!this.machineForm.machineName) {
      alert('機械名を入力してください。');
      return;
    }

    const editId = this.editingMachineId();
    if (editId !== null) {
      this.masterService.updateMachine(editId, this.machineForm).subscribe({
        next: () => {
          this.successMessage.set(`設備「${this.machineForm.machineName}」を更新しました。`);
          this.closeMachineModal();
          this.loadMachines();
        },
        error: () => alert('設備の更新に失敗しました。'),
      });
    } else {
      this.masterService.createMachine(this.machineForm).subscribe({
        next: () => {
          this.successMessage.set(`設備「${this.machineForm.machineName}」を新規登録しました。`);
          this.closeMachineModal();
          this.loadMachines();
        },
        error: () => alert('設備の登録に失敗しました。'),
      });
    }
  }

  handleDeleteMachine(m: MachineMasterItem): void {
    if (!confirm(`設備「${m.machineName}」を非活性化（削除）しますか？`)) {
      return;
    }
    this.masterService.deleteMachine(m.id).subscribe({
      next: () => {
        this.successMessage.set(`設備「${m.machineName}」を削除しました。`);
        this.loadMachines();
      },
      error: () => alert('設備の削除に失敗しました。'),
    });
  }

  // --- 工具モーダル操作 ---
  openAddToolModal(): void {
    this.editingToolId.set(null);
    this.toolForm = this.getInitialToolForm();
    this.showToolModal.set(true);
  }

  openEditToolModal(t: ToolMasterItem): void {
    this.editingToolId.set(t.id);
    this.toolForm = {
      toolCode: t.toolCode,
      toolName: t.toolName,
      toolCategory: t.toolCategory,
      materialCompatibility: t.materialCompatibility,
      bladeWidth: t.bladeWidth,
      noseRadius: t.noseRadius,
      maxDepth: t.maxDepth,
      defaultFeed: t.defaultFeed,
      defaultVc: t.defaultVc,
      notes: t.notes,
      isActive: t.isActive,
    };
    this.showToolModal.set(true);
  }

  closeToolModal(): void {
    this.showToolModal.set(false);
    this.editingToolId.set(null);
  }

  handleSaveTool(): void {
    if (!this.toolForm.toolCode || !this.toolForm.toolName) {
      alert('工具コードと工具名を入力してください。');
      return;
    }

    const editId = this.editingToolId();
    if (editId !== null) {
      this.masterService.updateTool(editId, this.toolForm).subscribe({
        next: () => {
          this.successMessage.set(`工具「${this.toolForm.toolName}」を更新しました。`);
          this.closeToolModal();
          this.loadTools();
        },
        error: () => alert('工具の更新に失敗しました。'),
      });
    } else {
      this.masterService.createTool(this.toolForm).subscribe({
        next: () => {
          this.successMessage.set(`工具「${this.toolForm.toolName}」を新規登録しました。`);
          this.closeToolModal();
          this.loadTools();
        },
        error: () => alert('工具の登録に失敗しました。'),
      });
    }
  }

  handleDeleteTool(t: ToolMasterItem): void {
    if (!confirm(`工具「${t.toolName}」を非活性化（削除）しますか？`)) {
      return;
    }
    this.masterService.deleteTool(t.id).subscribe({
      next: () => {
        this.successMessage.set(`工具「${t.toolName}」を削除しました。`);
        this.loadTools();
      },
      error: () => alert('工具の削除に失敗しました。'),
    });
  }

  private getInitialMachineForm(): SaveMachineMasterRequest {
    return {
      machineType: 'NC_AUTOMATIC_LATHE',
      machineName: '',
      maker: 'シチズンマシナリー',
      model: 'Cincom L20',
      maxRpm: 6000,
      maxBarDiameter: 20.0,
      guideBushType: 'GUIDE_BUSH',
      barFeederEnabled: true,
      maxMachiningLength: 200.0,
      hasSubSpindle: true,
      maxTools: 18,
      specialOptions: '高圧クーラント仕様, 背面複合回転工具4軸拡張',
      calculationEngineType: 'AUTOMATIC_LATHE',
      isActive: true,
    };
  }

  private getInitialToolForm(): SaveToolMasterRequest {
    return {
      toolCode: '',
      toolName: '',
      toolCategory: 'OD_ROUGH',
      materialCompatibility: '鋼・ステンレス・快削鋼',
      bladeWidth: null,
      noseRadius: 0.4,
      maxDepth: null,
      defaultFeed: 0.08,
      defaultVc: 120,
      notes: '',
      isActive: true,
    };
  }
}
