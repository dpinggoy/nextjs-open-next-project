import { GET, POST, PUT, DELETE } from '../route';
import { NextRequest } from 'next/server';

describe('Todos API', () => {
  it('GET returns todos list', async () => {
    const response = await GET();
    const data = await response.json();
    
    expect(Array.isArray(data)).toBe(true);
    expect(response.status).toBe(200);
  });

  it('POST creates a new todo', async () => {
    const mockRequest = {
      json: async () => ({ title: 'Test todo' }),
    } as NextRequest;
    
    const response = await POST(mockRequest);
    const data = await response.json();
    
    expect(data.title).toBe('Test todo');
    expect(data.completed).toBe(false);
    expect(response.status).toBe(201);
  });

  it('PUT updates a todo', async () => {
    const mockRequest = {
      json: async () => ({ id: '1', completed: true }),
    } as NextRequest;
    
    const response = await PUT(mockRequest);
    const data = await response.json();
    
    expect(data.completed).toBe(true);
    expect(response.status).toBe(200);
  });

  it('DELETE removes a todo', async () => {
    const mockRequest = {
      url: 'http://localhost/api/todos?id=1',
    } as NextRequest;
    
    const response = await DELETE(mockRequest);
    const data = await response.json();
    
    expect(data.message).toBe('Todo deleted');
    expect(response.status).toBe(200);
  });
});