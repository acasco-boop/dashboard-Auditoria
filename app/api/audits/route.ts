import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getAuditDirectories() {
  const dashboardData = path.join(process.cwd(), 'public', 'data');
  const workspaceRoot = path.resolve(process.cwd(), '..');
  return [dashboardData, workspaceRoot];
}

function getDateFromFileName(name: string) {
  const match = name.match(/\((\d{2})-(\d{2})\)/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = new Date().getFullYear();
  const date = new Date(year, month - 1, day);

  return {
    dateStr: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    date: date.toISOString()
  };
}

export async function GET(request: Request) {
  const requestedFile = new URL(request.url).searchParams.get('file');
  const directories = getAuditDirectories();

  if (requestedFile) {
    const safeName = path.basename(requestedFile);
    if (safeName !== requestedFile || !/\.(xlsx|xls|csv)$/i.test(safeName)) {
      return new NextResponse('Archivo no permitido', { status: 400 });
    }

    for (const directory of directories) {
      try {
        const buffer = await readFile(path.join(directory, safeName));
        return new NextResponse(buffer, {
          headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
        });
      } catch {
        // Buscar en la siguiente carpeta.
      }
    }
    return new NextResponse('Archivo no encontrado', { status: 404 });
  }

  const entries = (await Promise.all(directories.map(directory => readdir(directory, { withFileTypes: true })))).flat();
  const uniqueFiles = Array.from(new Map(
    entries
      .filter(file => file.isFile() && /\.(xlsx|xls|csv)$/i.test(file.name))
      .map(file => [file.name, file.name])
  ).values());
  const audits = uniqueFiles
    .map(name => {
      const parsedDate = getDateFromFileName(name);
      return parsedDate ? { name, url: `/api/audits?file=${encodeURIComponent(name)}`, ...parsedDate } : null;
    })
    .filter((audit): audit is NonNullable<typeof audit> => audit !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return NextResponse.json(audits);
}
