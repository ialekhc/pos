import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/sync',
  cors: {
    origin: '*'
  }
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('jwt.accessSecret')
      });

      if (payload.tenantId) {
        client.join(`tenant:${payload.tenantId}`);
      }

      client.data.user = payload;
      this.logger.log(`Client connected: ${client.id}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('tenant:join')
  joinTenantRoom(@ConnectedSocket() client: Socket, @MessageBody() tenantId: string) {
    client.join(`tenant:${tenantId}`);
    return { joined: tenantId };
  }

  emitInventoryUpdated(tenantId: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('inventory.updated', payload);
  }

  emitSaleCreated(tenantId: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('sale.created', payload);
  }

  emitDashboardMetrics(tenantId: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit('dashboard.metrics', payload);
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string') {
      return authToken;
    }

    return null;
  }
}
