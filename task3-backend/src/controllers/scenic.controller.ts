import { Request, Response } from 'express';
import { ScenicService } from '../services/scenic.service';

export class ScenicController {
  static async getRoutes(req: Request, res: Response): Promise<void> {
    try {
      const data = await ScenicService.getRoutes();
      res.json({ code: 200, message: 'success', data });
    } catch (error) {
      console.error('[ScenicController] getRoutes error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async getSpots(req: Request, res: Response): Promise<void> {
    try {
      const data = await ScenicService.getSpots();
      res.json({ code: 200, message: 'success', data });
    } catch (error) {
      console.error('[ScenicController] getSpots error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const data = await ScenicService.getEvents();
      res.json({ code: 200, message: 'success', data });
    } catch (error) {
      console.error('[ScenicController] getEvents error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }

  static async getLamps(req: Request, res: Response): Promise<void> {
    try {
      const data = await ScenicService.getLamps();
      res.json({ code: 200, message: 'success', data });
    } catch (error) {
      console.error('[ScenicController] getLamps error:', error);
      res.status(500).json({ code: 500, message: '服务器内部错误', data: null });
    }
  }
}
