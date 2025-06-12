import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  Put,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { User } from './schemas/user.schema';
//import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GrpcMethod } from '@nestjs/microservices';
//import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller()
export class UserGrpcController {
  constructor(private readonly userService: UserService) {}

  @GrpcMethod('UserService', 'findAll')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    try {
      return await this.userService.findAll(page, limit);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch users',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @GrpcMethod('UserService', 'search')
  async search(@Query() queryUserDto: QueryUserDto) {
    return this.userService.search(queryUserDto);
  }

  @GrpcMethod('UserService', 'findOne')
  async findOne(@Param('id') id: string) {
    try {
      const user = await this.userService.findOne(id);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return user;
    } catch (error) {
      throw new HttpException(
        error.message || 'User not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @GrpcMethod('UserService', 'FindByUsername')
  async FindByUsername(@Param('username') username: string): Promise<User> {
    try {
      return await this.userService.findByUsername(username);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException(
        `Failed to fetch user by username: ${error.message}`,
      );
    }
  }

  @GrpcMethod('UserService', 'update')
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    try {
      return await this.userService.update(id, updateUserDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @GrpcMethod('UserService', 'remove')
  async remove(@Param('id') id: string) {
    try {
      await this.userService.remove(id);
      return { message: 'User deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @GrpcMethod('UserService', 'follow')
  async follow(@Param('id') id: string, @Body('userId') userId: string) {
    try {
      return await this.userService.follow(id, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to follow user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @GrpcMethod('UserService', 'unfollow')
  async unfollow(@Param('id') id: string, @Body('userId') userId: string) {
    try {
      return await this.userService.unfollow(id, userId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to unfollow user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @GrpcMethod('UserService', 'getFollowers')
  async getFollowers(
    @Param('id') id: string,
    @Query() queryUserDto: QueryUserDto,
  ) {
    try {
      return await this.userService.getFollowers(id, queryUserDto.page);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get followers',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @GrpcMethod('UserService', 'getFollowing')
  async getFollowing(
    @Param('id') id: string,
    @Query() queryUserDto: QueryUserDto,
  ) {
    try {
      return await this.userService.getFollowing(id, queryUserDto.page);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get following',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @GrpcMethod('UserService', 'blockUser')
  async blockUser(
    @Param('id') id: string,
    @Body()
    blockUserDto: BlockUserDto,
  ): Promise<User | null> {
    return this.userService.blockUser(id, blockUserDto);
  }

  @GrpcMethod('UserService', 'unblockUser')
  unblockUser(
    @Param('id') id: string,
    @Body()
    blockUserDto: BlockUserDto,
  ): Promise<User | null> {
    return this.userService.unblockUser(id, blockUserDto);
  }

  @GrpcMethod('UserService', 'ValidateUser')
  validateUser(id: string) {
    return this.userService.validateUser(id);
  }
}
