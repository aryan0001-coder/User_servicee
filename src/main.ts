import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { winstonConfig } from './common/logger/winston.logger';
import { WinstonModule } from 'nest-winston';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import path, { join } from 'path';
// import { Transport } from '@nestjs/microservices';
// import path, { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     whitelist: true,
  //     transform: true,
  //     forbidNonWhitelisted: true,
  //   }),
  // );
  // const config = new DocumentBuilder()
  //   .setTitle('Social Media Application!!')
  //   .setDescription('Use the base API URL as http://localhost:3007')
  //   .setTermsOfService('http://localhost:3000/terms-of-service')
  //   .setLicense(
  //     'MIT License',
  //     'https://github.com/git/git-scm.com/blob/main/MIT-LICENSE.txt',
  //   )
  //   .addServer('http://localhost:3007/')
  //   .setVersion('1.0')
  //   .build();

  // const document = SwaggerModule.createDocument(app, config);
  // SwaggerModule.setup('api', app, document);
  // await app.listen(process.env.port ?? 3011);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'user',
      protoPath: 'src/user/proto/user.proto',
      url: '0.0.0.0:50051',
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  await app.listen(process.env.port ?? 3011);
}
bootstrap();
