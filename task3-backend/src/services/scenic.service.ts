import { lampPositions, photoSpots, scenicEvents, scenicRoutes } from '../data/scenic-data';

export class ScenicService {
  static getRoutes() {
    return scenicRoutes;
  }

  static getSpots() {
    return photoSpots;
  }

  static getEvents() {
    return scenicEvents;
  }

  static getLamps() {
    return lampPositions;
  }
}

