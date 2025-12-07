import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Connection } from '../types/connections';
import { substituteEnvVars } from '../utils/env-substitution';

export interface ConnectionStore {
  version: string;
  connections: Record<string, Connection>;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_CONNECTIONS_PATH =
  process.env.CONNECTIONS_FILE_PATH || path.join(process.cwd(), 'data', 'connections.yaml');

class ConnectionManager {
  private connectionsPath: string;

  constructor(connectionsPath?: string) {
    this.connectionsPath = connectionsPath || DEFAULT_CONNECTIONS_PATH;
    this.ensureConnectionsFile();
  }

  private ensureConnectionsFile(): void {
    try {
      // Check if file exists
      if (!fs.existsSync(this.connectionsPath)) {
        // Create directory if it doesn't exist
        const dir = path.dirname(this.connectionsPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Create initial connections file
        const initialStore: ConnectionStore = {
          version: '1.0',
          connections: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        fs.writeFileSync(this.connectionsPath, yaml.dump(initialStore), 'utf-8');
      }
    } catch (error) {
      console.error('Error ensuring connections file:', error);
      throw new Error('Failed to initialize connections file');
    }
  }

  private readStore(): ConnectionStore {
    try {
      const data = fs.readFileSync(this.connectionsPath, 'utf-8');
      // Substitute environment variables in the YAML content
      const processedData = substituteEnvVars(data);
      return yaml.load(processedData) as ConnectionStore;
    } catch (error) {
      console.error('Error reading connections file:', error);
      throw new Error('Failed to read connections file');
    }
  }

  private writeStore(store: ConnectionStore): void {
    try {
      store.updatedAt = new Date().toISOString();
      fs.writeFileSync(this.connectionsPath, yaml.dump(store), 'utf-8');
    } catch (error) {
      console.error('Error writing connections file:', error);
      throw new Error('Failed to write connections file');
    }
  }

  public listConnections(): Connection[] {
    const store = this.readStore();
    return Object.values(store.connections);
  }

  public getConnection(id: string): Connection | null {
    const store = this.readStore();
    return store.connections[id] || null;
  }

  public createConnection(connection: Connection): Connection {
    const store = this.readStore();

    if (store.connections[connection.id]) {
      throw new Error(`Connection with id ${connection.id} already exists`);
    }

    store.connections[connection.id] = connection;
    this.writeStore(store);

    return connection;
  }

  public updateConnection(id: string, updates: Partial<Connection>): Connection {
    const store = this.readStore();

    if (!store.connections[id]) {
      throw new Error(`Connection with id ${id} not found`);
    }

    const updated = {
      ...store.connections[id],
      ...updates,
      id, // Ensure ID cannot be changed
      updatedAt: new Date().toISOString(),
    } as Connection;

    store.connections[id] = updated;
    this.writeStore(store);

    return updated;
  }

  public deleteConnection(id: string): void {
    const store = this.readStore();

    if (!store.connections[id]) {
      throw new Error(`Connection with id ${id} not found`);
    }

    delete store.connections[id];
    this.writeStore(store);
  }
}

// Export singleton instance
export const connectionManager = new ConnectionManager();
