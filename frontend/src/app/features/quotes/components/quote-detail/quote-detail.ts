import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { DrawingService } from '../../services/drawing.service';
import { Quote } from '../../models/quote.model';
import { Drawing } from '../../models/drawing.model';

@Component({
  selector: 'app-quote-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quote-detail.html',
  styleUrl: './quote-detail.scss',
})
export class QuoteDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quoteService = inject(QuoteService);
  private readonly drawingService = inject(DrawingService);

  quote = signal<Quote | null>(null);
  drawings = signal<Drawing[]>([]);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  isUploading = signal<boolean>(false);
  drawingErrorMessage = signal<string | null>(null);
  selectedFile = signal<File | null>(null);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? parseInt(idParam, 10) : null;

    if (!id || isNaN(id)) {
      this.errorMessage.set('無効な見積案件IDです。');
      return;
    }

    this.loadQuote(id);
    this.loadDrawings(id);
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
      },
      error: () => {
        this.drawingErrorMessage.set('図面一覧の取得に失敗しました。');
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
}
