import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  fullName: string;

  @Prop()
  bio: string;

  @Prop({ default: 'public' })
  accountType: string;

  @Prop()
  profilePicture: string;

  @Prop({ default: 0 })
  followersCount: number;

  @Prop({ default: 0 })
  followingCount: number;

  @Prop({ type: [{ type: String, ref: 'User' }] })
  followers: string[];

  @Prop({ type: [{ type: String, ref: 'User' }] })
  following: string[];

  @Prop({ type: [{ type: String, ref: 'Post' }] })
  posts: string[];

  @Prop({ type: [{ type: String, ref: 'User' }], default: [] })
  blockedUsers: string[];

  @Prop({ default: false })
  isBanned: boolean;

  @Prop()
  banReason: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 'active' })
  status: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({
    type: [{ deviceId: String, token: String, lastActive: Date }],
    default: [],
  })
  sessions: { deviceId: string; token: string; lastActive: Date }[];
}

export const UserSchema = SchemaFactory.createForClass(User);
