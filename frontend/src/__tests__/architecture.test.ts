import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_DIR = path.resolve(__dirname, '..');
const DOMAIN_DIR = path.join(SRC_DIR, 'domain');

const FORBIDDEN_IMPORTS = [
  'react',
  'react-dom',
  'idb',
  'lucide-react',
  'application',
  'infrastructure',
  'presentation',
];

function collectTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTsFiles(full));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

describe('Frontend Hexagonal Architecture Boundaries', () => {
  it('domain/ never imports outer layers or UI/storage frameworks', () => {
    const domainFiles = collectTsFiles(DOMAIN_DIR);
    expect(domainFiles.length).toBeGreaterThan(0);

    const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g;
    for (const file of domainFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      let match: RegExpExecArray | null;
      while ((match = importRegex.exec(content)) !== null) {
        const target = match[1];
        for (const forbidden of FORBIDDEN_IMPORTS) {
          expect(
            target.includes(forbidden),
            `${path.basename(file)} must not import ${target}`,
          ).toBe(false);
        }
      }
    }
  });
});
