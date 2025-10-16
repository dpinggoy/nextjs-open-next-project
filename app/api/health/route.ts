import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    environment: process.env.NEXT_PUBLIC_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
}