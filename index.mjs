import express from 'express';
import { Provider } from 'oidc-provider';
import dotenv from 'dotenv';
import crypto from 'crypto';
import CustomMemoryAdapter from './utils/custom-memory-adapter.js';
import { generateKeyPair, exportJWK } from 'jose';

dotenv.config();

const app = express();

// // Custom in-memory adapter using LRU Cache
// class CustomAdapter {
//   constructor(model) {
//     this.model = model;
//     this.cache = new LRUCache({
//       max: 1000,
//       ttl: 1000 * 60 * 60 // 1 hour
//     });
//   }

//   async upsert(id, payload, expiresIn) {
//     const key = `${this.model}:${id}`;
    
//     const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;
    
//     this.cache.set(key, {
//       payload,
//       ...(expiresAt ? { expiresAt } : undefined),
//     });
    
//     return undefined;
//   }

//   async find(id) {
//     const key = `${this.model}:${id}`;
//     const data = this.cache.get(key);
    
//     if (!data) return undefined;
//     if (data.expiresAt && data.expiresAt < new Date()) {
//       this.cache.delete(key);
//       return undefined;
//     }
    
//     return data.payload;
//   }

//   async findByUserCode(userCode) {
//     const values = [...this.cache.values()];
//     const found = values.find((val) => val.payload.userCode === userCode);
//     if (!found) return undefined;
//     return found.payload;
//   }

//   async findByUid(uid) {
//     const values = [...this.cache.values()];
//     const found = values.find((val) => val.payload.uid === uid);
//     if (!found) return undefined;
//     return found.payload;
//   }

//   async destroy(id) {
//     const key = `${this.model}:${id}`;
//     this.cache.delete(key);
//     return undefined;
//   }

//   async revokeByGrantId(grantId) {
//     const values = [...this.cache.entries()];
//     values.forEach(([key, val]) => {
//       if (val.payload.grantId === grantId) {
//         this.cache.delete(key);
//       }
//     });
//   }

//   async consume(id) {
//     const key = `${this.model}:${id}`;
//     const data = this.cache.get(key);
//     if (data) {
//       data.payload.consumed = Math.floor(Date.now() / 1000);
//       this.cache.set(key, data);
//     }
//     return undefined;
//   }
// }

// Function to generate JWKS
async function generateJWKS() {
  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  const jwk = await exportJWK(privateKey);
  
  // Add key identifiers
  jwk.kid = 'sig-key-1';
  jwk.use = 'sig';
  console.log(jwk);
  
  return { keys: [jwk] };
}

// Initialize the OIDC provider
async function initializeProvider() {
  // Generate the JWKS
  const jwks = await generateJWKS();
  
  // Configuration for the OIDC Provider
  const configuration = {
    // Required: Secure cookies with keys for signing and encryption
    cookies: {
      keys: [process.env.COOKIE_KEY || crypto.randomBytes(32).toString('hex')]
    },
    
    // PKCE configuration
    pkce: {
      required: () => false
    },
    
    // // Define your clients (applications that can request authentication)
    // clients: [{
    //   client_id: 'example-client',
    //   client_secret: 'example-secret',
    //   redirect_uris: ['http://localhost:3000/callback'],
    //   response_types: ['code'],
    //   grant_types: ['authorization_code', 'refresh_token']
    // }],
    
    // JWT signing keys
    jwks,
    
    // // Disable development interactions
    // features: {
    //   devInteractions: { enabled: false }
    // },
    
    // // Configure custom login and consent pages
    // interactions: {
    //   url(ctx, interaction) {
    //     return `/interaction/${interaction.uid}`;
    //   }
    // },
    
    // Custom error handling
    renderError: async (ctx, out, error) => {
      ctx.type = 'json';
      ctx.body = JSON.stringify(error);
    },
    
    // // Configure the adapter
    // adapter: function(name) {
    //   return new CustomAdapter(name);
    // }
    adapter: CustomMemoryAdapter,
  };

  // Create the provider
  const provider = new Provider(process.env.ISSUER_BASE_URL, configuration);
  
  // Set up routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/oidc', provider.callback());
  
  app.get('/', (req, res) => {
    res.send('Hello World');
  });
  
  // Start the server
  app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  });
}

// Start the server
initializeProvider().catch(err => {
  console.error('Failed to initialize provider:', err);
  process.exit(1);
});
