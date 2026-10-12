import { Routes } from '@angular/router';
import { QuoteListComponent } from './features/quotes/components/quote-list/quote-list';
import { QuoteCreateComponent } from './features/quotes/components/quote-create/quote-create';
import { QuoteDetailComponent } from './features/quotes/components/quote-detail/quote-detail';
import { ProductionAnalysisComponent } from './features/analysis/components/production-analysis/production-analysis.component';
import { AccuracyDashboardComponent } from './features/accuracy/accuracy-dashboard/accuracy-dashboard.component';
import { MasterMaintenanceComponent } from './features/masters/components/master-maintenance/master-maintenance.component';

export const routes: Routes = [
  { path: '', redirectTo: 'quotes', pathMatch: 'full' },
  { path: 'quotes', component: QuoteListComponent },
  { path: 'quotes/new', component: QuoteCreateComponent },
  { path: 'quotes/:id', component: QuoteDetailComponent },
  { path: 'analysis', component: ProductionAnalysisComponent },
  { path: 'accuracy', component: AccuracyDashboardComponent },
  { path: 'masters', component: MasterMaintenanceComponent },
];

