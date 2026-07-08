import { Request, Response } from 'express';
import { ScenicService } from '../services/scenic.service';

export class ScenicController {
  static getRoutes(req: Request, res: Response): void {
    res.json({ code: 200, message: 'success', data: ScenicService.getRoutes() });
  }

  static getSpots(req: Request, res: Response): void {
    res.json({ code: 200, message: 'success', data: ScenicService.getSpots() });
  }

  static getEvents(req: Request, res: Response): void {
    res.json({ code: 200, message: 'success', data: ScenicService.getEvents() });
  }

  static getLamps(req: Request, res: Response): void {
    res.json({ code: 200, message: 'success', data: ScenicService.getLamps() });
  }
}

