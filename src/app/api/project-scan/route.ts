import { NextResponse } from 'next/server';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { validateProjectRoot } from '@/lib/validatePath';
import { scanProject } from '@/lib/projectScanner';

export async function POST(request: Request): Promise<NextResponse> {
  let body: { projectRoot?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { projectRoot } = body;
  if (!projectRoot || typeof projectRoot !== 'string') {
    return NextResponse.json({ error: 'projectRoot is required' }, { status: 400 });
  }

  const rootError = validateProjectRoot(projectRoot);
  if (rootError) {
    return NextResponse.json({ error: rootError }, { status: 400 });
  }

  const resolved = path.resolve(projectRoot);

  const pkgPath = path.join(resolved, 'package.json');
  if (!existsSync(pkgPath)) {
    return NextResponse.json(
      { error: 'Not a valid project directory — no package.json found' },
      { status: 400 },
    );
  }

  const result = scanProject(resolved);
  return NextResponse.json(result);
}
