import type { ApiResponse } from '../../../lib/types';

export type StatusData = {
  service: string;
  version: string;
  uptimeSeconds: number;
  checkedAt: string;
  environment: string;
  rateLimit: {
    maxAttemptsPerHour: number;
    windowSeconds: number;
  };
};

export type StatusResponse = ApiResponse<StatusData>;
