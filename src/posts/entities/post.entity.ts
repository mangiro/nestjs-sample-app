export class PostEntity {
  id: string;
  message: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<PostEntity>) {
    Object.assign(this, partial);
  }
}
