import { ICalculationEngine } from './engine.interface';
import { automaticLatheEngine } from './automatic-lathe.engine';

export class CalculationEngineFactory {
  private static readonly engines: Map<string, ICalculationEngine> = new Map([
    ['AUTOMATIC_LATHE', automaticLatheEngine],
    // 将来追加:
    // ['NC_LATHE', ncLatheEngine],
    // ['MACHINING_CENTER', machiningCenterEngine],
    // ['TURNING_CENTER', turningCenterEngine],
  ]);

  static getEngine(engineType: string): ICalculationEngine {
    const engine = this.engines.get(engineType.toUpperCase());
    if (!engine) {
      // 未実装の場合は自動旋盤またはデフォルト
      if (engineType.toUpperCase() === 'NC_LATHE') {
        throw new Error('ENGINE_NOT_IMPLEMENTED');
      }
      return automaticLatheEngine;
    }
    return engine;
  }
}
