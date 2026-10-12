import { masterRepository } from '../repositories/master.repository';
import {
  MachineMasterItem,
  SaveMachineMasterRequest,
  ToolMasterItem,
  SaveToolMasterRequest,
} from '../types/master';

export class MasterService {
  async getMachines(): Promise<MachineMasterItem[]> {
    return masterRepository.getAllMachines();
  }

  async createMachine(req: SaveMachineMasterRequest): Promise<{ id: number }> {
    if (!req.machineName) {
      throw new Error('MACHINE_NAME_REQUIRED');
    }
    const id = await masterRepository.createMachine(req);
    return { id };
  }

  async updateMachine(id: number, req: SaveMachineMasterRequest): Promise<boolean> {
    return masterRepository.updateMachine(id, req);
  }

  async deleteMachine(id: number): Promise<boolean> {
    return masterRepository.deleteMachine(id);
  }

  async getTools(): Promise<ToolMasterItem[]> {
    return masterRepository.getAllTools();
  }

  async createTool(req: SaveToolMasterRequest): Promise<{ id: number }> {
    if (!req.toolCode || !req.toolName) {
      throw new Error('TOOL_FIELDS_REQUIRED');
    }
    const id = await masterRepository.createTool(req);
    return { id };
  }

  async updateTool(id: number, req: SaveToolMasterRequest): Promise<boolean> {
    return masterRepository.updateTool(id, req);
  }

  async deleteTool(id: number): Promise<boolean> {
    return masterRepository.deleteTool(id);
  }
}

export const masterService = new MasterService();
