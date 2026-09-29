import { Routes } from '@angular/router';
import { QuoteListComponent } from './features/quotes/components/quote-list/quote-list';
import { QuoteCreateComponent } from './features/quotes/components/quote-create/quote-create';
import { QuoteDetailComponent } from './features/quotes/components/quote-detail/quote-detail';

export const routes: Routes = [
  { path: '', redirectTo: 'quotes', pathMatch: 'full' },
  { path: 'quotes', component: QuoteListComponent },
  { path: 'quotes/new', component: QuoteCreateComponent },
  { path: 'quotes/:id', component: QuoteDetailComponent },
];
