import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Credentials } from '../types/credentials';
import { substituteEnvVars } from '../utils/env-substitution';

export interface CredentialStore {
  version: string;
  credentials: Record<string, Credentials>;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_CREDENTIALS_PATH =
  process.env.CREDENTIALS_FILE_PATH || path.join(process.cwd(), 'data', 'credentials.yaml');

class CredentialManager {
  private credentialsPath: string;

  constructor(credentialsPath?: string) {
    this.credentialsPath = credentialsPath || DEFAULT_CREDENTIALS_PATH;
    this.ensureCredentialsFile();
  }

  private ensureCredentialsFile(): void {
    try {
      // Check if file exists
      if (!fs.existsSync(this.credentialsPath)) {
        // Create directory if it doesn't exist
        const dir = path.dirname(this.credentialsPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Create initial credentials file
        const initialStore: CredentialStore = {
          version: '1.0',
          credentials: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        fs.writeFileSync(this.credentialsPath, yaml.dump(initialStore), 'utf-8');
      }
    } catch (error) {
      console.error('Error ensuring credentials file:', error);
      throw new Error('Failed to initialize credentials file');
    }
  }

  private readStore(): CredentialStore {
    try {
      const data = fs.readFileSync(this.credentialsPath, 'utf-8');
      // Substitute environment variables in the YAML content
      const processedData = substituteEnvVars(data);
      return yaml.load(processedData) as CredentialStore;
    } catch (error) {
      console.error('Error reading credentials file:', error);
      throw new Error('Failed to read credentials file');
    }
  }

  private writeStore(store: CredentialStore): void {
    try {
      store.updatedAt = new Date().toISOString();
      fs.writeFileSync(this.credentialsPath, yaml.dump(store), 'utf-8');
    } catch (error) {
      console.error('Error writing credentials file:', error);
      throw new Error('Failed to write credentials file');
    }
  }

  public listCredentials(): Credentials[] {
    const store = this.readStore();
    return Object.values(store.credentials);
  }

  public getCredential(id: string): Credentials | null {
    const store = this.readStore();
    return store.credentials[id] || null;
  }

  public createCredential(credential: Credentials): Credentials {
    const store = this.readStore();

    if (store.credentials[credential.id]) {
      throw new Error(`Credential with id ${credential.id} already exists`);
    }

    store.credentials[credential.id] = credential;
    this.writeStore(store);

    return credential;
  }

  public updateCredential(id: string, updates: Partial<Credentials>): Credentials {
    const store = this.readStore();

    if (!store.credentials[id]) {
      throw new Error(`Credential with id ${id} not found`);
    }

    const updated = {
      ...store.credentials[id],
      ...updates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString(),
    } as Credentials;

    store.credentials[id] = updated;
    this.writeStore(store);

    return updated;
  }

  public deleteCredential(id: string): void {
    const store = this.readStore();

    if (!store.credentials[id]) {
      throw new Error(`Credential with id ${id} not found`);
    }

    delete store.credentials[id];
    this.writeStore(store);
  }
}

// Export singleton instance
export const credentialManager = new CredentialManager();
