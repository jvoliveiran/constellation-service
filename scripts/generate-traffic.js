#!/usr/bin/env node

/**
 * Traffic generator for testing the 4 Golden Signals dashboard
 * This script generates various types of requests to populate metrics
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { request } = require('http');

// Different GraphQL operations to test
const operations = [
  {
    name: 'createPerson',
    query: `
      mutation CreatePerson($input: CreatePersonInput!) {
        createPerson(person: $input) {
          id
          name
          age
        }
      }
    `,
    variables: {
      input: {
        name: `User-${Math.floor(Math.random() * 1000)}`,
        age: Math.floor(Math.random() * 50) + 18,
      },
    },
  },
  {
    name: 'getAllPeople',
    query: `
      query GetAllPeople {
        getAll {
          id
          name
          age
        }
      }
    `,
  },
  {
    name: 'getOnePerson',
    query: `
      query GetOnePerson($id: Int!) {
        getOne(id: $id) {
          id
          name
          age
        }
      }
    `,
    variables: {
      id: Math.floor(Math.random() * 10) + 1,
    },
  },
];

function makeGraphQLRequest(operation) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(operation);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Traffic-Generator/1.0',
      },
    };

    const req = request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function generateTraffic() {
  console.log(
    '🚀 Starting traffic generation for 4 Golden Signals dashboard...',
  );
  console.log(
    '📊 This will generate metrics for Latency, Traffic, Errors, and Saturation',
  );
  console.log('⏱️  Running for 60 seconds...\n');

  const startTime = Date.now();
  const duration = 60 * 1000; // 60 seconds
  let requestCount = 0;
  let errorCount = 0;

  while (Date.now() - startTime < duration) {
    try {
      // Pick a random operation
      const operation =
        operations[Math.floor(Math.random() * operations.length)];

      // Add some randomness to simulate real traffic patterns
      const delay = Math.random() * 2000; // 0-2 second delay

      const result = await makeGraphQLRequest(operation);
      requestCount++;

      if (result.status >= 400) {
        errorCount++;
        console.log(`❌ Error ${result.status} for ${operation.name}`);
      } else {
        console.log(`✅ ${operation.name} - Status: ${result.status}`);
      }

      // Wait before next request
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      errorCount++;
      console.log(`❌ Request failed: ${error.message}`);
    }
  }

  console.log('\n📈 Traffic generation completed!');
  console.log(`📊 Total requests: ${requestCount}`);
  console.log(`❌ Total errors: ${errorCount}`);
  console.log(
    `✅ Success rate: ${(((requestCount - errorCount) / requestCount) * 100).toFixed(2)}%`,
  );
  console.log('\n🎯 Now check your Prometheus dashboard:');
  console.log('   1. Open http://localhost:9090');
  console.log('   2. Use the queries from prometheus-dashboard-queries.md');
  console.log('   3. Set time range to "Last 5 minutes"');
  console.log('   4. You should see metrics for all 4 Golden Signals!');
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Traffic generation stopped by user');
  process.exit(0);
});

// Start traffic generation
generateTraffic().catch(console.error);
