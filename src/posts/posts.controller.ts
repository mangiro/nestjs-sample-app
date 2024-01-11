import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getById(@Param('id') id: string) {
    return this.postsService.findOne({ id: id });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPosts(@Req() req: any) {
    return this.postsService.findMany({
      where: { author: req.user.id },
    });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: any, @Body() createPostDto: CreatePostDto) {
    const { message } = createPostDto;
    return this.postsService.createPost({
      message,
      authorRel: {
        connect: { id: req.user.id },
      },
    });
  }
}
