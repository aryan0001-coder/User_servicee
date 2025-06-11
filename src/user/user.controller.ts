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
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { User } from './schemas/user.schema';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GrpcAuthGuard } from '../guards/grpc-auth.guard';
import { BanUserDto } from './dto/ban-user.dto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
//@UseGuards(GrpcAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({
    description: 'create a new user',
  })
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.userService.create(createUserDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @ApiOperation({
    description: 'get all users with pagination',
  })
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

  @Get('search')
  @ApiOperation({
    description: 'search for users',
  })
  async search(@Query() queryUserDto: QueryUserDto) {
    return this.userService.search(queryUserDto);
  }

  @Get('me')
  @ApiOperation({
    description: 'get current user profile',
  })
  async getCurrentUser(@Req() req) {
    try {
      const userId = req.user.userId;
      const user = await this.userService.findOne(userId);
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

  @Get(':id')
  @ApiOperation({
    description: 'find a specific user with the id',
  })
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

  @Get('username/:username')
  @ApiOperation({
    description: 'find a specific user with the username',
  })
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

  @Patch()
  @ApiOperation({
    description: 'update current user profile',
  })
  async updateCurrentUser(@Body() updateUserDto: UpdateUserDto, @Req() req) {
    try {
      const userId = req.user.userId;
      return await this.userService.update(userId, updateUserDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(':id')
  @ApiOperation({
    description: 'update a user with the id (admin only)',
  })
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req,
  ) {
    try {
      // Check if user is admin or the same user
      if (req.user.role !== 'admin' && req.user.userId !== id) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
      return await this.userService.update(id, updateUserDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete()
  @ApiOperation({
    description: 'delete current user account',
  })
  async removeCurrentUser(@Req() req) {
    try {
      const userId = req.user.userId;
      await this.userService.remove(userId);
      return { message: 'User deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  @ApiOperation({
    description: 'delete a user with the id (admin only)',
  })
  async removeUser(@Param('id') id: string, @Req() req) {
    try {
      if (req.user.role !== 'admin') {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
      await this.userService.remove(id);
      return { message: 'User deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/follow')
  @ApiOperation({
    description: 'follow a user with the id',
  })
  async follow(@Param('id') id: string, @Req() req) {
    try {
      const loggedInUserId = req.user.userId;
      return await this.userService.follow(id, loggedInUserId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to follow user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id/unfollow')
  @ApiOperation({
    description: 'unfollow a user with the id',
  })
  async unfollow(@Param('id') id: string, @Req() req) {
    try {
      const loggedInUserId = req.user.userId;
      return await this.userService.unfollow(id, loggedInUserId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to unfollow user',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('me/followers')
  @ApiOperation({
    description: 'get current user followers',
  })
  async getCurrentUserFollowers(
    @Req() req,
    @Query() queryUserDto: QueryUserDto,
  ) {
    try {
      const userId = req.user.userId;
      return await this.userService.getFollowers(userId, queryUserDto.page);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get followers',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('me/following')
  @ApiOperation({
    description: 'get current user following',
  })
  async getCurrentUserFollowing(
    @Req() req,
    @Query() queryUserDto: QueryUserDto,
  ) {
    try {
      const userId = req.user.userId;
      return await this.userService.getFollowing(userId, queryUserDto.page);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get following',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/followers')
  @ApiOperation({
    description: 'get followers of a user with the id',
  })
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

  @Get(':id/following')
  @ApiOperation({
    description: 'get following of a user with the id',
  })
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

  @Post(':id/block')
  @ApiOperation({
    description: 'block a user with the id',
  })
  async blockUser(@Param('id') id: string, @Req() req): Promise<User | null> {
    const blockUserDto: BlockUserDto = {
      userId: id,
      blockedBy: req.user.userId,
      blockedAt: new Date(),
    };
    return this.userService.blockUser(id, blockUserDto);
  }

  @Post(':id/unblock')
  @ApiOperation({
    description: 'unblock a user with the id',
  })
  async unblockUser(@Param('id') id: string, @Req() req): Promise<User | null> {
    const blockUserDto: BlockUserDto = {
      userId: id,
      blockedBy: req.user.userId,
      blockedAt: new Date(),
    };
    return this.userService.unblockUser(id, blockUserDto);
  }

  @Post(':id/ban')
  @ApiOperation({ summary: 'Ban a user' })
  async banUser(
    @Param('id') id: string,
    @Body() banUserDto: BanUserDto,
    @Req() req,
  ) {
    // if (req.user.role !== 'admin') {
    //   throw new HttpException(
    //     'Only admins can ban users',
    //     HttpStatus.FORBIDDEN,
    //   );
    // }

    try {
      return await this.userService.banUser(id, banUserDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to ban user',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id/unban')
  @ApiOperation({ summary: 'Unban a user' })
  async unbanUser(@Param('id') id: string, @Req() req) {
    if (req.user.role !== 'admin') {
      throw new HttpException(
        'Only admins can unban users',
        HttpStatus.FORBIDDEN,
      );
    }

    try {
      return await this.userService.unbanUser(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to unban user',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('banned')
  @ApiOperation({ summary: 'Get all banned users' })
  async getBannedUsers(@Req() req) {
    if (req.user.role !== 'admin') {
      throw new HttpException(
        'Only admins can view banned users',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.userService.getBannedUsers();
  }

  @Get('validate')
  @ApiOperation({
    description: 'validate current user',
  })
  validateCurrentUser(@Req() req) {
    return this.userService.validateUser(req.user.userId);
  }

  @Get(':id/validate')
  @ApiOperation({
    description: 'validate a user with the id (admin only)',
  })
  validateUser(@Param('id') id: string, @Req() req) {
    if (req.user.role !== 'admin') {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.userService.validateUser(id);
  }

  @Post(':id/profile-picture/upload-url')
  @ApiOperation({
    summary: 'Generate presigned URL for profile picture upload',
  })
  async generateUploadUrl(
    @Param('id') userId: string,
    @Body() generateUploadUrlDto: GenerateUploadUrlDto,
    @Req() req,
  ) {
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      throw new ForbiddenException('Not authorized to update this profile');
    }
    return this.userService.generatePresignedUrl(
      userId,
      generateUploadUrlDto.fileType,
    );
  }

  @Put(':id/profile-picture/confirm')
  @ApiOperation({ summary: 'Confirm profile picture upload and update user' })
  async confirmProfilePicture(
    @Param('id') userId: string,
    @Body() confirmUploadDto: ConfirmUploadDto,
    @Req() req,
  ) {
    if (req.user.userId !== userId && req.user.role !== 'admin') {
      throw new ForbiddenException('Not authorized to update this profile');
    }
    return this.userService.updateProfilePicture(
      userId,
      confirmUploadDto.imageKey,
    );
  }
}
