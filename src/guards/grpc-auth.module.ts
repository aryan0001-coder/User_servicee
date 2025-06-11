import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { GrpcAuthGuard } from './grpc-auth.guard';
import * as path from 'path';
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_PACKAGE',
        transport: Transport.GRPC,
        options: {
          package: 'auth',
          protoPath: 'src/user/proto/auth.proto',
          url: 'localhost:50052',
          loader: { keepCase: true },
        },
      },
    ]),
  ],
  providers: [GrpcAuthGuard],
  exports: [GrpcAuthGuard, ClientsModule],
})
export class GrpcAuthModule {}
