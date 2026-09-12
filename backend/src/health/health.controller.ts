import { Controller, Get, HttpStatus, Inject, Res } from "@nestjs/common";
import type { Response } from "express";
import {
  HealthService,
  type HealthResponse,
  type LiveResponse,
} from "./health.service";

@Controller("health")
export class HealthController {
  constructor(@Inject(HealthService) private readonly health: HealthService) {}

  @Get()
  getHealth(): Promise<HealthResponse> {
    return this.health.check();
  }

  @Get("live")
  getLive(): LiveResponse {
    return this.health.live();
  }

  @Get("ready")
  async getReady(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const result = await this.health.readiness();
    res.status(result.ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return result.body;
  }
}
