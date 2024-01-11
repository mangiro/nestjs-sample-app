import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import {
  INestApplication,
  ClassSerializerInterceptor,
  ValidationPipe,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import * as cookieParser from 'cookie-parser';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('App (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    app.use(cookieParser());
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.$transaction([
      prisma.user.deleteMany(),
      prisma.post.deleteMany(),
    ]);
  });

  afterAll(() => {
    app.close();
  });

  describe('Users', () => {
    describe('Create user: /users (POST)', () => {
      it('should validate empty body', () => {
        return request(app.getHttpServer())
          .post('/users')
          .expect(400)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toContain('email should not be empty');
            expect(message).toContain('password should not be empty');
          });
      });

      it('should validate email field', () => {
        return request(app.getHttpServer())
          .post('/users')
          .send({
            email: 'testemail.com',
            password: 'test123',
          })
          .expect(400)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toContain('email must be an email');
          });
      });

      it('should validate password length', () => {
        return request(app.getHttpServer())
          .post('/users')
          .send({
            email: 'test@email.com',
            password: 'test',
          })
          .expect(400)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toContain(
              'password must be longer than or equal to 6 characters',
            );
          });
      });

      it('should successfully create a user', () => {
        return request(app.getHttpServer())
          .post('/users')
          .send({
            email: 'test@email.com',
            password: 'test123',
          })
          .expect(201)
          .expect((response: request.Response) => {
            const { id, email, createdAt, updatedAt, password } = response.body;

            expect(typeof id).toBe('string');
            expect(email).toEqual('test@email.com');
            expect(password).toBeUndefined();
            expect(new Date(createdAt)).toBeInstanceOf(Date);
            expect(new Date(updatedAt)).toBeInstanceOf(Date);
          });
      });

      it('should not create existing user', () => {
        return request(app.getHttpServer())
          .post('/users')
          .send({
            email: 'test@email.com',
            password: 'test123',
          })
          .expect(400)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toEqual('User already exists.');
          });
      });
    });
  });

  describe('Auth', () => {
    describe('Login: /auth/login (POST)', () => {
      it('should validate empty body', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .expect(400)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toContain('email should not be empty');
            expect(message).toContain('password should not be empty');
          });
      });

      it('should validate email field', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'testemail.com',
            password: 'test123',
          })
          .expect(400)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toContain('email must be an email');
          });
      });

      it('should sign in', () => {
        return request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'test@email.com',
            password: 'test123',
          })
          .expect(200)
          .expect((response: request.Response) => {
            accessToken = response.get('Set-Cookie')[0].split(';')[0];
          });
      });
    });

    describe('Logged in user: /auth/user (GET)', () => {
      it('should not allow calling /auth/user (GET) without auth', () => {
        return request(app.getHttpServer())
          .get('/auth/user')
          .expect(401)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toEqual('Unauthorized');
          });
      });

      it('should return the logged in user', () => {
        return request(app.getHttpServer())
          .get('/auth/user')
          .set('Cookie', accessToken)
          .expect(200)
          .expect((response: request.Response) => {
            const { id, email, posts, createdAt, updatedAt, password } =
              response.body;

            expect(typeof id).toBe('string');
            expect(typeof posts).toBe('object');
            expect(email).toEqual('test@email.com');
            expect(password).toBeUndefined();
            expect(new Date(createdAt)).toBeInstanceOf(Date);
            expect(new Date(updatedAt)).toBeInstanceOf(Date);
          });
      });
    });
  });

  describe('Posts', () => {
    let postId: string;

    describe('Create post: /posts (POST)', () => {
      it('should not allow calling /posts (POST) without auth', () => {
        return request(app.getHttpServer())
          .post('/posts')
          .expect(401)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toEqual('Unauthorized');
          });
      });

      it('should validate empty body', () => {
        return request(app.getHttpServer())
          .post('/posts')
          .set('Cookie', accessToken)
          .expect(400)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toContain('message should not be empty');
          });
      });

      it('should validate message length', () => {
        return request(app.getHttpServer())
          .post('/posts')
          .set('Cookie', accessToken)
          .send({ message: 'x'.repeat(281) })
          .expect(400)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toContain(
              'message must be shorter than or equal to 280 characters',
            );
          });
      });

      it('should successfully create a post', () => {
        return request(app.getHttpServer())
          .post('/posts')
          .set('Cookie', accessToken)
          .send({ message: 'x'.repeat(280) })
          .expect(201)
          .expect((response: request.Response) => {
            const { id, message, author, createdAt, updatedAt } = response.body;

            expect(typeof id).toBe('string');
            expect(typeof author).toBe('string');
            expect(message).toHaveLength(280);
            expect(new Date(createdAt)).toBeInstanceOf(Date);
            expect(new Date(updatedAt)).toBeInstanceOf(Date);
            expect(author).toEqual(
              new JwtService().decode(accessToken.split('=')[1]).id,
            );

            postId = id;
          });
      });
    });

    describe('Get post: /posts/:id (GET)', () => {
      it('should not allow calling /posts/:id (GET) without auth', () => {
        return request(app.getHttpServer())
          .get('/posts/00000000-0000-0000-0000-000000000000')
          .expect(401)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toEqual('Unauthorized');
          });
      });

      it('should return 404 when a post is not found', () => {
        return request(app.getHttpServer())
          .get('/posts/00000000-0000-0000-0000-000000000000')
          .set('Cookie', accessToken)
          .expect(404)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toEqual('Post not found.');
          });
      });

      it('should return the post when it is found', () => {
        return request(app.getHttpServer())
          .get(`/posts/${postId}`)
          .set('Cookie', accessToken)
          .expect(200)
          .expect((response: request.Response) => {
            const { id, message, author, createdAt, updatedAt } = response.body;

            expect(typeof id).toBe('string');
            expect(typeof author).toBe('string');
            expect(message).toBeDefined();
            expect(new Date(createdAt)).toBeInstanceOf(Date);
            expect(new Date(updatedAt)).toBeInstanceOf(Date);
            expect(author).toEqual(
              new JwtService().decode(accessToken.split('=')[1]).id,
            );
          });
      });
    });

    describe('Get logged in user with created posts: /auth/user (GET)', () => {
      it('should return the logged in user with posts field filled in', () => {
        return request(app.getHttpServer())
          .get('/auth/user')
          .set('Cookie', accessToken)
          .expect(200)
          .expect((response: request.Response) => {
            const { id, email, posts, createdAt, updatedAt, password } =
              response.body;

            expect(typeof id).toBe('string');
            expect(typeof posts).toBe('object');
            expect(email).toEqual('test@email.com');
            expect(password).toBeUndefined();
            expect(new Date(createdAt)).toBeInstanceOf(Date);
            expect(new Date(updatedAt)).toBeInstanceOf(Date);

            expect(posts.length).toBeGreaterThanOrEqual(1);
            expect(posts[0].id).toBeDefined();
          });
      });
    });

    describe('Get posts: /posts (GET)', () => {
      it('should not allow calling /posts (GET) without auth', () => {
        return request(app.getHttpServer())
          .get('/posts')
          .expect(401)
          .expect((response: request.Response) => {
            const { message } = response.body;

            expect(message).toEqual('Unauthorized');
          });
      });

      it('should return a list of posts', () => {
        return request(app.getHttpServer())
          .get('/posts')
          .set('Cookie', accessToken)
          .expect(200)
          .expect((response: request.Response) => {
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toBeGreaterThanOrEqual(1);

            const { id, message, author, createdAt, updatedAt } =
              response.body[0];

            expect(typeof id).toBe('string');
            expect(typeof author).toBe('string');
            expect(message).toBeDefined();
            expect(new Date(createdAt)).toBeInstanceOf(Date);
            expect(new Date(updatedAt)).toBeInstanceOf(Date);
            expect(author).toEqual(
              new JwtService().decode(accessToken.split('=')[1]).id,
            );
          });
      });

      it('should return an empty list when the user has no posts', async () => {
        await prisma.$transaction([prisma.post.deleteMany()]);

        return request(app.getHttpServer())
          .get('/posts')
          .set('Cookie', accessToken)
          .expect(200)
          .expect((response: request.Response) => {
            expect(response.body).toBeInstanceOf(Array);
            expect(response.body.length).toEqual(0);
            expect(response.body).toEqual([]);
          });
      });
    });
  });
});
