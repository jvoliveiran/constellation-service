import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('AppModule (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/graphql QUERY person by ID', async () => {
    const queryData = {
      query: `query GetOne($id: Int!) {
        getOne(id: $id) {
          id,
          name,
          age
        }
      }`,
      variables: { id: 1 },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.getOne.id).toBe('1');
  });
});
