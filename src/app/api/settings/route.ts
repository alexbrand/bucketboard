import { NextResponse } from 'next/server';

export async function GET() {
  const readOnly = process.env.READ_ONLY === 'true';
  
  return NextResponse.json({
    readOnly,
  });
}
