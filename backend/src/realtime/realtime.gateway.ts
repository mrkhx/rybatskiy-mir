import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: { origin: true, credentials: false },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket): void {
    client.emit("hello", {
      app: "rybatskiy-mir",
      ok: true,
    });
    this.logger.debug(`socket connected ${client.id}`);
  }
}
