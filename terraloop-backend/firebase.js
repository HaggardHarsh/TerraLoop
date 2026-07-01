'use strict';
require('dotenv').config();

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db, storage, auth, messaging;
let isFirebaseReady = false;

function initFirebase() {
  if (isFirebaseReady) return;

  try {
    const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log('✅ Firebase Admin SDK initialised (service account)');
    } else {
      // Development fallback: in-memory store (no real Firebase)
      console.warn('⚠️  firebase-service-account.json not found — running in MOCK mode');
      console.warn('   API will use in-memory storage. Data will not persist across restarts.');
      console.warn('   To connect Firebase: download service account from Firebase Console');
      initMockFirebase();
      return;
    }

    db = admin.firestore();
    storage = admin.storage().bucket();
    auth = admin.auth();
    messaging = admin.messaging();
    isFirebaseReady = true;

  } catch (err) {
    console.error('❌ Firebase init error:', err.message);
    console.warn('   Falling back to MOCK mode');
    initMockFirebase();
  }
}

// ── In-memory mock store for development without Firebase credentials ──
const mockStore = {
  users: {},
  garageItems: {},
  posts: [],
  notifications: {},
  impact: {}
};

function initMockFirebase() {
  isFirebaseReady = false;
  console.log('🟡 Mock Firebase store active');
}

// ── Mock Firestore interface (mirrors Firestore API surface) ──
const mockDb = {
  collection: (col) => ({
    doc: (id) => ({
      get: async () => ({
        exists: !!mockStore[col]?.[id],
        data: () => mockStore[col]?.[id],
        id
      }),
      set: async (data, opts) => {
        if (!mockStore[col]) mockStore[col] = {};
        mockStore[col][id] = opts?.merge ? { ...mockStore[col][id], ...data } : data;
      },
      update: async (data) => {
        if (!mockStore[col]) mockStore[col] = {};
        mockStore[col][id] = { ...mockStore[col][id], ...data };
      },
      delete: async () => { delete mockStore[col]?.[id]; }
    }),
    add: async (data) => {
      const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      if (!mockStore[col]) mockStore[col] = {};
      mockStore[col][id] = { ...data, id };
      return { id };
    },
    where: (field, op, val) => ({
      orderBy: () => ({ get: async () => ({ docs: [] }) }),
      get: async () => {
        const all = Object.values(mockStore[col] || {});
        const filtered = all.filter(doc => {
          if (op === '==') return doc[field] === val;
          if (op === 'array-contains') return Array.isArray(doc[field]) && doc[field].includes(val);
          return true;
        });
        return {
          docs: filtered.map(d => ({ data: () => d, id: d.id || 'mock_id', exists: true }))
        };
      }
    }),
    orderBy: (field, dir) => ({
      limit: (n) => ({
        get: async () => {
          const all = Object.values(mockStore[col] || {});
          return { docs: all.slice(0, n).map(d => ({ data: () => d, id: d.id || 'mock_id' })) };
        }
      }),
      get: async () => {
        const all = Object.values(mockStore[col] || {});
        return { docs: all.map(d => ({ data: () => d, id: d.id || 'mock_id' })) };
      }
    }),
    get: async () => {
      const all = Object.values(mockStore[col] || {});
      return { docs: all.map(d => ({ data: () => d, id: d.id || 'mock_id' })) };
    }
  }),
  FieldValue: {
    serverTimestamp: () => new Date().toISOString(),
    increment: (n) => n,
    arrayUnion: (...items) => items
  }
};

function getDb() {
  return isFirebaseReady ? db : mockDb;
}
function getStorage() { return storage; }
function getAuth() { return isFirebaseReady ? auth : null; }
function getMessaging() { return isFirebaseReady ? messaging : null; }
function getIsFirebaseReady() { return isFirebaseReady; }
function getMockStore() { return mockStore; }

module.exports = {
  initFirebase, getDb, getStorage, getAuth, getMessaging,
  getIsFirebaseReady, getMockStore
};
