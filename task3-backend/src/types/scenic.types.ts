export interface LampPosition {
  lampId: string;
  name: string;
  x: number;
  y: number;
  zone: string;
}

export interface ScenicRoute {
  id: string;
  name: string;
  description: string;
  duration: string;
  lampIds: string[];
  highlights: string[];
}

export interface PhotoSpot {
  id: string;
  name: string;
  description: string;
  lampId: string;
  imageUrl?: string;
  bestTime: string;
  tags: string[];
}

export interface ScenicEvent {
  id: string;
  name: string;
  type: 'fireworks' | 'parade' | 'water_show' | 'other';
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  imageUrl?: string;
  countdown?: boolean;
}

export interface FaultReportRequest {
  reporterName: string;
  reporterPhone: string;
  lampId: string;
  description: string;
}

