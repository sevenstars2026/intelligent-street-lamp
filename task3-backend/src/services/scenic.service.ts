import { DatabaseService } from './database.service';
import { MockDatabase } from '../mock/mock-database';

export class ScenicService {
  static async getRoutes() {
    try { return await DatabaseService.getScenicRoutes(); }
    catch { return MockDatabase.getScenicRoutes(); }
  }
  static async getSpots() {
    try { return await DatabaseService.getScenicSpots(); }
    catch { return MockDatabase.getScenicSpots(); }
  }
  static async getEvents() {
    try { return await DatabaseService.getScenicEvents(); }
    catch { return MockDatabase.getScenicEvents(); }
  }
  static async getLamps() {
    try { return await DatabaseService.getScenicLamps(); }
    catch { return MockDatabase.getScenicLamps(); }
  }
}
