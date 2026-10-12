import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  MachineMasterItem,
  SaveMachineMasterRequest,
  ToolMasterItem,
  SaveToolMasterRequest,
} from '../models/master.model';

@Injectable({
  providedIn: 'root',
})
export class MasterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  // 加工設備マスタ
  getMachines(): Observable<{ items: MachineMasterItem[] }> {
    return this.http.get<{ items: MachineMasterItem[] }>(`${this.baseUrl}/masters/machines`);
  }

  createMachine(data: SaveMachineMasterRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.baseUrl}/masters/machines`, data);
  }

  updateMachine(id: number, data: SaveMachineMasterRequest): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/masters/machines/${id}`, data);
  }

  deleteMachine(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/masters/machines/${id}`);
  }

  // 工具マスタ
  getTools(): Observable<{ items: ToolMasterItem[] }> {
    return this.http.get<{ items: ToolMasterItem[] }>(`${this.baseUrl}/masters/tools`);
  }

  createTool(data: SaveToolMasterRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.baseUrl}/masters/tools`, data);
  }

  updateTool(id: number, data: SaveToolMasterRequest): Observable<{ success: boolean }> {
    return this.http.put<{ success: boolean }>(`${this.baseUrl}/masters/tools/${id}`, data);
  }

  deleteTool(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/masters/tools/${id}`);
  }
}
