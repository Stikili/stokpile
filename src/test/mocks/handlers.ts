/**
 * MSW (Mock Service Worker) request handlers for testing.
 * These intercept API calls during tests and return predictable responses.
 */

// When MSW is installed, uncomment and use:
// import { http, HttpResponse } from 'msw';
//
// const API_URL = 'https://placeholder.supabase.co/functions/v1/make-server-34d0b231';
//
// export const handlers = [
//   http.post(`${API_URL}/login`, () => {
//     return HttpResponse.json({
//       session: {
//         access_token: 'mock-token',
//         user: { email: 'test@example.com' },
//       },
//     });
//   }),
//
//   http.get(`${API_URL}/groups`, () => {
//     return HttpResponse.json({
//       groups: [
//         {
//           id: 'group-1',
//           name: 'Test Group',
//           description: 'A test group',
//           groupCode: 'ABC123',
//           isPublic: false,
//           payoutsAllowed: true,
//           memberCount: 3,
//           userRole: 'admin',
//           createdBy: 'test@example.com',
//         },
//       ],
//     });
//   }),
//
//   http.get(`${API_URL}/groups/:groupId/members`, () => {
//     return HttpResponse.json({
//       members: [
//         {
//           email: 'test@example.com',
//           fullName: 'Test',
//           surname: 'User',
//           role: 'admin',
//           status: 'active',
//           joinedAt: '2024-01-01T00:00:00Z',
//         },
//       ],
//     });
//   }),
//
//   http.get(`${API_URL}/groups/:groupId/contributions`, () => {
//     return HttpResponse.json({
//       contributions: [],
//     });
//   }),
// ];

// Placeholder export until MSW is installed
export const handlers: unknown[] = [];
