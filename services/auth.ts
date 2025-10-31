import { hashPassword, verifyPassword } from '../utils/security';
import { type User, type LoginCredentials, type RegisterData, type Session, getSession, setSession, clearSession } from '../types/auth';
import { database } from './database';
import { localDb } from './localStorageDb';
import { Capacitor } from '@capacitor/core';

class AuthService {
  private currentUser: User | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create users table if not exists
      await this.createUsersTable();

      // Check for existing session
      const session = getSession();
      if (session) {
        const user = await this.getUserById(session.userId);
        if (user && user.email === session.email) {
          this.currentUser = user;
        } else {
          // Invalid session, clear it
          clearSession();
        }
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing auth:', error);
    }
  }

  private async createUsersTable(): Promise<void> {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      // For localStorage, ensure users array exists
      const data = localDb.getAllData();
      if (!data.users) {
        data.users = [];
        localDb.saveData(data);
      }
      return;
    }

    // For SQLite, users table will be created by database service
    // This method is just a placeholder to ensure init() works
    return;
  }

  async register(data: RegisterData): Promise<User> {
    // Validate
    if (!data.email || !data.password) {
      throw new Error('Email và mật khẩu không được để trống');
    }

    if (data.password !== data.confirmPassword) {
      throw new Error('Mật khẩu xác nhận không khớp');
    }

    if (data.password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự');
    }

    // Check if user already exists
    const existing = await this.getUserByEmail(data.email);
    if (existing) {
      throw new Error('Email này đã được đăng ký');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user: Omit<User, 'id'> = {
      email: data.email,
      passwordHash,
      authProvider: 'local',
      createdAt: new Date().toISOString()
    };

    const userId = await this.addUser(user);
    const newUser = await this.getUserById(userId);
    
    if (!newUser) {
      throw new Error('Lỗi khi tạo tài khoản');
    }

    return newUser;
  }

  async login(credentials: LoginCredentials): Promise<Session> {
    // Validate
    if (!credentials.email || !credentials.password) {
      throw new Error('Vui lòng nhập email và mật khẩu');
    }

    // Get user
    const user = await this.getUserByEmail(credentials.email);
    if (!user) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    // Verify password
    const isValid = await verifyPassword(credentials.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Email hoặc mật khẩu không đúng');
    }

    // Create session
    const token = this.generateToken();
    const session: Session = {
      userId: user.id,
      email: user.email,
      token
    };

    // Save session
    setSession(session);
    this.currentUser = user;

    return session;
  }

  async logout(): Promise<void> {
    clearSession();
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  async checkSession(): Promise<boolean> {
    const session = getSession();
    if (!session) {
      return false;
    }

    try {
      const user = await this.getUserById(session.userId);
      if (user && user.email === session.email) {
        this.currentUser = user;
        return true;
      }
    } catch {
      // Ignore errors
    }

    clearSession();
    return false;
  }

  // Database operations
  private async addUser(user: Omit<User, 'id'>): Promise<number> {
    const platform = Capacitor.getPlatform();
    
    // Ensure authProvider is set
    const userWithProvider = {
      ...user,
      authProvider: user.authProvider || 'local'
    };
    
    if (platform === 'web') {
      try {
        const data = localDb.getAllData();
        if (!data.users) data.users = [];
        
        // Migration: Add authProvider to existing users
        data.users.forEach((u: any) => {
          if (!u.authProvider) {
            u.authProvider = 'local';
          }
        });
        
        const id = data.users.length === 0 
          ? 1 
          : Math.max(...data.users.map((u: User) => u.id)) + 1;
        
        data.users.push({ ...userWithProvider, id });
        localDb.saveData(data);
        return id;
      } catch (error) {
        console.error('Error adding user (localStorage):', error);
        throw error;
      }
    }

    // SQLite
    try {
      const query = 'INSERT INTO users (email, passwordHash, authProvider, createdAt) VALUES (?, ?, ?, ?)';
      const result = await (database as any).db?.run(query, [
        userWithProvider.email,
        userWithProvider.passwordHash,
        userWithProvider.authProvider,
        userWithProvider.createdAt
      ]);
      return result?.changes?.lastId || 0;
    } catch (error) {
      console.error('Error adding user (SQLite):', error);
      throw error;
    }
  }

  private async getUserByEmail(email: string): Promise<User | null> {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      try {
        const data = localDb.getAllData();
        const users = data.users || [];
        const user = users.find((u: User) => u.email === email);
        return user || null;
      } catch {
        return null;
      }
    }

    // SQLite - we'll add a method to database service later
    // For now, return null (users table not yet created in database.ts)
    try {
      const result = await (database as any).db?.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      return result?.values && result.values.length > 0 ? result.values[0] : null;
    } catch (error) {
      // Table might not exist yet
      return null;
    }
  }

  private async getUserById(id: number): Promise<User | null> {
    const platform = Capacitor.getPlatform();
    
    if (platform === 'web') {
      try {
        const data = localDb.getAllData();
        const users = data.users || [];
        const user = users.find((u: User) => u.id === id);
        return user || null;
      } catch {
        return null;
      }
    }

    // SQLite
    try {
      const result = await (database as any).db?.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      return result?.values && result.values.length > 0 ? result.values[0] : null;
    } catch (error) {
      return null;
    }
  }


  private generateToken(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }
}

export const authService = new AuthService();
