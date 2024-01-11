import { Exclude } from 'class-transformer';

export class UserEntity {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;

  @Exclude({ toPlainOnly: true })
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
