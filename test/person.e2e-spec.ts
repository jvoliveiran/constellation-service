import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestModule } from './factory/create-test-module';
import { PrismaService } from 'src/prisma/prisma.service';
import { create as createPerson } from './factory/person.factory';
import { Person } from 'src/person/person.types';
import { JwtService } from '@nestjs/jwt';

describe('PersonModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let person: Person;
  let jwtToken: string;
  let jwtService: JwtService;

  const { init, close } = createTestModule();

  beforeAll(async () => {
    const testModule = await init();
    app = testModule.app;
    prisma = testModule.prisma;
    jwtService = app.get(JwtService);

    // Generate test JWT token
    jwtToken = jwtService.sign({
      sub: 'test-user-id',
      username: 'testuser',
    });

    // Reset table to avoid autoincrement conflicts with seeded data
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "Person" RESTART IDENTITY CASCADE',
    );

    person = await createPerson({ name: 'test', age: 1 }, prisma);
  });

  afterAll(async () => {
    await close();
  });

  it('should query all persons with default cursor pagination', async () => {
    const queryData = {
      query: `query GetAllPerson {
        getAll {
          items {
            id
            name
            age
            createdAt
          }
          total
          hasMore
          endCursor
        }
      }
      `,
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.getAll.items.length).toBeGreaterThanOrEqual(1);
    expect(response.body.data.getAll.total).toBeGreaterThanOrEqual(1);
    expect(typeof response.body.data.getAll.hasMore).toBe('boolean');
    expect(response.body.data.getAll.endCursor).toBeDefined();
  });

  it('should query persons with custom first parameter', async () => {
    const queryData = {
      query: `query GetAllPerson($first: Int!) {
        getAll(first: $first) {
          items {
            id
            name
            age
          }
          total
          hasMore
          endCursor
        }
      }
      `,
      variables: { first: 1 },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.getAll.items.length).toBeLessThanOrEqual(1);
    expect(response.body.data.getAll.total).toBeGreaterThanOrEqual(1);
  });

  it('should paginate through results using cursor', async () => {
    // Create extra persons to ensure multiple pages
    await createPerson({ name: 'PageTest1', age: 20 }, prisma);
    await createPerson({ name: 'PageTest2', age: 21 }, prisma);

    // First page
    const firstPageQuery = {
      query: `query GetFirstPage($first: Int!) {
        getAll(first: $first) {
          items { id name }
          hasMore
          endCursor
        }
      }`,
      variables: { first: 1 },
    };

    const firstPageResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send(firstPageQuery)
      .set('Accept', 'application/json')
      .expect(200);

    const firstPage = firstPageResponse.body.data.getAll;
    expect(firstPage.items.length).toBe(1);
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.endCursor).not.toBeNull();

    // Second page using cursor
    const secondPageQuery = {
      query: `query GetSecondPage($first: Int!, $after: String!) {
        getAll(first: $first, after: $after) {
          items { id name }
          hasMore
          endCursor
        }
      }`,
      variables: { first: 1, after: firstPage.endCursor },
    };

    const secondPageResponse = await request(app.getHttpServer())
      .post('/graphql')
      .send(secondPageQuery)
      .set('Accept', 'application/json')
      .expect(200);

    const secondPage = secondPageResponse.body.data.getAll;
    expect(secondPage.items.length).toBe(1);
    // Items on page 2 should differ from page 1
    expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
  });

  it('should query one person by ID with authentication', async () => {
    const queryData = {
      query: `query GetOne($id: Int!) {
        getOne(id: $id) {
          id,
          name,
          age
        }
      }`,
      variables: { id: person.id },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.getOne.id).toBe(person.id);
  });

  it('should return not found for non-existent person', async () => {
    const queryData = {
      query: `query GetOne($id: Int!) {
        getOne(id: $id) {
          id,
          name,
          age
        }
      }`,
      variables: { id: 999999 },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeNull();
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0].message).toContain('Not Found');
  });

  it('should not query one person by ID without authentication', async () => {
    const queryData = {
      query: `query GetOne($id: Int!) {
        getOne(id: $id) {
          id,
          name,
          age
        }
      }`,
      variables: { id: person.id },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(queryData)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeNull();
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0].message).toBe(
      'Unauthorized (401): No authorization token provided',
    );
  });

  it('should add a new person with authentication', async () => {
    const personInput = {
      name: 'JV',
      age: 15,
    };
    const mutationData = {
      query: `mutation CreatePerson($person: CreatePersonInput!) {
        createPerson(person: $person) {
          age
          id
          name
        }
      }`,
      variables: { person: personInput },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(mutationData)
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data.createPerson.name).toBe(personInput.name);
    expect(response.body.data.createPerson.age).toBe(personInput.age);
    expect(response.body.data.createPerson.id).toBeGreaterThanOrEqual(1);
  });

  it('should not add a new person without authentication', async () => {
    const personInput = {
      name: 'JV',
      age: 15,
    };
    const mutationData = {
      query: `mutation CreatePerson($person: CreatePersonInput!) {
        createPerson(person: $person) {
          age
          id
          name
        }
      }`,
      variables: { person: personInput },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(mutationData)
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeNull();
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0].message).toBe(
      'Unauthorized (401): No authorization token provided',
    );
  });

  it('should not add a new person when age lower than 1', async () => {
    const personInput = {
      name: 'JV',
      age: 0,
    };
    const mutationData = {
      query: `mutation CreatePerson($person: CreatePersonInput!) {
        createPerson(person: $person) {
          age
          id
          name
        }
      }`,
      variables: { person: personInput },
    };

    const response = await request(app.getHttpServer())
      .post('/graphql')
      .send(mutationData)
      .set('Accept', 'application/json')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toBeNull();
    expect(response.body.errors.length).toBe(1);
    expect(response.body.errors[0].message).toBe(
      'Bad Request (400): age must not be less than 1',
    );
  });
});
