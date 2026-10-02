import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { Quote } from '../../models/quote.model';

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quote-list.html',
  styleUrl: './quote-list.scss',
})
export class QuoteListComponent implements OnInit {
  private readonly quoteService = inject(QuoteService);
  private readonly router = inject(Router);

  quotes = signal<Quote[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // 検索・フィルタリング用シグナル
  searchTerm = signal<string>('');
  selectedStatus = signal<string>('ALL');

  filteredQuotes = computed(() => {
    const list = this.quotes();
    const term = this.searchTerm().trim().toLowerCase();
    const status = this.selectedStatus();

    return list.filter((q) => {
      const matchStatus = status === 'ALL' || q.status === status;
      const matchTerm =
        !term ||
        q.customerName?.toLowerCase().includes(term) ||
        q.partNo?.toLowerCase().includes(term) ||
        q.partName?.toLowerCase().includes(term) ||
        q.quoteNo?.toLowerCase().includes(term) ||
        q.material?.toLowerCase().includes(term);

      return matchStatus && matchTerm;
    });
  });

  ngOnInit(): void {
    this.loadQuotes();
  }

  loadQuotes(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.quoteService.getQuotes().subscribe({
      next: (response) => {
        this.quotes.set(response.items);
        this.isLoading.set(false);
      },
      error: () => {
        this.errorMessage.set('見積案件一覧の取得に失敗しました。');
        this.isLoading.set(false);
      },
    });
  }

  isDeletingId = signal<number | null>(null);
  successMessage = signal<string | null>(null);

  navigateToCreate(): void {
    this.router.navigate(['/quotes/new']);
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/quotes', id]);
  }

  deleteQuote(id: number, quoteLabel: string, event: MouseEvent): void {
    event.stopPropagation();

    if (!confirm(`見積案件「${quoteLabel}」を削除してもよろしいですか？\n※関連する図面・解析データ・計算結果もすべて削除されます。`)) {
      return;
    }

    this.isDeletingId.set(id);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.quoteService.deleteQuote(id).subscribe({
      next: () => {
        this.isDeletingId.set(null);
        this.successMessage.set(`見積案件「${quoteLabel}」を削除しました。`);
        setTimeout(() => this.successMessage.set(null), 4000);
        this.loadQuotes();
      },
      error: (err) => {
        this.isDeletingId.set(null);
        const msg = err?.error?.error?.message || '見積案件の削除に失敗しました。';
        this.errorMessage.set(msg);
      },
    });
  }
}
