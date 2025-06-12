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
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { GrpcAuthGuard } from '../guards/grpc-auth.guard';
import { BanUserDto } from './dto/ban-user.dto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

@Controller('users')
@ApiTags('users')
@ApiBearerAuth()
@UseGuards(GrpcAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({
    description: 'get all users with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'List of users retrieved successfully.',
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
  @ApiResponse({ status: 200, description: 'Users search results.' })
  async search(@Query() queryUserDto: QueryUserDto) {
    return this.userService.search(queryUserDto);
  }

  @Get('me')
  @ApiOperation({
    description: 'get current user profile',
  })
  @ApiResponse({ status: 200, description: 'Current user profile retrieved.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
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
  @ApiResponse({ status: 200, description: 'User found by id.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
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
  @ApiResponse({ status: 200, description: 'User found by username.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
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
  @ApiResponse({ status: 200, description: 'Current user profile updated.' })
  @ApiResponse({ status: 400, description: 'Failed to update user.' })
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
  @ApiResponse({ status: 200, description: 'User updated by admin.' })
  @ApiResponse({ status: 400, description: 'Failed to update user.' })
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
  @ApiResponse({ status: 200, description: 'Current user account deleted.' })
  @ApiResponse({ status: 400, description: 'Failed to delete user.' })
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
  @ApiResponse({ status: 200, description: 'User deleted by admin.' })
  @ApiResponse({ status: 400, description: 'Failed to delete user.' })
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
  @ApiResponse({ status: 200, description: 'User followed successfully.' })
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
  @ApiResponse({ status: 200, description: 'User unfollowed successfully.' })
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
  @ApiResponse({
    status: 200,
    description: 'Current user followers retrieved.',
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
  @ApiResponse({
    status: 200,
    description: 'Current user following retrieved.',
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
  @ApiResponse({ status: 200, description: 'Followers of user retrieved.' })
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
  @ApiResponse({ status: 200, description: 'Following of user retrieved.' })
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
  @ApiResponse({ status: 200, description: 'User blocked successfully.' })
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
  @ApiResponse({ status: 200, description: 'User unblocked successfully.' })
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
  @ApiResponse({ status: 200, description: 'User banned successfully.' })
  async banUser(
    @Param('id') id: string,
    @Body() banUserDto: BanUserDto,
    @Req() req,
  ) {
    if (req.user.role !== 'admin') {
      throw new HttpException(
        'Only admins can ban users',
        HttpStatus.FORBIDDEN,
      );
    }

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
  @ApiResponse({ status: 200, description: 'User unbanned successfully.' })
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
  @ApiResponse({ status: 200, description: 'List of banned users retrieved.' })
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
  @ApiResponse({ status: 200, description: 'Current user validated.' })
  async validateCurrentUser(@Req() req) {
    return this.userService.validateUser(req.user.userId);
  }

  @Get(':id/validate')
  @ApiOperation({
    description: 'validate a user with the id (admin only)',
  })
  @ApiResponse({ status: 200, description: 'User validated by admin.' })
  async validateUser(@Param('id') id: string, @Req() req) {
    if (req.user.role !== 'admin') {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return this.userService.validateUser(id);
  }

  @Post(':id/profile-picture/upload-url')
  @ApiOperation({
    summary: 'Generate presigned URL for profile picture upload',
  })
  @ApiResponse({ status: 200, description: 'Presigned URL generated.' })
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
  @ApiResponse({ status: 200, description: 'Profile picture updated.' })
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
