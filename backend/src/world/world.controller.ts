import { Controller, Get, Inject } from "@nestjs/common";
import { WorldService } from "./world.service";

@Controller("world")
export class WorldController {
  constructor(@Inject(WorldService) private readonly world: WorldService) {}

  @Get()
  snapshot() {
    return this.world.snapshot();
  }

  @Get("species")
  species() {
    return this.world.listSpecies();
  }
}
