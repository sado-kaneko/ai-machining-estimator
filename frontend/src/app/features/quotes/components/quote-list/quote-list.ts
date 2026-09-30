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

  navigateToCreate(): void {
    this.router.navigate(['/quotes/new']);
  }

  navigateToDetail(id: number): void {
    this.router.navigate(['/quotes', id]);
  }
}
