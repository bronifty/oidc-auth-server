import express from "express";
import { Provider } from "oidc-provider";
import dotenv from "dotenv";
import crypto from "crypto";
import CustomMemoryAdapter from "./utils/custom-memory-adapter.js";
import { generateKeyPair, exportJWK } from "jose";

dotenv.config();
const app = express();

// Function to generate JWKS
async function generateJWKS() {
  const { privateKey } = await generateKeyPair("RS256", {
    extractable: true,
    use: "sig",
    key_ops: ["sign", "verify"],
  });
  const jwk = await exportJWK(privateKey);

  // Add key identifiers
  jwk.kid = "sig-key-1";
  jwk.use = "sig";

  return { keys: [jwk] };
}

// Parse JWKS from environment variable or generate new ones
async function getJWKS() {
  if (process.env.JWKS) {
    try {
      // Decode base64 JWKS from environment variable
      const jwksString = Buffer.from(process.env.JWKS, "base64").toString();
      const jwk = JSON.parse(jwksString);

      // Ensure the JWK has the required properties
      if (!jwk.kid) jwk.kid = "sig-key-1";
      if (!jwk.use) jwk.use = "sig";

      return { keys: [jwk] };
    } catch (error) {
      console.warn(
        "Failed to parse JWKS from environment variable:",
        error.message
      );
      console.warn("Falling back to generating new JWKS");
      return generateJWKS();
    }
  }

  // If no JWKS in environment variable, generate new ones
  return generateJWKS();
}

// Initialize the OIDC provider
async function initializeProvider() {
  // Get JWKS from environment or generate new ones
  const jwks = await getJWKS();

  // Configuration for the OIDC Provider
  const configuration = {
    // Required: Secure cookies with keys for signing and encryption
    cookies: {
      keys: [process.env.COOKIE_KEY || crypto.randomBytes(32).toString("hex")],
    },

    // PKCE configuration
    pkce: {
      required: () => false,
    },

    // JWT signing keys
    jwks,

    // Custom error handling
    renderError: async (ctx, out, error) => {
      ctx.type = "json";
      ctx.body = JSON.stringify(error);
    },

    adapter: CustomMemoryAdapter,
  };

  // Create the provider
  const provider = new Provider(process.env.ISSUER_BASE_URL, configuration);

  // Set up routes
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use("/oidc", provider.callback());

  app.get("/", (req, res) => {
    res.send("Hello World");
  });

  // Start the server
  app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  });
}

// Start the server
initializeProvider().catch((err) => {
  console.error("Failed to initialize provider:", err);
  process.exit(1);
});
