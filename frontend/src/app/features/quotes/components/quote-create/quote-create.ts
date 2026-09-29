import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { CreateQuoteRequest } from '../../models/quote.model';

@Component({
  selector: 'app-quote-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './quote-create.html',
  styleUrl: './quote-create.scss',
})
export class QuoteCreateComponent {
  private readonly quoteService = inject(QuoteService);
  private readonly router = inject(Router);

  form: CreateQuoteRequest = {
    customerName: '',
    partNo: '',
    partName: '',
    quantity: 1,
    status: 'DRAFT',
    notes: '',
  };

  isSubmitting = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    // 入力チェック
    if (!this.form.customerName || !this.form.customerName.trim()) {
      this.errorMessage.set('顧客名は必須です。');
      return;
    }

    if (!this.form.quantity || this.form.quantity < 1) {
      this.errorMessage.set('数量は1以上の整数を入力してください。');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    this.quoteService.createQuote(this.form).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.router.navigate(['/quotes']);
      },
      error: (err) => {
        const errorDetail = err?.error?.error?.message || '登録に失敗しました。';
        this.errorMessage.set(errorDetail);
        this.isSubmitting.set(false);
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/quotes']);
  }
}
