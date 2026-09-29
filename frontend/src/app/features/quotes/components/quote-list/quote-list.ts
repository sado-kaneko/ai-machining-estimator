import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { Quote } from '../../models/quote.model';

@Component({
  selector: 'app-quote-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quote-list.html',
  styleUrl: './quote-list.scss',
})
export class QuoteListComponent implements OnInit {
  private readonly quoteService = inject(QuoteService);
  private readonly router = inject(Router);

  quotes = signal<Quote[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

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
