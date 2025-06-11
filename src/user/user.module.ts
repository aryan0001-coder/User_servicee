import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema } from './schemas/user.schema';
import { AuthModule } from '../auth/auth.module';
import { UserGrpcController } from './user.grpc.controller';
import { GrpcAuthGuard } from 'src/guards/grpc-auth.guard';
import { GrpcAuthModule } from 'src/guards/grpc-auth.module';
//import { UserGrpcController } from "./user.grpc.controller";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
    GrpcAuthModule,
  ],
  controllers: [UserController, UserGrpcController],
  providers: [UserService, GrpcAuthGuard],
  exports: [UserService, MongooseModule],
})
export class UserModule {}
