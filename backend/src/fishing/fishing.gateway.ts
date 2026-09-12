import { Inject, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import type { AuthUser } from "../auth/auth.types";
import { FishingService } from "./fishing.service";

@WebSocketGateway({ cors: { origin: true, credentials: false } })
export class FishingGateway implements OnGatewayConnection {
  private readonly logger = new Logger(FishingGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(FishingService) private readonly fishing: FishingService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = String(client.handshake.auth.token ?? client.handshake.query.token ?? "");
    if (token) {
      try {
        const user = await this.jwt.verifyAsync<AuthUser>(token);
        client.data.user = user;
        await client.join(`user:${user.id}`);
        await client.join("global");
        await client.join("waterbody:forest-lake");
      } catch {
        this.logger.debug(`socket ${client.id} without valid jwt`);
      }
    }
    client.emit("hello", { app: "rybatskiy-mir", ok: true });
  }

  @SubscribeMessage("fishing:cast")
  async onCast(@ConnectedSocket() client: Socket, @MessageBody() body: { force: number; direction: number; depthM: number }) {
    const user = this.user(client);
    const session = await this.fishing.cast(user.id, body);
    client.emit("fishing:state", session);
    return session;
  }

  @SubscribeMessage("fishing:hook")
  async onHook(@ConnectedSocket() client: Socket, @MessageBody() body: { timingMs: number }) {
    const user = this.user(client);
    const session = await this.fishing.hook(user.id, body.timingMs);
    client.emit("fishing:state", session);
    if (session.tier === "TROPHY" || session.tier === "RECORD" || session.tier === "LEGENDARY") {
      this.server.to("waterbody:forest-lake").emit("live:record", {
        nickname: user.nickname,
        tier: session.tier,
        weightG: session.weightG,
      });
    }
    return session;
  }

  @SubscribeMessage("fishing:tick")
  async onTick(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { reel: number; rodPressure: number; rodDir: number; drag: number },
  ) {
    const user = this.user(client);
    const session = await this.fishing.tick(user.id, body);
    client.emit("fishing:state", session);
    return session;
  }

  @SubscribeMessage("presence:join")
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: { room: string }) {
    if (!body?.room) return;
    await client.join(body.room);
    this.server.to(body.room).emit("presence:count", {
      room: body.room,
      count: (await this.server.in(body.room).fetchSockets()).length,
    });
  }

  private user(client: Socket): AuthUser {
    const user = client.data.user as AuthUser | undefined;
    if (!user) {
      throw new Error("unauthorized socket");
    }
    return user;
  }
}
