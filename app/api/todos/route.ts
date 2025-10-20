import { NextRequest, NextResponse } from "next/server";
import { todo } from "node:test";

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

// In-memory storage (works with Lambda, but resets on cold starts)
// For production, use a database like dynamoDB
let todos: Todo[] = [
    {
        id: '1',
        title: 'Deploy Next.js app with OpenNext on AWS',
        completed: true,
        createdAt: new Date().toISOString()
    },
    {
        id: '2',
        title: 'Build a Todo App',
        completed: false,
        createdAt: new Date().toISOString()
    }
];

export async function GET() {
    return NextResponse.json(todos);
}

export async function POST(request: NextRequest) {
    const body = await request.json();

    const newTodo: Todo = {
        id: Date.now().toString(),
        title: body.title,
        completed: false,
        createdAt: new Date().toISOString()
    };

    todos.push(newTodo);
    
    return NextResponse.json(newTodo, { status: 201 });
}

export async function PUT(request: NextRequest) {
    const body =  await request.json();
    
    const todoIndex = todos.findIndex(t => t.id === body.id);

    if (todoIndex === -1) {
        return NextResponse.json({ message: 'Todo not found' }, { status: 404 });
    }

    todos[todoIndex] = { ...todos[todoIndex], ...body };
    
    return NextResponse.json(todos[todoIndex]);
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
        return NextResponse.json({ message: 'ID is required' }, { status: 400 });
    }

    const todoIndex = todos.findIndex(t => t.id === id);
    
    if (todoIndex === -1) {
        return NextResponse.json({ message: 'Todo not found' }, { status: 404 });
    }

    todos.splice(todoIndex, 1);
    
    return NextResponse.json({ message: 'Todo deleted' });
}