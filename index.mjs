import express from 'express';
import { Provider } from 'oidc-provider';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';

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

// Configuration for the OIDC Provider
const configuration = {
  // Required: Secure cookies with keys for signing and encryption
  cookies: {
    keys: [crypto.randomBytes(32).toString('hex'), crypto.randomBytes(32).toString('hex')]
  },
  
  // // Define your clients (applications that can request authentication)
  // clients: [{
  //   client_id: 'example-client',
  //   client_secret: 'example-secret',
  //   redirect_uris: ['http://localhost:3000/callback'],
  //   response_types: ['code'],
  //   grant_types: ['authorization_code', 'refresh_token']
  // }],
  
  // // Configure JWT token settings
  // jwks: {
  //   keys: [
  //     {
  //       kty: 'RSA',
  //       kid: 'default-sig',
  //       use: 'sig',
  //       alg: 'RS256',
  //       d: crypto.randomBytes(32).toString('base64url'),
  //       e: 'AQAB',
  //       n: crypto.randomBytes(32).toString('base64url'),
  //       p: crypto.randomBytes(16).toString('base64url'),
  //       q: crypto.randomBytes(16).toString('base64url'),
  //       dp: crypto.randomBytes(16).toString('base64url'),
  //       dq: crypto.randomBytes(16).toString('base64url'),
  //       qi: crypto.randomBytes(16).toString('base64url')
  //     }
  //   ]
  // },
  
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
    ctx.type = 'html';
    ctx.body = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error Page</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 2rem; }
            .error-container { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 2rem; border-radius: 4px; }
            h1 { color: #e74c3c; }
            .error-details { background: #f8f9fa; padding: 1rem; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="error-container">
            <h1>Authentication Error</h1>
            <p>An error occurred during the authentication process.</p>
            <div class="error-details">
              <p><strong>Error:</strong> ${error}</p>
              <p><strong>Error Description:</strong> ${out.error_description}</p>
            </div>
            <p><a href="/">Return to Home</a></p>
          </div>
        </body>
      </html>
    `;
  },
  
  // // Configure the adapter
  // adapter: function(name) {
  //   return new CustomAdapter(name);
  // }
};

const provider = new Provider(process.env.ISSUER_BASE_URL, configuration);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic interaction routes for login and consent
app.get('/interaction/:uid', (req, res) => {
  res.send(`
    <form method="post" action="/interaction/${req.params.uid}/login">
      <input type="text" name="login" placeholder="Login" />
      <input type="password" name="password" placeholder="Password" />
      <button type="submit">Sign-in</button>
    </form>
  `);
});

app.post('/interaction/:uid/login', (req, res) => {
  // In a real app, you would validate credentials here
  // For now, we'll just approve the login
  provider.interactionFinished(req, res, {
    login: {
      accountId: 'user123'
    }
  }, { mergeWithLastSubmission: false });
});

app.use('/oidc', provider.callback());

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
